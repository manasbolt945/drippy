import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { identify } from "./analytics";
import { blobToBase64, thumbnailDataUrl } from "./image";
import type { OccasionId } from "./occasions";
import { sampleScan } from "./sample";
import type { Scan, ScanWithPhoto } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Without Supabase settings the app runs on sample results so every screen can be tried. */
export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export type ScoreErrorKind = "limit" | "busy" | "failed" | "network";

export class ScoreError extends Error {
  constructor(public kind: ScoreErrorKind, message: string) {
    super(message);
  }
}

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return client;
}

/** Every visitor gets an anonymous account on first use, so their scans stay theirs. */
async function ensureSession(): Promise<void> {
  const { data } = await supabase().auth.getSession();
  if (data.session) {
    identify(data.session.user.id);
    return;
  }
  const { data: signedIn, error } = await supabase().auth.signInAnonymously();
  if (error) throw new ScoreError("network", "We couldn't connect. Check your internet and try again.");
  if (signedIn.user) identify(signedIn.user.id);
}

export async function scoreFit(photo: Blob, occasionHint: OccasionId | null): Promise<Scan> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 4200));
    const scan = sampleScan(occasionHint);
    await saveDemoScan(scan, photo);
    return scan;
  }

  await ensureSession();
  const image_base64 = await blobToBase64(photo);
  const { data, error } = await supabase().functions.invoke<Scan>("score-fit", {
    body: { image_base64, occasion_hint: occasionHint },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = (error.context as Response).status;
      if (status === 429) {
        throw new ScoreError("limit", "You've used today's free checks. Come back tomorrow for more.");
      }
      if (status === 503) throw new ScoreError("busy", "Our stylist is busy right now. Try again in a minute.");
      throw new ScoreError("failed", "Something went wrong rating this photo. Please try again.");
    }
    throw new ScoreError("network", "We couldn't connect. Check your internet and try again.");
  }
  // The server never keeps the photo, so History's thumbnail lives on this phone only.
  if (data?.status === "scored") await saveThumbnail(data.id, photo);
  return data!;
}

export async function listScans(): Promise<ScanWithPhoto[]> {
  if (DEMO_MODE) return readDemoScans();

  await ensureSession();
  const { data, error } = await supabase()
    .from("scans")
    .select("*")
    .eq("status", "scored")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new ScoreError("network", "We couldn't load your fits.");
  const thumbs = readThumbnails();
  return ((data ?? []) as Scan[]).map((scan) => ({ scan, photoUrl: thumbs[scan.id] ?? null }));
}

// --- Thumbnails of your own fits, kept in this browser only ------------------------

const THUMBS_KEY = "drippy.thumbs";
const MAX_THUMBS = 24;

function readThumbnails(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(THUMBS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveThumbnail(scanId: string, photo: Blob): Promise<void> {
  try {
    const entries = Object.entries(readThumbnails()).slice(-(MAX_THUMBS - 1));
    entries.push([scanId, await thumbnailDataUrl(photo)]);
    localStorage.setItem(THUMBS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage full or blocked: this fit just shows without a thumbnail.
  }
}

// --- Demo-mode history, kept in this browser only --------------------------------

const DEMO_KEY = "drippy.demoScans";

function readDemoScans(): ScanWithPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as ScanWithPhoto[];
  } catch {
    return [];
  }
}

async function saveDemoScan(scan: Scan, photo: Blob): Promise<void> {
  try {
    const entry: ScanWithPhoto = { scan, photoUrl: await thumbnailDataUrl(photo) };
    localStorage.setItem(DEMO_KEY, JSON.stringify([entry, ...readDemoScans()].slice(0, 20)));
  } catch {
    // Storage full or blocked: history just won't include this scan.
  }
}

// --- Accounts ----------------------------------------------------------------------
// Everyone starts as an anonymous guest. Signing up turns that same guest into a real account
// (same user id), so every fit they rated as a guest stays theirs.

export type Provider = "google" | "apple" | "facebook";
export interface Account {
  id: string;
  email: string | null;
  guest: boolean;
}

/** Social logins shown in the app; each one must also be turned on in Supabase (Auth → Providers). */
export const PROVIDERS: Provider[] = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter((p): p is Provider => p === "google" || p === "apple" || p === "facebook");

export class AuthFailure extends Error {}

const PENDING_KEY = "drippy.pendingSignup";
const DEMO_ACCOUNT_KEY = "drippy.demoAccount";

function toAccount(user: { id: string; email?: string | null; is_anonymous?: boolean } | null | undefined): Account | null {
  if (!user) return null;
  return { id: user.id, email: user.email || null, guest: !!user.is_anonymous };
}

function readDemoAccount(): Account | null {
  try {
    const email = localStorage.getItem(DEMO_ACCOUNT_KEY);
    return email ? { id: "demo", email, guest: false } : null;
  } catch {
    return null;
  }
}

export async function currentAccount(): Promise<Account | null> {
  if (DEMO_MODE) return readDemoAccount() ?? { id: "demo", email: null, guest: true };
  const { data } = await supabase().auth.getSession();
  return toAccount(data.session?.user);
}

/** Calls back on sign-in, sign-out and returning from an email link. `recovery` = came back from "Forgot password". */
export function onAccountChange(cb: (account: Account | null, recovery: boolean) => void): () => void {
  if (DEMO_MODE) return () => {};
  const { data } = supabase().auth.onAuthStateChange((event, session) => {
    // Supabase runs this inside its own lock: defer so our follow-up calls don't wait on it.
    setTimeout(() => cb(toAccount(session?.user), event === "PASSWORD_RECOVERY"), 0);
  });
  return () => data.subscription.unsubscribe();
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) return "That email already has an account. Log in instead.";
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) return "Use a longer password: 8 characters or more.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
  if (m.includes("email") && m.includes("invalid")) return "That email doesn't look right.";
  if (m.includes("not confirmed")) return "Confirm your email first: check your inbox.";
  if (m.includes("sending") || m.includes("smtp")) return "We couldn't send the email right now. Try again later.";
  if (m.includes("expired") || m.includes("invalid") && (m.includes("token") || m.includes("otp"))) return "That code didn't work. Check it, or get a new one.";
  if (m.includes("seconds") || m.includes("security purposes")) return "Wait a minute before asking for another code.";
  return "Something went wrong. Please try again.";
}

