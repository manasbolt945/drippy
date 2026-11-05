// score-fit: rate an outfit photo with Claude and save the result.
// The photo is sent to Claude for the rating. It is stored only while SAVE_PHOTOS is on (see savePhoto()).
// Every step logs one JSON line (see log()), visible under Edge Functions → score-fit → Logs.
//
// POST { image_base64: string (JPEG), occasion_hint?: OccasionId }
// Authorization: Bearer <user JWT>   (anonymous users are fine)
// -> 200 the inserted `scans` row
// -> 400 bad input · 401 no user · 429 daily limit reached · 502/503 AI failure

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { OCCASION_IDS, type OccasionId, SYSTEM_PROMPT, userPrompt } from "./prompt.ts";
import { FIT_RATING_JSON_SCHEMA, parseFitRating } from "./schema.ts";

const MODEL = "claude-haiku-5-5";
const FREE_DAILY_SCANS = Number(Deno.env.get("FREE_DAILY_SCANS") ?? "10");
// Photos we can't rate don't use up free scans, but every attempt still costs an AI call, so cap those too.
const MAX_DAILY_ATTEMPTS = Number(Deno.env.get("MAX_DAILY_ATTEMPTS") ?? "30");
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
// Flag: keep a copy of each scored photo in the private `scans` bucket (<user_id>/<scan_id>.jpg).
// Turn on/off without a redeploy: `supabase secrets set SAVE_PHOTOS=true` (or false).
const SAVE_PHOTOS = (Deno.env.get("SAVE_PHOTOS") ?? "").toLowerCase() === "true";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// The SDK retries 429/5xx with backoff; Haiku 5.5 has no server-side fallback, so this is our only retry.
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY"), maxRetries: 3 });

