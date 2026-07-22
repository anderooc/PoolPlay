# Production deployment checklist

## Domain

Production origin for this rebrand is `https://shoot-set.com`. Set
`NEXT_PUBLIC_APP_URL` to that value in Vercel (and local `.env` when testing
auth/email redirects). Update Supabase Auth redirect URLs and Resend domain
DNS for `shoot-set.com` before cutover.

## Required before deploying this change

- Apply Supabase migrations `00036` through `00038` before starting the new
  application build.
- Set `AUTH_RATE_LIMIT_SECRET` to a long random server-only value. The database
  URL is used as a fallback, but a dedicated secret makes rotation safer.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Account deletion and protected
  storage operations require it.
- Ensure the deployment proxy overwrites `x-forwarded-for`, `x-real-ip`, or
  `cf-connecting-ip`; auth rate limiting trusts those proxy headers.
- Set the GitHub Actions repository variable `SHOOTSET_STAGING_URL` to enable
  the staged Playwright and Lighthouse job.

## Supabase checks

- Confirm email verification and Supabase Auth's built-in email and password
  rate limits are enabled. App-side limits supplement rather than replace them.
- Test Realtime as four users: a public signed-in user, draft organizer, host
  school member, and unrelated user. Draft match/set events must reach only the
  organizer and host-school member; published events may reach all signed-in
  users.
- Confirm anonymous browser clients cannot select app tables.
- Review pending account-auth cleanup after incidents:
  `select * from account_deletion_requests where completed_at is null`.
- Periodically remove expired `auth_rate_limits` rows.

## Release checks

- Run `npm run check`, `npm run test:a11y`, and `npm run test:lighthouse`.
- Test signup, password reset, account deletion, live scoring, keyboard
  navigation, and reduced motion on the deployed origin.
- Test one current iPhone/Safari and one Android/Chrome device on a throttled
  mobile connection.
- Have the privacy notice and terms reviewed for the operator's jurisdiction
  before commercial or institution-wide launch. Add a private support contact
  before accepting external privacy requests.
- Revisit cookie consent before adding analytics, advertising, embedded media,
  or any non-essential browser storage.

## Accepted dependency exception

`npm audit` currently reports two high findings inherited from Next.js's
`sharp` dependency. Next `16.2.11` still resolves `sharp <0.35.0`, and npm's
suggested forced fix is a breaking downgrade to Next 14. Do not run it. Track
the upstream Next.js release that adopts a fixed Sharp/libvips build, then
upgrade and rerun the full quality suite.
