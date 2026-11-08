import posthog from "posthog-js";

/**
 * Product analytics (PostHog): daily users, retention and the open → photo → score → share funnel.
 * On in production builds; local dev, localhost and demo mode send nothing unless NEXT_PUBLIC_POSTHOG_KEY is set.
 * Never send photos, scan text or anything personal: only counts, scores and occasion ids.
 */
// Drippy's PostHog project (id 720058, US cloud). A project key is public by design: browsers send it with every event.
const DRIPPY_KEY = "phc_BBY3vYN69CRFndmxp3ie6NaHFipraz9JbHLritLrCDJm";
const DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// An env var wins; otherwise only real production builds report, so local dev and demo mode stay quiet.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || (process.env.NODE_ENV === "production" && !DEMO ? DRIPPY_KEY : undefined);
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let started = false;

export function initAnalytics(): void {
  if (!KEY || started || typeof window === "undefined") return;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      defaults: "2026-08-30",
      persistence: "localStorage", // no cookies
      person_profiles: "identified_only",
      disable_session_recording: true, // screens show people's photos: never record them
      autocapture: false, // only the events below
    });
    started = true;
  } catch {
    // Analytics must never break the app.
  }
}

export type AnalyticsEvent =
  | "welcome_started"
  | "photo_added"
  | "scan_requested"
  | "scan_scored"
  | "scan_not_scorable"
  | "scan_failed"
  | "share_opened"
  | "share_completed"
  | "history_opened";

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>): void {
  if (!started) return;
  try {
    posthog.capture(event, props);
  } catch {
    // ignore
  }
}

/** Ties this browser to its Supabase user id, so PostHog users match rows in `scans`. */
export function identify(userId: string): void {
  if (!started) return;
  try {
    if (posthog.get_distinct_id() !== userId) posthog.identify(userId);
  } catch {
    // ignore
  }
}
