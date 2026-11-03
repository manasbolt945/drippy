// score-fit: rate an outfit photo with Claude and save the result.
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
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // --- Who is calling? -------------------------------------------------------
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: "unauthorized" }, 401);

  // --- Validate input --------------------------------------------------------
  let body: { image_base64?: unknown; occasion_hint?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (typeof body.image_base64 !== "string") return json({ error: "image_required" }, 400);
  const imageBase64 = body.image_base64;
  let imageBytes: Uint8Array;
  try {
    imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  } catch {
    return json({ error: "invalid_image" }, 400);
  }
  const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
  if (!isJpeg || imageBytes.length > MAX_IMAGE_BYTES) return json({ error: "invalid_image" }, 400);

  const occasionHint = OCCASION_IDS.includes(body.occasion_hint as OccasionId)
    ? (body.occasion_hint as OccasionId)
    : null;

  // --- Daily limit -----------------------------------------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: countError } = await admin
    .from("scans")
    .select("status")
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) return json({ error: "internal" }, 500);
  const scored = (recent ?? []).filter((r) => r.status === "scored").length;
  if (scored >= FREE_DAILY_SCANS || (recent ?? []).length >= MAX_DAILY_ATTEMPTS) {
    return json({ error: "daily_limit_reached", limit: FREE_DAILY_SCANS }, 429);
  }

  // --- Ask Claude ------------------------------------------------------------
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
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      console.error("anthropic unavailable", error.status, error.message);
      return json({ error: "ai_busy" }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("anthropic error", error.status, error.message);
      return json({ error: "ai_failed" }, 502);
    }
    throw error;
  }

  const scanId = crypto.randomUUID();
  const baseRow = { id: scanId, user_id: user.id, occasion_hint: occasionHint, model: response.model };

  if (response.stop_reason === "refusal") {
    console.warn("refusal", response.stop_details?.category);
    return await insertScan({
      ...baseRow,
      status: "refused",
      message: "We couldn't rate this photo. Try a different one showing your outfit.",
    });
  }

  const text = response.content.find((b) => b.type === "text");
  let rating;
  try {
    if (!text || text.type !== "text" || response.stop_reason !== "end_turn") {
      throw new Error(`no complete text output (stop_reason=${response.stop_reason})`);
    }
    rating = parseFitRating(text.text);
  } catch (error) {
    console.error("bad rating output", error);
    return json({ error: "ai_failed" }, 502);
  }

  if (rating.status === "not_scorable") {
    // Photo is not stored: it may be off-topic, explicit, or of a minor.
    return await insertScan({ ...baseRow, status: "not_scorable", message: rating.message });
  }

  // --- Store photo + result --------------------------------------------------
  const imagePath = `${user.id}/${scanId}.jpg`;
  const { error: uploadError } = await admin.storage
    .from("scans")
    .upload(imagePath, imageBytes, { contentType: "image/jpeg" });
  if (uploadError) {
    console.error("upload failed", uploadError);
    return json({ error: "internal" }, 500);
  }

  return await insertScan({
    ...baseRow,
    status: "scored",
    image_path: imagePath,
    overall: rating.overall,
    headline: rating.headline,
    breakdown: rating.breakdown,
    occasions: rating.occasions,
    tips: rating.tips.slice(0, 3),
  });
}

async function insertScan(row: Record<string, unknown>): Promise<Response> {
  const { data, error } = await admin.from("scans").insert(row).select().single();
  if (error) {
    console.error("insert failed", error);
    return json({ error: "internal" }, 500);
  }
  return json(data);
}
