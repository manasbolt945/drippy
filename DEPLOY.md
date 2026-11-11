# Deploying Drippy (free tiers)

Backend on **Supabase** (database, photo storage, `score-fit` function), frontend on **Vercel**.
Live pilot: **https://drippy-kappa-eight.vercel.app** (Supabase project `lqoocllzxcbmkoxigzmm`).
Both free plans are enough for the friends pilot. The only paid part is Claude API usage (a few dollars a month on Haiku).

Never paste these into chat, code or GitHub: the **database password**, the Supabase **secret / service_role key**, and your **Anthropic API key**.
The Supabase **project URL** and **publishable (anon) key** are public by design and safe to share.

Supabase CLI commands below run through `npx`, so nothing needs installing. Run them from the repo root.

## 1. Supabase project

1. Sign in at https://supabase.com (Sign in with GitHub is easiest).
2. **New project**: name `drippy`, a strong database password (save it in your password manager), region closest to your friends (e.g. *Mumbai* for India), Free plan.
3. **Authentication → Sign In / Providers → Allow anonymous sign-ins: on.** Everyone gets a private account on first use without signing up.
4. Note from **Project Settings → API / Data API**:
   - Project ref: the id in the dashboard URL (`supabase.com/dashboard/project/<ref>`)
   - Project URL: `https://<ref>.supabase.co`
   - Publishable key (or legacy `anon` key)

## 2. Claude API key

1. https://platform.claude.com → create an API key, add a little credit (e.g. $5).
2. **Set a monthly spend limit** (e.g. $10) so a bug can't run up a bill.

## 3. Connect and deploy the backend

```bash
npx supabase@3.0.0 login                              # opens the browser
npx supabase@3.0.0 link --project-ref <ref>           # asks for the database password
npx supabase@3.0.0 db push                            # creates tables, rules and the photo bucket
npx supabase@3.0.0 secrets set ANTHROPIC_API_KEY=<your key>
npx supabase@3.0.0 functions deploy score-fit
```

Optional limits (defaults: 10 rated photos and 30 attempts per person per day):

```bash
npx supabase@3.0.0 secrets set FREE_DAILY_SCANS=10 MAX_DAILY_ATTEMPTS=30
```

## 4. Frontend on Vercel

1. Sign in at https://vercel.com with GitHub → **Add New → Project** → import `manasbolt945/drippy` (allow Vercel access to the repo).
2. **Root Directory: `web`** (Framework: Next.js, detected automatically).
3. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable / anon key
   - Optional, for analytics: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (see section 7)
4. **Deploy.** You get a URL like `https://drippy-xyz.vercel.app`. Every push to `main` redeploys automatically.

## 5. Lock it down and test

```bash
npx supabase@3.0.0 secrets set ALLOWED_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000
```

