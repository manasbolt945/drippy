// welcome-email: send "Welcome to Drippy" once, when someone becomes a real account
// (Google sign-in, or email confirmed with the 6-digit code). Called by the app; safe to call repeatedly.
//
// POST {}   Authorization: Bearer <user JWT>
// -> 200 { sent: true } | { sent: false, reason: "guest" | "unverified" | "already" }
// Needs the RESEND_API_KEY secret. Remembers who was welcomed in app_metadata.welcomed (only the server can set it).

import { createClient } from "@supabase/supabase-js";
import { WELCOME_HTML } from "./template.ts";

const FROM = Deno.env.get("WELCOME_FROM") ?? "Drippy <hello@drippy-ai.org>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
function cors(origin: string | null): Record<string, string> {
  const allow = ALLOWED_ORIGINS.length === 0 ? "*" : origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function log(level: "info" | "error", event: string, fields: Record<string, unknown> = {}) {
  console[level === "error" ? "error" : "log"](JSON.stringify({ level, event, ...fields }));
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function firstName(meta: Record<string, unknown>): string {
  const pick = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string).trim() : "");
  const name = pick("first_name") || pick("given_name") || (pick("full_name") || pick("name")).split(/\s+/)[0] || "";
  return name.slice(0, 40);
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return reply(401, { error: "unauthorized" });
  if (user.is_anonymous || !user.email) return reply(200, { sent: false, reason: "guest" });
  if (!user.email_confirmed_at) return reply(200, { sent: false, reason: "unverified" });
  if (user.app_metadata?.welcomed) return reply(200, { sent: false, reason: "already" });
  if (!RESEND_API_KEY) {
    log("error", "welcome.no_api_key", { user_id: user.id });
    return reply(503, { error: "not_configured" });
  }

  // Mark first so two quick calls can't send twice; undo if the send fails.
  await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, welcomed: true } });

  const name = firstName(user.user_metadata ?? {});
  const html = WELCOME_HTML.replace("{{FIRST_NAME}}", name ? `, ${escapeHtml(name)}` : "");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [user.email], subject: "Welcome to Drippy", html }),
  });
  if (!res.ok) {
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, welcomed: false } });
    log("error", "welcome.send_failed", { user_id: user.id, status: res.status, body: (await res.text()).slice(0, 300) });
    return reply(502, { error: "send_failed" });
  }
  log("info", "welcome.sent", { user_id: user.id, provider: user.app_metadata?.provider ?? null });
  return reply(200, { sent: true });
});