// The web app calls this from the browser, so every response needs CORS headers.
// ALLOWED_ORIGINS is a comma-separated list (e.g. the Vercel site and localhost); unset allows any origin.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = ALLOWED_ORIGINS.length === 0 ? "*" : origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const res = await handle(req);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  const scanId = crypto.randomUUID();
  const started = Date.now();
  const done = (res: Response, fields: Record<string, unknown> = {}) => {
    log(res.status >= 500 ? "error" : "info", "request.done", { scan_id: scanId, http: res.status, total_ms: Date.now() - started, ...fields });
    return res;
  };
  if (req.method !== "POST") return done(json({ error: "method_not_allowed" }, 405));

  // --- Who is calling? -------------------------------------------------------
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return done(json({ error: "unauthorized" }, 401), { reason: "no_user" });

  // --- Validate input --------------------------------------------------------
  let body: { image_base64?: unknown; occasion_hint?: unknown };
  try {
    body = await req.json();
  } catch {
    return done(json({ error: "invalid_json" }, 400), { user_id: user.id, reason: "invalid_json" });
  }
  if (typeof body.image_base64 !== "string") {
    return done(json({ error: "image_required" }, 400), { user_id: user.id, reason: "image_required" });
  }
  const imageBase64 = body.image_base64;
  let imageBytes: Uint8Array;
  try {
    imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  } catch {
    return done(json({ error: "invalid_image" }, 400), { user_id: user.id, reason: "not_base64" });
  }
  const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
  if (!isJpeg || imageBytes.length > MAX_IMAGE_BYTES) {
    return done(json({ error: "invalid_image" }, 400), { user_id: user.id, reason: isJpeg ? "too_large" : "not_jpeg", image_bytes: imageBytes.length });
  }

  const occasionHint = OCCASION_IDS.includes(body.occasion_hint as OccasionId)
    ? (body.occasion_hint as OccasionId)
    : null;
  log("info", "request.received", { scan_id: scanId, user_id: user.id, image_bytes: imageBytes.length, occasion_hint: occasionHint });

  // --- Daily limit -----------------------------------------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: countError } = await admin
    .from("scans")
    .select("status")
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) {
    log("error", "limit.check_failed", { scan_id: scanId, error: countError.message });
    return done(json({ error: "internal" }, 500));
  }
  const scored = (recent ?? []).filter((r) => r.status === "scored").length;
  const attempts = (recent ?? []).length;
  if (scored >= FREE_DAILY_SCANS || attempts >= MAX_DAILY_ATTEMPTS) {
    return done(json({ error: "daily_limit_reached", limit: FREE_DAILY_SCANS }, 429), { user_id: user.id, reason: "daily_limit", scored_today: scored, attempts_today: attempts });
  }

  // --- Ask Claude ------------------------------------------------------------
  const aiStarted = Date.now();
  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: FIT_RATING_JSON_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: userPrompt(occasionHint) },
        ],
      }],
    });
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? error.status : undefined;
    log("error", "ai.error", { scan_id: scanId, ai_ms: Date.now() - aiStarted, status, message: error instanceof Error ? error.message : String(error) });
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      return done(json({ error: "ai_busy" }, 503));
    }
    if (error instanceof Anthropic.APIError) return done(json({ error: "ai_failed" }, 502));
    throw error;
  }
  const usage = {
    duration_ms: Date.now() - aiStarted,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    image_bytes: imageBytes.length,
  };
  log("info", "ai.response", { scan_id: scanId, model: response.model, stop_reason: response.stop_reason, ...usage });

  // Only the rating is saved here; the photo is saved further down, for scored fits, when SAVE_PHOTOS is on.
  const baseRow = { id: scanId, user_id: user.id, occasion_hint: occasionHint, model: response.model, image_path: null as string | null, ...usage };

  if (response.stop_reason === "refusal") {
    log("warn", "scan.refused", { scan_id: scanId, category: response.stop_details?.category });
    return done(await insertScan({
      ...baseRow,
      status: "refused",
      message: "We couldn't rate this photo. Try a different one showing your outfit.",
    }), { result: "refused" });
  }

  const text = response.content.find((b) => b.type === "text");
  let rating;
  try {
    if (!text || text.type !== "text" || response.stop_reason !== "end_turn") {
      throw new Error(`no complete text output (stop_reason=${response.stop_reason})`);
    }
    rating = parseFitRating(text.text);
  } catch (error) {
    log("error", "ai.bad_output", { scan_id: scanId, message: error instanceof Error ? error.message : String(error) });
    return done(json({ error: "ai_failed" }, 502));
  }

  if (rating.status === "not_scorable") {
    log("info", "scan.not_scorable", { scan_id: scanId, message: rating.message });
    return done(await insertScan({ ...baseRow, status: "not_scorable", message: rating.message }), { result: "not_scorable" });
  }

  const best = rating.occasions[0];
  log("info", "scan.scored", { scan_id: scanId, overall: rating.overall, best_occasion: best?.occasion, best_score: best?.score, headline: rating.headline });
  // Only scored fits: refused and not-scorable photos (which can include explicit images or minors) are never kept.
  const imagePath = SAVE_PHOTOS ? await savePhoto(scanId, user.id, imageBytes) : null;
  return done(await insertScan({
    ...baseRow,
    image_path: imagePath,
    status: "scored",
    overall: rating.overall,
    headline: rating.headline,
    breakdown: rating.breakdown,
    occasions: rating.occasions,
    tips: rating.tips.slice(0, 3),
  }), { result: "scored", overall: rating.overall, photo_saved: !!imagePath });
}

/** Stores the photo in the private bucket. A failed upload is logged but never fails the scan. */
async function savePhoto(scanId: string, userId: string, bytes: Uint8Array): Promise<string | null> {
  const path = `${userId}/${scanId}.jpg`;
  const { error } = await admin.storage.from("scans").upload(path, bytes, { contentType: "image/jpeg" });
  if (error) {
    log("error", "photo.save_failed", { scan_id: scanId, error: error.message });
    return null;
  }
  log("info", "photo.saved", { scan_id: scanId, path, image_bytes: bytes.length });
  return path;
}

async function insertScan(row: Record<string, unknown>): Promise<Response> {
  const { data, error } = await admin.from("scans").insert(row).select().single();
  if (error) {
    log("error", "scan.insert_failed", { scan_id: row.id, error: error.message });
    return json({ error: "internal" }, 500);
  }
  return json(data);
}

/** One JSON line per event, so the Supabase log explorer can search by field. Never includes the image. */
function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