export interface Names {
  first_name: string;
  last_name: string;
}
/** Which 6-digit code is on its way: a guest adding their email, or a brand-new account. */
export type CodeKind = "email_change" | "signup";

/**
 * Sign up with name, email and password. A guest keeps their fits: their account gets the email and password.
 * Returns "done", or the kind of 6-digit code Drippy just emailed when the email needs confirming first.
 */
export async function signUpWithEmail(email: string, password: string, names: Names): Promise<"done" | CodeKind> {
  if (DEMO_MODE) {
    try { localStorage.setItem(DEMO_ACCOUNT_KEY, email); } catch { /* ignore */ }
    return "done";
  }
  const auth = supabase().auth;
  const { data: s } = await auth.getSession();
  const redirect = window.location.origin;
  const data = { ...names, full_name: `${names.first_name} ${names.last_name}`.trim() };

  if (s.session?.user.is_anonymous) {
    const { data: updated, error } = await auth.updateUser({ email, data }, { emailRedirectTo: redirect });
    if (error) throw new AuthFailure(friendly(error.message));
    if (updated.user?.email?.toLowerCase() !== email.toLowerCase()) {
      // Confirming by link instead of the code still works: the password is asked for when they come back.
      try { localStorage.setItem(PENDING_KEY, email); } catch { /* ignore */ }
      return "email_change";
    }
    const { error: pwError } = await auth.updateUser({ password });
    if (pwError) throw new AuthFailure(friendly(pwError.message));
    return "done";
  }

  const { data: created, error } = await auth.signUp({ email, password, options: { data, emailRedirectTo: redirect } });
  if (error) throw new AuthFailure(friendly(error.message));
  return created.session ? "done" : "signup";
}

/** Check the 6-digit code from the email. A guest then gets their password, set in the same step. */
export async function verifyEmailCode(email: string, code: string, kind: CodeKind, password: string): Promise<void> {
  if (DEMO_MODE) return;
  const auth = supabase().auth;
  const { error } = await auth.verifyOtp({ email, token: code, type: kind === "email_change" ? "email_change" : "email" });
  if (error) throw new AuthFailure(friendly(error.message));
  if (kind === "email_change") {
    const { error: pwError } = await auth.updateUser({ password });
    if (pwError) throw new AuthFailure(friendly(pwError.message));
  }
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

export async function resendEmailCode(email: string, kind: CodeKind): Promise<void> {
  if (DEMO_MODE) return;
  const { error } = await supabase().auth.resend({ type: kind, email });
  if (error) throw new AuthFailure(friendly(error.message));
}

/** Sends the "Welcome to Drippy" email once per account (the server remembers who got it). */
export async function sendWelcomeOnce(userId: string): Promise<void> {
  if (DEMO_MODE) return;
  const key = `drippy.welcomeSent.${userId}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch { /* ignore */ }
  const { error } = await supabase().functions.invoke("welcome-email", { body: {} });
  if (!error) {
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
  }
}

/** True once a guest who signed up has confirmed their email and still needs a password. */
export function needsPassword(account: Account | null): boolean {
  if (!account || account.guest || !account.email) return false;
  try {
    return localStorage.getItem(PENDING_KEY)?.toLowerCase() === account.email.toLowerCase();
  } catch {
    return false;
  }
}

export async function setPassword(password: string): Promise<void> {
  if (DEMO_MODE) return;
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new AuthFailure(friendly(error.message));
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

/** Log in to an existing account. Fits rated as a guest on this phone stay with the guest. */
export async function logInWithEmail(email: string, password: string): Promise<void> {
  if (DEMO_MODE) {
    try { localStorage.setItem(DEMO_ACCOUNT_KEY, email); } catch { /* ignore */ }
    return;
  }
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw new AuthFailure(friendly(error.message));
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (DEMO_MODE) return;
  const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new AuthFailure(friendly(error.message));
}

/** Google / Apple / Facebook. A guest links the provider to their account so their fits stay. */
export async function continueWithProvider(provider: Provider): Promise<void> {
  if (DEMO_MODE) throw new AuthFailure("Social login needs the real backend.");
  const auth = supabase().auth;
  const { data: s } = await auth.getSession();
  const options = { redirectTo: window.location.origin };
  const { error } = s.session?.user.is_anonymous
    ? await auth.linkIdentity({ provider, options })
    : await auth.signInWithOAuth({ provider, options });
  if (error) throw new AuthFailure(friendly(error.message));
}

/** Log out; the next scan starts a fresh guest. */
export async function logOut(): Promise<void> {
  if (DEMO_MODE) {
    try { localStorage.removeItem(DEMO_ACCOUNT_KEY); } catch { /* ignore */ }
    return;
  }
  await supabase().auth.signOut();
}
