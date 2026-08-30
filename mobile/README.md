# brackt mobile

Expo / React Native client for brackt. It talks to the versioned HTTP API in the
web project (`src/app/api/v1/`) and uses Supabase only as an identity provider.

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local   # fill in the two Supabase values
npm start
```

Add `brackt://reset-password` to **Supabase → Authentication → URL configuration →
Redirect URLs** so mobile password-reset emails open the app.

The web app must be running for the API to answer:

```bash
# from the repo root
npm run dev
```

### Pointing at the API

On the **iOS simulator** and **Android emulator**, the API defaults to
`http://localhost:3000` (rewritten to `10.0.2.2` on Android) so the app talks
to the Next.js dev server on your machine without chasing LAN IPs.

On a **physical device**, the API host is derived from the Expo dev server
address (same wifi). If that breaks after a network change, set
`EXPO_PUBLIC_API_BASE_URL` explicitly — e.g. `http://10.0.0.34:3000` (your Mac's
current LAN address from `ipconfig getifaddr en0`).

```
EXPO_PUBLIC_API_BASE_URL=https://brackt-staging.example.com
```

## Running it

No Xcode needed for the quickest loop. Install **Expo Go** from the App Store,
start the web app (`npm run dev` from the repo root) and then:

```bash
cd mobile
npx expo start          # scan the QR code with the iPhone Camera app
```

Everything this app uses natively — SecureStore, AsyncStorage, expo-crypto,
screens, safe-area-context — is bundled in Expo Go, so no custom dev build is
required. The one gap is `expo-secure-store`'s `requireAuthentication` option,
which Expo Go cannot support; this app does not use it.

For the **iOS simulator** you need the full Xcode (the Command Line Tools alone
are not enough), then:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
npx expo start --ios
```

## How data flows

```
screen  ->  src/api/endpoints.ts  ->  src/api/client.ts  ->  GET /api/v1/...
                                            |
                                    Authorization: Bearer <supabase access token>
```

Nothing queries Postgres directly. The database revokes table privileges from
the `anon` and `authenticated` roles (see
`supabase/migrations/00044_browser_rls_lockdown.sql`), so a direct Supabase
query would return almost nothing. Supabase is used for sign-in and token
refresh only.

## Session storage

A Supabase session — access token, refresh token, and serialized user — is a
single string that routinely exceeds the roughly 2048-byte value the iOS keychain
has historically refused, and the failure mode is quiet: sign-in appears to work,
then the session is gone on next launch.

`src/auth/large-secure-store.ts` is Supabase's documented workaround. Each write
generates a fresh AES-256 key, puts that 64-character key in the keychain, and
parks the encrypted session in AsyncStorage, which has no size ceiling.

Two details are load-bearing:

- **The key must be regenerated on every write.** The CTR counter is fixed at 1,
  so a reused key would repeat the keystream and leak plaintext.
- **UTF-8 conversion goes through `TextEncoder`, not `aesjs.utils.utf8`.** The
  aes-js helper walks UTF-16 code units without reassembling surrogate pairs, so
  it corrupts anything outside the BMP — a user with an emoji in their display
  name would get a session that no longer parses. Supabase's published snippet
  has this bug; `src/auth/session-cipher.test.ts` pins the fix and will tell you
  if aes-js ever repairs it upstream.

## Two path aliases

| Alias | Points at | Use for |
| --- | --- | --- |
| `~/*` | `mobile/src/*` | this app's own code |
| `@/*` | `../src/*` | shared API contracts only |

`@/*` mirrors the web project's alias because TypeScript resolves paths against
whichever tsconfig is compiling, so the shared contract modules need `@/types`
to mean the same thing on both sides.

**Only import `@/lib/api/contracts/*`, and only with `import type`.** Those
modules are guaranteed free of runtime dependencies; anything else under `@/`
reaches into Drizzle and `next/*`, which Metro cannot bundle. The web project's
`src/lib/api/contracts/purity.test.ts` fails the build if a contract picks up a
runtime import.

## Checks

```bash
npm test                                # session cipher, under tsx + node:test
npm run typecheck                       # tsc, includes the shared contracts
npx expo export --platform ios          # verifies Metro can bundle everything
```

Tests are excluded from `tsconfig.json` on purpose: they need Node's globals, and
pulling in `@types/node` would redefine timers and `Buffer` in a way that
conflicts with React Native's own declarations.

`react-dom` is pinned through `overrides` because it arrives as a transitive
optional peer of `expo-router` and resolves to a version that demands a newer
`react` than Expo 57 pins, which breaks a plain `npm install`.

## Not built yet

Sign-in, the public tournament list, tournament detail (overview, teams,
matches), and the profile screen exist to prove the chain end to end. Still to
come: live match pages, pool standings, brackets, personal schedule,
offline handling for score entry, and richer notification preferences.

## Push notifications

1. Run `npx eas init` in `mobile/` and set `EXPO_PUBLIC_EAS_PROJECT_ID` in
   `.env.local` to the project UUID.
2. Build a dev client or production binary with `expo-notifications` native code
   (push does not work in Expo Go for production tokens on iOS).
3. Optionally set `EXPO_ACCESS_TOKEN` on the API server for higher Expo Push
   rate limits.
4. Apply migrations `00056_user_push_tokens.sql` and
   `00057_user_notifications_realtime.sql` (`npm run db:push` from repo root).
