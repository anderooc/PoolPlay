# Mobile + web parity implementation plan

## Phase 1 — Host prep settings (API + mobile)
- [x] Shared queries: payment, waiver, packet settings
- [x] `GET/PATCH /api/v1/tournaments/[slug]/host/payment/settings`
- [x] `PATCH /api/v1/tournaments/[slug]/host/waiver/settings`
- [x] `POST /api/v1/tournaments/[slug]/host/waiver/pdf` (base64 JSON)
- [x] `GET/PATCH /api/v1/tournaments/[slug]/host/packet`
- [x] Mobile settings screens + host hub links

## Phase 2 — Day-of host ops
- [x] `PATCH .../host/matches/[matchId]/ref`
- [x] `PATCH .../host/matches/[matchId]/court`
- [x] Mobile ref/court UI on host schedule

## Phase 3 — Account & teams
- [x] `POST/DELETE /api/v1/me/avatar`
- [x] `POST /api/v1/me/delete`
- [x] `DELETE /api/v1/teams/[slug]`
- [x] Mobile profile avatar, delete account, team delete

## Phase 4 — Host UX polish
- [ ] Wire bulk division on mobile (API exists)
- [ ] `GET /api/v1/schedule` (organizer cross-tournament)
- [ ] Mobile schedule screen
- [ ] Mobile scoring board (reuse matches API)

## Phase 5 — Realtime & docs
- [ ] Supabase realtime on mobile tournament chat
- [ ] Update `mobile/README.md`
- [x] Privacy/terms links on mobile profile

## Phase 6 — Production push
- [ ] EAS build docs (already in README)
- [ ] Notification preferences (later)
