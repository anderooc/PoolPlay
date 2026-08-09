# Tournament Capacity, Deadlines, and Waitlists Design

## Objective

Add tournament-wide registration capacity, a public registration deadline, a
FIFO waitlist, and organizer-controlled promotion without granting waitlisted
teams payment obligations or protected tournament access.

## Approved Product Decisions

- Capacity is one limit for the entire tournament, not per division.
- Capacity and deadline are optional. A missing capacity means unlimited
  registration; a missing deadline means no time-based cutoff.
- Every active registration status (`pending`, `confirmed`, or `checked_in`)
  consumes one slot. Host-school registrations also consume capacity.
- When a registration batch crosses the capacity boundary, teams fill the
  remaining slots in submitted order and the rest join the waitlist in that
  same order.
- Waitlisted teams do not receive payment records or access to waivers, packet,
  payment, chat, pools, brackets, or other registration-protected features.
- Withdrawals never auto-promote another team.
- The organizer promotes exactly the oldest currently eligible waiting team.
- Organizer promotion is allowed after the public deadline so a late vacancy
  can still be filled.
- Public pages show capacity, deadline, and waiting-team count without exposing
  team identities.

## Architecture

Next.js Server Actions remain authenticated adapters. Transactional services
own deadline checks, capacity accounting, FIFO selection, authorization,
idempotency, payment creation, and audit state. PostgreSQL remains the source of
truth.

All operations that can change slot availability lock the tournament row with
`FOR UPDATE` before reading capacity or changing registrations. This includes
new registration, waitlist promotion, organizer removal, participant
withdrawal, and capacity changes. The shared lock order serializes last-slot
races and competing promotions without application-level mutexes.

## Data Model

### Tournament settings

Add two nullable columns to `tournaments`:

- `registration_capacity integer`: must be greater than zero when present.
- `registration_deadline timestamptz`: compared with PostgreSQL
  `clock_timestamp()` inside the locked transaction.

Capacity updates cannot reduce the limit below the current number of active
registrations. Existing tournaments remain unlimited with no deadline.

### Waitlist entries

Create `tournament_waitlist_entries` with:

- UUID primary key.
- Tournament and team foreign keys.
- Database-generated `bigserial` queue position.
- Requesting user and request operation UUID.
- Status: `waiting`, `promoted`, `withdrawn`, or `removed`.
- Request timestamp.
- Resolution timestamp, resolving user, resolution operation UUID, and the
  created registration ID when promoted.

Required constraints and indexes:

- At most one `waiting` row for a tournament/team pair.
- A request operation can represent each selected team only once.
- A resolution operation can resolve only one queue entry.
- A promoted registration can resolve only one queue entry.
- A promoted row requires resolution metadata and references its registration
  when promotion occurs. If that registration is later deleted, the foreign key
  may set `registration_id` to `NULL` while the promotion audit remains.
- Withdrawn and removed rows require resolution metadata and no registration.
- Waiting rows cannot contain resolution metadata, including a resolver.
- FIFO lookup index on tournament, status, and queue position.
- Row-level security enabled with no direct browser privileges.

Rows remain after resolution to preserve queue and promotion history.

## Registration Flow

`registerTeamsAtomically` keeps its existing input validation and authorization,
then performs these steps while holding the tournament lock:

1. Reconstruct an idempotent replay from registration events and waitlist rows
   sharing the request operation ID.
2. Require tournament status `registration_open`.
3. Read PostgreSQL `clock_timestamp()` and reject a new request after the
   deadline.
4. Validate every selected team, captain relationship, gender, school status,
   team status, existing registration, and active waitlist entry.
5. Count active registrations and calculate remaining capacity.
6. Create active registrations for teams that fit, including their existing
   registration audit and payment behavior.
7. Insert the remainder as FIFO waitlist rows without payment records.

The service returns accepted count, waitlisted count, and replay state. The UI
reports both outcomes and refreshes public capacity/queue data.

## Promotion Flow

`promoteNextWaitlistedTeamAtomically` accepts tournament ID, organizer actor,
and an operation UUID. In one transaction it:

1. Locks and reloads the tournament.
2. Reconstructs an idempotent replay when the operation already succeeded.
3. Revalidates organizer or administrator authority from current database
   state.
4. Allows `registration_open` or `registration_closed`, including times after
   the public deadline.
5. Verifies capacity has an available slot.
6. Selects the lowest queue position whose team and school are still eligible
   and whose gender matches the tournament.
7. Creates one `pending` registration and its registration audit event.
8. Creates the payment record only now, using the active same-school
   registration count to select first-team or additional-team pricing.
9. Marks the waitlist entry `promoted` with resolution and registration data.

If the queue is empty, every waiting team is currently ineligible, or capacity
is full, the service returns a clear domain error and changes nothing.

## Withdrawal and Removal

A captain may withdraw their own active waitlist entry while registration is
open. Organizers may remove a waiting entry while registration is open or
closed. Both operations lock the tournament, update the row's resolution
metadata, and never create a registration or payment.

Active-registration withdrawal and organizer removal continue to delete the
registration and cascade its payment. They use the same tournament lock but do
not promote another team automatically.

## Read Models and Interface

- Tournament setup gains capacity and deadline inputs with server validation.
- The registration page shows available/unlimited capacity, deadline, and the
  user's waiting outcome.
- The organizer registrations panel gets a waitlist section ordered by queue
  position and one `Promote next team` control. Arbitrary promotion is not
  exposed.
- Public tournament list/detail projections include nullable capacity,
  nullable deadline, active registration count, and waiting count only.
- Applicant views may show their own team and queue position; other waitlisted
  team identities remain organizer-only.

## Error Handling

- Deadline, full-capacity, duplicate request, ineligible team, empty queue, and
  stale promotion errors use existing domain error types.
- Unique violations are translated into replay/conflict messages instead of
  leaking PostgreSQL errors.
- Every logical operation is atomic; payment creation or audit failure rolls
  back the registration and waitlist resolution.
- Public cache invalidation runs only after a successful transaction.

## Testing Strategy

Unit tests cover capacity allocation, deadline decisions, FIFO ordering, public
projection privacy, and payment access isolation.

Disposable PostgreSQL tests cover:

- Two concurrent requests for the last slot produce exactly one registration
  and one waiting entry.
- Two concurrent promotion attempts cannot exceed capacity or promote the same
  queue entry.
- A request that acquires the tournament lock after the deadline is rejected
  using database time.
- FIFO uses queue position even when timestamps tie.
- Waitlisted teams have no payment rows.
- Promotion creates exactly one correctly priced payment and one registration
  audit event.
- Idempotent registration and promotion retries do not duplicate registrations,
  waitlist entries, events, or payments.

Full verification includes the Node test suite, typecheck, backend/scoped lint,
clean PostgreSQL bootstrap and catalog fingerprint, production build, code
review, and security review. Environment-blocked gates must be reported rather
than treated as passes.

## Completion Standard

The feature is complete only when capacity and deadline settings are usable,
registration queues teams at full capacity, the organizer can promote only the
next eligible team, waitlisted teams remain outside payment/protected access,
public data preserves identity privacy, concurrency/payment tests execute
against PostgreSQL, and all available verification gates pass.
