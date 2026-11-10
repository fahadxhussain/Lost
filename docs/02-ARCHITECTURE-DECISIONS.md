# Architecture Decision Record --- COMSATS Lost & Found

This document distinguishes confirmed decisions from proposals and
unresolved choices.

## ADR-001: Phase 1 is university-exclusive

**Status:** Confirmed

Phase 1 serves the COMSATS University Islamabad student community only.
Registration is restricted to the approved university student email
domain/pattern. The example provided is
`SP23-BSE-011@ISBSTUDENT.COMSATS.EDU.PK`; it is an example, not the only
allowed address.

The authoritative domain policy must be verified before production
release.

## ADR-002: Backend framework

**Status:** Confirmed

Use Node.js and Express as the main application backend. Business logic
should live in the Express application, not be scattered across
platform-specific serverless functions.

## ADR-003: Database

**Status:** Confirmed

Use PostgreSQL as the relational database.

PostgreSQL may be self-hosted or hosted by a managed provider. Supabase
may be used as a PostgreSQL hosting provider and/or for selected
infrastructure services, but the project is not required to adopt
Supabase Auth, Edge Functions or its generated APIs.

**Important distinction:** Supabase is a backend platform built around
PostgreSQL; it is not an alternative relational database engine.

## ADR-004: Modular monolith

**Status:** Recommended architecture; confirm against existing
repository

Start with one modular Express backend rather than microservices. Keep
modules separated by domain (auth, users, reports, categories, matching,
notifications, messaging). A separately run worker process may share the
same codebase and database.

## ADR-005: Mobile client

**Status:** Confirmed in planning

Use React Native with Expo for the mobile application.

## ADR-006: AI provider

**Status:** Confirmed at provider level

Use Google's Gemini API for deeper potential-match analysis and image
understanding where supported.

Do not hardcode a retired model/version. Select a currently supported
model through configuration and verify its capabilities, context limits,
image-input support, structured-output support, pricing and rate limits
before implementation.

## ADR-007: Matching is candidate retrieval followed by AI evaluation

**Status:** Confirmed

Do not send every active report to AI.

First filter opposite-type active reports by category and safe
eligibility rules. Then use inexpensive algorithmic techniques such as
PostgreSQL full-text search, `pg_trgm`, token overlap and other
explainable signals to shortlist candidates. Send only shortlisted pairs
to Gemini for deeper evaluation.

The candidate stage should favour recall over precision so that wording
differences do not prematurely eliminate genuine matches.

## ADR-008: Matching is asynchronous

**Status:** Confirmed

AI evaluation runs in the background. Report submission should complete
without waiting for Gemini. Use a reliable queue, bounded retries,
controlled concurrency, idempotency and stale-job checks.

A PostgreSQL-backed queue is preferred for the initial architecture.
Supabase Queues (`pgmq`) is one option if the database is hosted on
Supabase; a different PostgreSQL queue implementation may be selected if
justified.

## ADR-009: Report requirements

**Status:** Confirmed

Every lost/found report requires a category and description. A photo is
optional. Photo-only reports are not allowed under the current
requirement.

## ADR-010: Category taxonomy

**Status:** Partially confirmed

Categories are selected from a dropdown and stored in a database-managed
table.

**Explicit requirement:** Mobile Phone and Laptop Charger are separate
categories. Do not merge them into a generic Electronics category or
make Laptop Charger a subcategory of Mobile Phone.

The complete category list remains to be reviewed and approved. The
starter list in the requirements document is a proposal.

## ADR-011: Time semantics

**Status:** Confirmed

Submission time and incident time are different data points. Never use
report `created_at` as a strict chronological rule for excluding
candidates. A student may report an item lost after another student
reports finding it even though the item was lost earlier.

Incident time may be uncertain; support an estimated time/range or
unknown value.

## ADR-012: AI does not determine ownership

**Status:** Confirmed

AI only identifies potential matches. It must not decide ownership, mark
an item as recovered, or assert that a claimant is the owner. Human
communication and confirmation are required.

## ADR-013: Search is separate from AI matching

**Status:** Confirmed

Students can search lost/found reports using keywords and filters.
Search must use database search functionality and must not call Gemini
for every query.

## ADR-014: Communication

**Status:** Product requirement confirmed; detailed access model
unresolved

Students need an in-app communication channel. Persist messages.
Socket.IO is a candidate for real-time delivery.

Still to confirm: - Can any student message a report owner, or only
students connected through a potential match? - Is a conversation always
attached to a potential-match record? - What blocking, reporting,
moderation and retention rules are required?

## ADR-015: Infrastructure choices not yet finalized

**Status:** Open

Do not silently decide these without inspecting the repository and
documenting a recommendation:

-   PostgreSQL hosting provider (self-hosted, Supabase-managed, or
    another managed PostgreSQL service).
-   ORM/query layer (Prisma, Drizzle, node-postgres or another justified
    choice).
-   Image/object storage provider.
-   Email/transactional email provider.
-   Authentication token/session strategy.
-   Push-notification delivery approach.
-   Exact queue implementation.
-   Deployment and hosting provider.

The agent should inspect existing dependencies and code first, then
recommend the smallest coherent set of technologies.