Then open the Vercel URL on your phone (the camera works there because it's HTTPS) and check:

- [ ] The welcome plays, **Allow camera** opens the camera
- [ ] A real outfit photo gets a real score (no "Sample result" label)
- [ ] A photo with no outfit shows "We can't see your fit"
- [ ] History shows your past fits after a reload
- [ ] Share opens the phone's share sheet

**Add to Home Screen** from the browser menu to use it like an app.

## 6. Watching usage, logs and tables

| What | Where |
|---|---|
| Every scan (score, status, timing, tokens) | Supabase → **Table Editor → `scans`** |
| One row per day: scans, people, average score, estimated Claude cost | Supabase → **SQL Editor**: `select * from daily_stats;` |
| Users (anonymous accounts) | Supabase → **Authentication → Users** |
| Function logs, one line per step | Supabase → **Edge Functions → score-fit → Logs** (search e.g. `scan.scored`, `ai.error`, `request.done`) |
| Invocations, errors, response times | Supabase → **Edge Functions → score-fit → Overview** |
| Database / storage size vs free limits | Supabase → **Project Settings → Usage** (or Organization → Usage) |
| Real Claude spend | https://platform.claude.com → **Usage** and **Cost** |
| Site traffic | Vercel → project → **Analytics** (turn on Web Analytics, free) and **Logs** |

Log events from `score-fit` (JSON, never the photo): `request.received` (user, photo size, occasion), `ai.response` (model, stop reason, time, tokens), `scan.scored` (score, best occasion, headline), `scan.not_scorable`, `scan.refused`, `ai.error`, `ai.bad_output`, `scan.insert_failed`, `photo.saved`, `photo.save_failed`, and `request.done` (HTTP status, total time) for every request, including rejected ones with a `reason`.

Photos are stored only while the `SAVE_PHOTOS` flag is on (**currently on**, since 5 Nov 2026). With it on, each **scored** photo is kept in the private `scans` bucket at `<user_id>/<scan_id>.jpg`, and `scans.image_path` points to it; refused and not-scorable photos are never kept. Log events: `photo.saved` / `photo.save_failed`, and `request.done` has `photo_saved`. History thumbnails still live only in each person's browser.

```bash
npx supabase@3.0.0 secrets set SAVE_PHOTOS=true    # start keeping photos
npx supabase@3.0.0 secrets set SAVE_PHOTOS=false   # stop (photos already saved stay until deleted)
```

See the stored photos under Storage → scans in the dashboard.

Handy SQL:

```sql
-- latest scans
select created_at, status, overall, headline, duration_ms, input_tokens, output_tokens
from scans order by created_at desc limit 20;

-- most active people today
select user_id, count(*) as scans, round(avg(overall)) as avg_score
from scans where created_at > now() - interval '1 day' group by 1 order by 2 desc;
```

## 7. Analytics

Two tools, both free at pilot scale. Neither uses cookies, and neither ever sees photos.

**Vercel Web Analytics (visits).** Real visitors, page views, referrers (e.g. Instagram), countries and devices.
Turn it on once: Vercel → project → **Analytics** tab → **Enable**. The `<Analytics />` tag is already in `web/app/layout.tsx`. Until it's enabled, that tab shows a "Demo Data" sample chart, which is not your traffic.

**PostHog (daily users and the funnel).** Drippy's project key (project 720058, US cloud) is built into `web/lib/analytics.ts`, so production reports with no setup; local dev and demo mode send nothing. Setting the env vars below overrides it (e.g. for a different project).
1. Sign up at https://posthog.com (pick US or EU cloud) → create a project → copy the **Project API key** (starts with `phc_`, safe to be public).
2. Vercel → project → **Settings → Environment Variables**:
   - `NEXT_PUBLIC_POSTHOG_KEY` = `phc_…`
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com` (or `https://eu.i.posthog.com`)
3. **Redeploy** (Deployments → ⋯ → Redeploy), since `NEXT_PUBLIC_` values are baked in at build time.

Events sent (from `web/lib/analytics.ts`); each person is identified by their Supabase user id, so PostHog users match `scans.user_id`:

| Event | Properties |
|---|---|
| `$pageview` | (automatic) |
| `welcome_started` | `via`: camera / upload |
| `photo_added` | `source`: camera / upload |
| `scan_requested` | `occasion` |
| `scan_scored` | `occasion`, `overall` |
| `scan_not_scorable` | `occasion` |
| `scan_failed` | `kind`: limit / busy / failed / network |
| `share_opened` | `occasion` |
| `share_completed` | `method`: share_sheet / download / hold_to_save |
| `history_opened` | `from` |

The iOS app (`ios/`, not shipped yet) sends the same event names into the same PostHog project, plus `occasion_breakdown_toggled`; its share methods are `instagram_story` and a `share_opened` for the system share sheet. Filter by `$os` / `$lib` to split web from iOS.

Useful PostHog insights: **Trends** → `$pageview`, unique users, daily (daily users); **Funnel** → `$pageview` → `photo_added` → `scan_scored` → `share_completed`; **Retention** → `scan_scored` returning.

## 8. Accounts and email

Everyone starts as an anonymous guest. Signing up (name, email, password, then a 6-digit code) turns that guest into a real account with the same id, so their fits stay. Log in is email + password; Google/Apple/Facebook buttons appear only when listed in `NEXT_PUBLIC_AUTH_PROVIDERS` (Vercel env) and enabled in Supabase.

- **Email sender:** Resend (domain `drippy-ai.org`), connected in Supabase → Authentication → Emails → SMTP (`smtp.resend.com`, port 465, user `resend`, sender `hello@drippy-ai.org`).
- **Templates:** paste `supabase/templates/confirm-signup.html` (Confirm signup), `change-email.html` (Change email address, used when a guest signs up) and `reset-password.html` (Reset password) into Authentication → Emails → Templates. Email OTP length: 6.
- **Welcome email:** the `welcome-email` function sends `welcome.html` once per real account (Google or confirmed email). It needs the Resend key as a secret: `secrets set RESEND_API_KEY=...`. Deploy with `npx supabase@3.0.0 functions deploy welcome-email --remote=<ref>`.
- **URL configuration:** Site URL `https://drippy-ai.org`; redirect URLs for drippy-ai.org, www, the vercel.app address and localhost.
