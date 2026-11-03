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
