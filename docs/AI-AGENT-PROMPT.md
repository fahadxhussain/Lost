# AI Coding Agent --- Project Execution Prompt

You are the senior software engineer responsible for implementing the
COMSATS Lost & Found application in this repository.

Read these documents completely before making changes:

-   `01-PRODUCT-REQUIREMENTS.md`
-   `02-ARCHITECTURE-DECISIONS.md`
-   `03-TECHNICAL-DESIGN.md`
-   `04-IMPLEMENTATION-PLAN.md`

If these files are stored under `docs/`, read them from there.

## Your first task: inspect, do not immediately code

Before changing files:

1.  Inspect the entire relevant repository structure.
2.  Identify the frontend framework, backend framework, database,
    ORM/query layer, migrations, authentication, storage, current API
    routes, tests and scripts.
3.  Read existing project documentation and environment examples.
4.  Identify what is already implemented, partially implemented, broken
    or missing.
5.  Check whether the repository already contains decisions that
    conflict with these documents.
6.  Do not overwrite working code or replace the existing architecture
    merely to match your preferred template.

Then produce a concise but technically detailed audit containing:

-   Current architecture.
-   Existing functionality.
-   Missing functionality.
-   Risks and inconsistencies.
-   Proposed target architecture.
-   Files/modules likely to change.
-   Database changes/migrations required.
-   Test strategy.
-   Unresolved product/technology decisions that require owner approval.

Do not ask questions that the repository or these documents already
answer.

## Product constraints you must preserve

-   Phase 1 is for COMSATS University Islamabad students only.
-   Registration is restricted to the approved university student email
    domain/pattern. The supplied example is
    `SP23-BSE-011@ISBSTUDENT.COMSATS.EDU.PK`; do not hardcode that one
    roll number.
-   Accounts remain inactive until email OTP verification succeeds.
-   Every report requires a category and description.
-   Photograph is optional; photo-only reports are not allowed under the
    current requirement.
-   Mobile Phone and Laptop Charger are separate top-level categories.
-   Reports are either LOST or FOUND.
-   New LOST reports search active FOUND reports; new FOUND reports
    search active LOST reports.
-   Candidate retrieval first uses database filtering and inexpensive
    algorithmic text matching. Gemini only evaluates shortlisted
    candidates.
-   Matching runs asynchronously. The report API must not wait for
    Gemini.
-   A background job should represent a source report and its shortlist,
    rather than creating needless per-candidate jobs.
-   Report submission time is not the same as actual incident time.
    Never exclude a candidate merely because its report was submitted
    later.
-   Search is independent of AI matching and must not call Gemini.
-   AI only identifies potential matches. It must never decide
    ownership, automatically resolve a report or claim that a student
    owns an item.
-   A potential match should notify both involved students.
-   In-app communication is required; message persistence and
    participant authorization are mandatory.
-   Use Node.js + Express and PostgreSQL as the core backend
    architecture.
-   Start with a modular monolith; do not introduce microservices
    without a demonstrated need.

## Technical execution rules

1.  **Repository-first:** Follow sound existing conventions. Avoid
    unnecessary rewrites.
2.  **Plan before substantial changes:** After the audit, present a
    phased implementation plan and wait for approval if the repository
    has significant ambiguity or the next step is destructive. If the
    task is clearly authorized and non-destructive, proceed in small
    increments.
3.  **No invented credentials:** Never fabricate API keys, email
    credentials, storage secrets or production URLs. Use environment
    variables and `.env.example` placeholders.
4.  **No client-side secrets:** Gemini, database, email and storage
    secrets must remain server-side.
5.  **Real persistence:** Do not use in-memory arrays or mock data as
    the implementation of core application functionality.
6.  **Database correctness:** Use migrations, constraints, transactions
    and indexes. Do not rely only on application-level checks for
    invariants that the database can enforce.
7.  **Security:** Enforce authorization on every protected resource.
    Validate input, rate-limit sensitive endpoints, hash passwords and
    OTPs, and redact secrets from logs.
8.  **Background reliability:** Implement queue claiming/locking,
    bounded retries, backoff, idempotency, stale-job checks and
    observable failures.
9.  **AI isolation:** Put Gemini behind a service/provider abstraction.
    Validate structured output. Do not spread model-specific code
    through controllers.
10. **Cost control:** Do not call Gemini for every report or every
    candidate individually by default. Filter first, shortlist, then
    batch where supported and safe. Respect context limits and rate
    limits.
11. **Recall:** Candidate retrieval should not be so strict that it
    misses genuine matches because students used different words.
12. **Tests:** Add meaningful unit/integration tests. Test both
    directions of matching, incident-time edge cases, retries, duplicate
    prevention, authorization and stale reports.
13. **Documentation:** Update architecture decisions, `PENDING.md`,
    setup instructions and API documentation as implementation evolves.
14. **No false completion claims:** State exactly what was implemented,
    what tests ran, what failed and what remains.

## Required edge cases to account for

-   A found report is submitted at 12:00 PM; the owner submits a lost
    report at 1:00 PM, although the item was lost before noon. Do not
    reject the pair because of submission order.
-   One report has a photo and description; the other has only a
    description.
-   Both reports have descriptions but no photos.
-   Descriptions use synonyms or different wording.
-   A keyword contains a typo.
-   A report is resolved after a job is queued but before the worker
    processes it.
-   A candidate is closed while a job is processing.
-   Gemini times out, returns malformed JSON or returns an unknown
    candidate ID.
-   The same job is retried multiple times.
-   Two jobs discover the same lost/found pair.
-   A user tries to access another user's report, notification or
    conversation.
-   No candidates are found; do not call Gemini.

## Definition of done for each feature

A feature is not done until: - Its behaviour is implemented
end-to-end. - Input validation and authorization are present. - Database
migrations/constraints are included where needed. - Relevant tests
pass. - Failure states are handled. - Documentation is updated. - Any
remaining limitation is explicitly reported.

## Begin now

Start with the repository audit. Do not begin by generating a new app or
rewriting the existing project. After the audit, show the proposed
implementation sequence and identify any decisions that genuinely need
my approval.
