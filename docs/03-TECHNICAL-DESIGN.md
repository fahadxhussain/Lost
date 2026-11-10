# Technical Design --- Initial Proposal

This is a proposed design to guide implementation. The agent must
inspect the repository and adapt it without violating confirmed
requirements.

## 1. High-level architecture

``` text
React Native / Expo
        |
        | HTTPS API
        v
Node.js + Express (modular monolith)
        |
        +---- Authentication and authorization
        +---- Users and profiles
        +---- Categories
        +---- Lost/found reports
        +---- Search
        +---- Matching orchestration
        +---- Notifications
        +---- Messaging
        |
        v
     PostgreSQL
        |
        +---- Reports and categories
        +---- Potential matches
        +---- Notifications and messages
        +---- Background job queue
        +---- Search indexes / pg_trgm
        +---- Optional pgvector, only if justified
        |
        +---- Background worker process
                    |
                    +---- Candidate retrieval
                    +---- Gemini API
                    +---- Persist match results
                    +---- Notification creation
```

The Express API and worker can be separate processes from the same
repository. Do not introduce microservices by default.

## 2. Suggested module boundaries

``` text
src/
  app.js
  server.js
  config/
  database/
    migrations/
    seeds/
  middleware/
    authenticate.js
    authorize.js
    validate.js
    error-handler.js
  modules/
    auth/
    users/
    categories/
    reports/
    search/
    matching/
    notifications/
    messaging/
  workers/
    matching.worker.js
  services/
    email/
    ai/
    storage/
    push/
  shared/
    errors/
    logger/
    utils/
```

Use the repository's existing conventions if they are sound. Avoid a
large folder refactor without a clear benefit.

## 3. Proposed core data entities

The following are logical entities, not a mandate to use these exact
table names or columns. The agent should produce an ERD and migration
plan before implementation.

### users

-   `id`
-   `email` (unique, normalized to lowercase)
-   `password_hash`
-   `email_verified_at` (nullable until verified)
-   `account_status` (pending/active/disabled or equivalent)
-   `created_at`
-   `updated_at`

Do not store plaintext passwords or OTPs.

### email_verification_otps

-   `id`
-   `user_id`
-   `otp_hash`
-   `expires_at`
-   `attempt_count`
-   `consumed_at`
-   `created_at`

Apply expiry, attempt limits, resend cooldown and cleanup policy.

### categories

-   `id`
-   `name`
-   `slug`
-   `is_active`
-   timestamps

Use unique constraints on normalized names/slugs. Seed approved initial
categories. Mobile Phone and Laptop Charger must be separate top-level
categories.

### reports

-   `id`
-   `user_id`
-   `category_id`
-   `report_type` (`LOST` or `FOUND`)
-   `description`
-   `photo_storage_key` or equivalent nullable field
-   `location_text` or structured location fields (depending on approved
    scope)
-   `incident_at` nullable, or incident start/end fields
-   `status` (`OPEN`, `RESOLVED`, `CLOSED`, or approved lifecycle)
-   `created_at`
-   `updated_at`

If multiple photos are supported, use a separate report-photos table
rather than adding repeated columns. The current requirement only
establishes optional photo(s); the agent should confirm whether multiple
photos are needed.

### report_attributes (optional)

A normalized place to store extracted attributes such as colour, brand,
model, material, distinguishing marks and object features. Do not make
unverified AI extraction mandatory for report creation.

### report_embeddings (optional)

Store text or image embeddings only if the selected model and retrieval
design justify them. `pgvector` is an option, not a mandatory first
implementation. Do not assume a text embedding is equivalent to a visual
image embedding.

### matching_jobs / queue

Use the chosen queue's message schema. A job should identify the source
report and the candidate report IDs or enough information to retrieve
them safely. Include retry/visibility/lease semantics as supported by
the queue implementation.

### potential_matches

-   `id`
-   `lost_report_id`
-   `found_report_id`
-   `status` (for example, `POTENTIAL`, `DISMISSED`,
    `CONFIRMED_RECOVERED`; exact lifecycle to approve)
-   `ai_score` or confidence output (nullable)
-   `ai_explanation` / structured evidence (nullable)
-   `created_at`
-   `updated_at`

Add a unique constraint on the lost/found report pair so retries cannot
create duplicate matches. Ensure the pair always consists of one LOST
and one FOUND report.

### notifications

-   `id`
-   `user_id`
-   `type`
-   `payload` (minimal, safe data)
-   `read_at`
-   `created_at`
-   optional deduplication key

### conversations and messages

A conversation should have participants and a clear relationship to a
potential match if conversations are match-linked. Messages must be
persisted. Enforce participant authorization in the backend on every
read/write.

## 4. Candidate retrieval pipeline

When a report is created or materially updated:

1.  Validate and persist the report.
2.  Confirm its status is eligible for matching.
3.  Determine the opposite report type.
4.  Retrieve only active (`OPEN`) reports of that opposite type and same
    category.
5.  Apply safe temporal/location relevance rules. Do not exclude
    candidates solely because their report submission timestamp is
    earlier/later.
6.  Rank using inexpensive algorithmic techniques:
    -   PostgreSQL full-text search (`tsvector` / `tsquery`) for lexical
        relevance.
    -   `pg_trgm` for fuzzy string similarity.
    -   Token overlap / normalized keyword overlap.
    -   Optional structured attribute agreement.
    -   Optional incident-time and location relevance.
