# Implementation Plan and Acceptance Criteria

The coding agent must inspect the repository first and adapt this plan
to the current state. Do not overwrite working features or generate a
parallel application without checking what already exists.

## Phase 0 --- Repository audit and implementation proposal

Tasks: - Inspect repository structure, package scripts, dependencies,
environment handling, database setup and current application
behaviour. - Identify existing frontend/backend boundaries. - Identify
implemented features and gaps. - Review current database schema and
migrations. - Report security risks and architectural inconsistencies. -
Produce or update `ARCHITECTURE.md`, `PENDING.md` and
`ARCHITECTURE_DECISIONS.md` if the repository uses these documents. -
Propose an implementation sequence with affected files and tests.

Acceptance: - No destructive changes. - Existing functionality is
documented. - Unknowns are explicitly listed. - No credentials or
secrets are requested or committed.

## Phase 1 --- Database foundation and categories

Tasks: - Define users, categories and reports schema. - Add migrations
and deterministic seed process. - Add constraints and useful indexes. -
Seed an initial category list after approval. - Ensure Mobile Phone and
Laptop Charger are distinct top-level entries. - Define report lifecycle
and incident-time representation.

Acceptance: - Migrations work from a clean database. - Seed is
repeatable/idempotent. - A report cannot be created without category and
description. - Photo is optional. - Resolved/closed reports can be
excluded by query. - Incident time and created time are distinct.

## Phase 2 --- Authentication and university email verification

Tasks: - Registration with university email domain validation. -
Password hashing. - OTP creation, delivery, expiry, attempt limits,
resend cooldown and verification. - Prevent unverified accounts from
using protected routes. - Login, logout and token/session lifecycle. -
Rate limiting and safe error handling.

Acceptance: - Non-approved email domains are rejected. - The supplied
example address format is accepted if it matches the confirmed
university policy. - The example roll number is not hardcoded as the
only account. - Account is not active until OTP verification succeeds. -
Expired, consumed or invalid OTPs cannot activate an account. - Raw
passwords and OTPs are never stored or logged.

## Phase 3 --- Report management and image storage

Tasks: - Create, view, update and close lost/found reports. - Validate
category, description, ownership and status transitions. - Implement
optional image upload with safe storage keys and validation. - Enforce
access control.

Acceptance: - Both LOST and FOUND reports are supported. - Category and
description are mandatory. - Image is optional. - Users cannot edit
another student's report. - Closed/resolved reports no longer appear as
active candidates.

## Phase 4 --- Student search

Tasks: - Keyword search using PostgreSQL. - Category, report type and
status filters. - Pagination and stable ordering. - Optional
location/date filters if implemented.

Acceptance: - Search works across lost and found reports. - Search does
not call Gemini. - Typo tolerance and lexical relevance are tested. -
Results respect privacy and visibility rules.

## Phase 5 --- Candidate retrieval algorithms

Tasks: - Implement symmetric opposite-type candidate retrieval. - Filter
by category and active status. - Add temporal relevance without using
created_at as a strict incident-time cutoff. - Implement full-text,
trigram and/or token-overlap ranking. - Make candidate limit and
thresholds configurable. - Add test fixtures for different wording,
misspellings and missing photos.

Acceptance: - New LOST reports search active FOUND reports. - New FOUND
reports search active LOST reports. - Resolved/closed and same-type
reports are excluded. - A report submitted later can still match an
earlier found/lost incident. - Algorithmic stage does not call Gemini. -
Candidate retrieval favours recall and is explainable.

## Phase 6 --- Queue and asynchronous Gemini matching

Tasks: - Select and document a PostgreSQL-backed queue implementation. -
Enqueue jobs after report persistence and candidate retrieval. - Build a
worker process. - Integrate Gemini through a server-side service
abstraction. - Batch candidates where safe and supported. - Validate
structured output. - Add retries, backoff, idempotency and stale-job
checks. - Persist potential matches and create notifications.

Acceptance: - Report API returns without waiting for Gemini. - No
candidates means no Gemini call. - Worker can recover after restart. -
Transient failures retry within configured limits. - Permanent failures
are inspectable. - Duplicate processing does not create duplicate
matches/notifications. - Stale reports are not matched or notified. - AI
never marks ownership or automatically resolves reports.

## Phase 7 --- Notifications and communication

Tasks: - Persist in-app notifications. - Notify both students for a
potential match. - Implement conversation and message persistence. - Add
real-time delivery if Socket.IO is selected. - Enforce participant-only
access. - Decide whether conversations are match-linked or can begin
earlier.

Acceptance: - Both students receive a durable notification for a new
potential match. - Duplicate match events do not create duplicate
notifications. - Only authorized participants can read/send messages. -
Messages remain available after reconnect/restart. - No private contact
details are exposed by default.

## Phase 8 --- Hardening and release readiness

Tasks: - Integration and authorization tests. - Rate limits and upload
security. - Queue/AI failure testing. - Logging and operational
metrics. - Database backup and migration strategy. - Deployment
configuration and environment documentation. - Mobile end-to-end happy
path and error states.

Acceptance: - Clean environment setup is documented. - `.env.example`
contains placeholders only. - No secrets are committed or bundled in the
app. - Critical workflows have automated tests. - Failure modes are
documented. - Production deployment checklist is complete.

## Required engineering practices

-   Use real PostgreSQL persistence for core functionality; do not
    substitute in-memory arrays.
-   Use migrations rather than manually editing production schema.
-   Keep controllers thin and business logic in services/modules.
-   Validate all external input.
-   Use transactions for multi-step database state changes.
-   Add tests with each meaningful feature.
-   Do not claim a feature is complete unless it is implemented and
    tested.
-   Update `PENDING.md` and architecture decision records as decisions
    change.