7.  Select a configurable shortlist, initially perhaps up to 12
    candidates.
8.  Enqueue one background matching job for the source report and
    shortlisted candidate IDs.
9.  Return the report submission response without waiting for Gemini.

Do not assume a single fuzzy algorithm is enough. Use explainable
signals and test against examples where descriptions use different
words.

### Recall versus precision

The prefilter should favour recall: avoid excluding a genuine candidate
too early. It is acceptable to send some extra candidates to AI; it is
not acceptable to use overly strict keyword thresholds that routinely
discard true matches.

### No candidates

If there are no eligible candidates, do not call Gemini. The report
remains open and can be considered when future opposite-type reports are
submitted.

### New reports in either order

The same process must work symmetrically: - New LOST report searches
active FOUND reports. - New FOUND report searches active LOST reports.

## 5. Background worker lifecycle

Suggested logical lifecycle:

``` text
PENDING -> PROCESSING -> COMPLETED
                    \-> RETRY_WAIT -> PROCESSING
                    \-> FAILED
```

Worker behaviour:

1.  Claim a job atomically using the queue's supported
    locking/visibility mechanism.
2.  Reload the source report and candidate reports from PostgreSQL.
3.  Re-check that source and candidates are still eligible and
    opposite-type/same-category.
4.  Remove stale candidates.
5.  If none remain, complete the job without calling Gemini.
6.  Submit the source report and candidate set to Gemini, in a batch
    where supported and within model context/output limits.
7.  Validate structured output and map each result to a candidate ID.
8.  Re-check statuses before persisting matches.
9.  Upsert potential matches using a unique report-pair key.
10. Create notifications idempotently for both students.
11. Mark the job complete.
12. Retry transient provider/network/database failures with bounded
    exponential backoff.
13. Record permanent failures for inspection; never retry indefinitely.

The worker must not assume AI output is trustworthy. Validate IDs
against the candidate list and reject unknown IDs, malformed scores and
unsupported fields.

## 6. Gemini integration

Create a provider abstraction/service so model changes do not leak
throughout the codebase.

Requirements:

-   Model identifier configured through environment.
-   API key only on the server.
-   Structured response schema.
-   Per-candidate result.
-   Clear timeout and retry policy.
-   Respect provider rate limits and token/context limits.
-   Avoid sending passwords, OTPs, email addresses or unnecessary
    personal information.
-   Use photos only when supported by the selected model and when access
    to stored image data is controlled.
-   Log request IDs and usage metadata where safe; do not log sensitive
    full payloads by default.

Do not rely on an arbitrary model-generated numeric score as a
calibrated probability. Establish thresholds through test data and
evaluation.

## 7. Search design

Search is separate from matching.

Initial implementation can use: - PostgreSQL full-text search for
keywords. - `pg_trgm` for typo-tolerant matching. - Category, report
type, status and optional location/date filters. - Pagination and stable
sorting.

Search must not call Gemini. Enforce visibility rules and never expose
private user information unnecessarily.

## 8. Messaging and real-time events

If Socket.IO is selected: - Authenticate the socket connection. -
Authorize room membership server-side. - Persist each message before
emitting delivery events. - Re-check conversation membership on every
operation. - Support reconnect and message history from PostgreSQL. - Do
not trust client-provided user IDs or room IDs without authorization.

A potential-match-linked conversation is a reasonable default proposal,
but the product owner must decide whether pre-match messaging is
allowed.

## 9. Security baseline

-   Validate all request bodies, params and query strings.
-   Hash passwords using a suitable password hashing algorithm (for
    example Argon2id or bcrypt with appropriate configuration).
-   Rate-limit registration, login, OTP verify/resend, search and
    messaging endpoints appropriately.
-   Use secure token/session handling and rotate/revoke credentials as
    designed.
-   Apply authorization at the resource level; authentication alone is
    insufficient.
-   Restrict file uploads by size, MIME type and actual file signature
    where feasible.
-   Generate storage keys server-side; do not trust client paths.
-   Keep database, Gemini, email and storage credentials in
    secrets/environment variables.
-   Configure CORS intentionally.
-   Use TLS in deployed environments.
-   Redact secrets and personal data from logs.
-   Apply least-privilege database credentials.
-   Use migrations, constraints and transactions for critical state
    changes.

## 10. Indexing considerations

Potential indexes to evaluate with actual query plans:

-   `reports(report_type, status, category_id)`
-   `reports(user_id, created_at)`
-   GIN index on generated full-text search vector.
-   GIN or GiST index for trigram search where appropriate.
-   Indexes on `potential_matches(lost_report_id, found_report_id)` and
    user-facing lookup paths.
-   Queue indexes appropriate to the selected queue.

Do not add every possible index blindly. Use
`EXPLAIN (ANALYZE, BUFFERS)` with representative data and check write
overhead.

## 11. Important invariants

-   Only verified active users can create reports or use protected
    features.
-   Every report has a category and description.
-   Mobile Phone and Laptop Charger are distinct categories.
-   Only opposite-type active reports are candidates.
-   Submission time is not a proxy for incident time.
-   AI produces potential matches, never ownership decisions.
-   AI matching is asynchronous.
-   No AI call when no candidate exists.
-   Resolved/closed reports are excluded from new matching and stale
    jobs.
-   Search does not invoke AI.
-   Duplicate jobs/retries must not create duplicate matches or
    notifications.
-   All messaging and report access is authorized server-side.
