# Product Requirements --- COMSATS Lost & Found (Phase 1)

## 1. Product overview

Build a Lost & Found application for the COMSATS University Islamabad
student community. Phase 1 is restricted to the university community; it
is not a public, multi-university platform.

The application helps students report lost items, report items they have
found, discover reports through search, receive potential-match
notifications, and communicate with other students to coordinate item
recovery.

The system identifies **potential matches only**. It must never
independently decide or assert who owns an item.

## 2. Phase 1 scope

### In scope

-   Student registration using an eligible university student email
    address.
-   Password creation and email OTP verification.
-   Account activation only after successful email verification.
-   Lost-item reports.
-   Found-item reports.
-   Mandatory category and description for every report.
-   Optional item photograph; a report may contain a description only, a
    photograph plus description, or (subject to the mandatory
    description rule) a description with no photo.
-   Candidate filtering using database queries and non-AI text
    algorithms.
-   Asynchronous AI-assisted comparison of shortlisted candidates.
-   Notifications to both report owners when a potential match is
    identified.
-   Student search across lost and found reports using keywords and
    filters.
-   In-app communication between students.
-   Report status management so inactive/resolved reports are excluded
    from future matching.

### Out of scope unless separately approved

-   Support for other universities.
-   Public/anonymous reporting.
-   Automatic ownership determination.
-   Payments, rewards or delivery services.
-   A separate microservices architecture.
-   A dedicated search engine or separate vector database for the
    initial release.
-   Any feature not supported by the product owner or this requirements
    document.

## 3. User and access model

### Student

A student with a verified eligible university email can:

-   Register and verify their email.
-   Sign in and manage their account.
-   Create lost and found reports.
-   Edit or close their own reports, subject to application rules.
-   Search reports.
-   View potential matches they are authorized to see.
-   Receive notifications.
-   Communicate through the in-app communication feature.

### University email restriction

Registration must be restricted to the approved COMSATS student email
domain/pattern.

An example address supplied during planning is:

`SP23-BSE-011@ISBSTUDENT.COMSATS.EDU.PK`

The implementation must validate the approved domain suffix
case-insensitively. Do not hardcode the example roll number as the only
permitted account.

The exact authoritative email-domain policy should be confirmed against
the university's current student email system before production
deployment. Do not assume that staff, alumni or other campus domains are
eligible.

## 4. Authentication and account activation

1.  Student enters their university email address and chooses a
    password.
2.  Backend validates the email domain and registration input.
3.  Backend securely stores a password hash; never store plaintext
    passwords.
4.  Backend creates an unverified/pending account.
5.  Backend generates and emails a time-limited OTP.
6.  Student submits the OTP.
7.  Backend verifies it securely and activates the account.
8.  Unverified accounts must not be able to use protected application
    features.

Security requirements:

-   OTPs must be cryptographically unpredictable.
-   Store OTPs as hashes where practical; never log raw OTPs.
-   Enforce expiry, attempt limits, resend cooldowns and rate limits.
-   Invalidate an OTP after successful use.
-   Avoid account-enumeration leaks in registration and resend
    responses.
-   Do not activate an account merely because an OTP email was sent.
-   Use a configurable email delivery provider; credentials belong in
    environment variables/secrets.

The exact OTP length, expiry duration, resend interval, password policy,
token/session strategy and email provider remain implementation
decisions. The agent should propose sensible secure defaults and
document them before implementation.

## 5. Reports

There are two report types:

-   `LOST`
-   `FOUND`

Every report must include:

-   Report type.
-   Category (mandatory).
-   Description (mandatory).

A photograph is optional. The user can submit a report with a
description only or with a photograph and description. The product owner
has explicitly stated that a description is mandatory, so photo-only
reports are not permitted unless this requirement is changed.

Recommended additional fields:

-   Location where the item was lost/found (optional initially unless
    the product owner approves making it mandatory).
-   Actual/estimated incident date and time, or an uncertainty range.
-   Created/submitted timestamp generated by the server.
-   Status.
-   Owner/user ID.

### Report lifecycle

Use explicit, documented states. Suggested initial states:

-   `OPEN` --- active report eligible for matching.
-   `RESOLVED` --- item has been recovered / report resolved; excluded
    from matching.
-   `CLOSED` --- report withdrawn or otherwise inactive; excluded from
    matching.

A potential match is a separate relationship/record. Do not
automatically mark a report resolved merely because a potential match
exists.

The agent may propose additional states (for example, `UNDER_REVIEW`)
but must explain why and keep lifecycle transitions explicit.

### Incident time versus submission time

Store submission time separately from the time the item was actually
lost/found.

-   `created_at`: when the report was submitted.
-   `incident_at` or an incident time range: when the student believes
    the item was lost/found.

Do not use `created_at` as a strict temporal exclusion rule. Example: an
item may be found at 12:00 PM, while its owner only submits a lost
report at 1:00 PM even though the item was lost at 11:30 AM. Those
reports must remain eligible for comparison.

When incident time is unknown or approximate, represent uncertainty
rather than inventing a precise timestamp. Temporal proximity should
generally be a ranking signal, not an aggressive hard filter.

## 6. Categories

Category selection is mandatory.

The product owner explicitly requires **Mobile Phone** and **Laptop
Charger** to be separate categories. Do not place Laptop Charger under
Mobile Phone or merge it into a generic electronics category.

Initial category names should be stored in a database-managed category
table, not hardcoded into report rows or application logic. The category
list should be manageable and extensible.

Suggested initial categories (subject to product-owner review):

-   Mobile Phone
-   Laptop
-   Laptop Charger
-   Tablet / iPad
-   Headphones / Earphones
-   Smartwatch
-   Wallet / Purse
-   Keys
-   Bags / Backpacks
-   Documents / Cards
-   Books / Stationery
-   Watch
-   Clothing
-   Jewellery / Accessories
-   Water Bottle
-   Other

This is a proposed starter list, not a final approved taxonomy. The
agent must seed categories through a migration/seed process and make
them configurable. Do not add hundreds of overly specific categories
without approval.

## 7. Potential-match discovery

The matching process must work in both directions:

-   When a new `LOST` report is created, search eligible active `FOUND`
    reports in the same category.
-   When a new `FOUND` report is created, search eligible active `LOST`
    reports in the same category.

Only opposite-type reports are candidates. Exclude reports that are no
longer active/resolvable for matching, such as `RESOLVED` or `CLOSED`.

### Matching stages

1.  **Database eligibility filtering**
    -   Opposite report type.
    -   Same category.
    -   Candidate report is active (`OPEN`).
    -   Exclude the same user's own report if product rules require
        this.
    -   Apply only safe, explainable constraints.
2.  **Temporal relevance**
    -   Use actual/estimated incident time, not report submission time,
        as the temporal signal.
    -   Avoid strict filtering that misses reports submitted later than
        the other report.
    -   Treat unknown or approximate incident times carefully.
3.  **Algorithmic candidate ranking**
    -   Use non-generative, inexpensive techniques before invoking an AI
        model.
    -   Consider PostgreSQL full-text search, `pg_trgm` trigram
        similarity, normalized tokens and attribute/keyword overlap.
    -   Do not assume exact wording is required.
    -   Keep candidate retrieval permissive enough to preserve recall; a
        genuine match should not be discarded solely because two
        students used different wording.
    -   Candidate count (for example, an initial maximum of 12) is a
        configurable tuning parameter, not a permanent product
        guarantee.
4.  **Asynchronous AI evaluation**
    -   Enqueue a background job for the newly created/updated report
        and its shortlisted candidate IDs.
    -   The API must not wait for the AI comparison to finish.
    -   A worker processes the job later, optionally evaluating multiple
        candidates in one model request where model limits and output
        reliability permit.
    -   AI evaluates whether each pair plausibly describes the same
        physical item.
    -   AI output is evidence for a potential match, not proof of
        ownership.
5.  **Potential match persistence and notifications**
    -   Persist qualifying potential matches.
    -   Notify both involved students.
    -   Prevent duplicate match records and duplicate notifications.
    -   If no candidate qualifies, do not create a potential match or
        send a match notification.

### AI input and output

AI may receive available report data, including:

-   Category.
-   Lost description.
-   Found description.
-   Photo(s), if present and permitted by the model/provider.
-   Extracted or normalized attributes.
-   Incident time and location context, when available.

AI should return structured data per candidate, such as:

-   Candidate report ID.
-   `potential_match` boolean.
-   Confidence or calibrated score (clearly treated as model output, not
    a factual probability unless calibrated).
-   Supporting similarities.
-   Conflicting details.
-   Short explanation.

Validate model output against a strict schema. Handle malformed,
incomplete, timed-out or refused responses safely.

Do not expose provider API keys to the mobile client. Do not send
unnecessary personal data to the model.

## 8. Background processing

Matching is a background task. The product does not require instant AI
results.

Use a reliable PostgreSQL-backed queue or another justified queue
mechanism. The initial architecture should remain simple; do not
introduce microservices solely for this feature.

A job should normally represent one newly created/updated report and
contain its shortlisted candidate report IDs, rather than creating an
unrelated job per candidate without a reason.

Required operational behaviour:

-   Pending, processing, completed and failed job states (or equivalent
    queue states).
-   Controlled worker concurrency and processing rate.
-   Retry transient failures with bounded attempts and backoff.
-   Preserve failed jobs for inspection/retry (dead-letter or failed
    state).
-   Idempotent processing: retries must not create duplicate matches or
    notifications.
-   Re-check report statuses immediately before AI processing and before
    persisting matches/notifying.
-   Ignore or safely cancel stale jobs if the source report or candidate
    is no longer eligible.
-   Log job IDs and safe diagnostic metadata, never secrets or raw OTPs.
-   Provide observability for queue depth, failures and processing
    duration.

Initial worker interval, concurrency, retry count, batch size and
candidate limit must be configurable and tuned after testing. Do not
hardcode assumptions that the system must run every two minutes or use
exactly one worker.

## 9. Student search

Students must be able to search lost and found reports independently of
automatic matching.

Search should support:

-   Keyword query.
-   Lost / Found filter.
-   Category filter.
-   Status filter (only show statuses appropriate for discovery).
-   Optional location and date filters if those fields are implemented.

Use PostgreSQL search capabilities initially. Search requests must not
trigger Gemini calls. Search results should enforce authorization and
privacy rules.

## 10. In-app communication

The application must provide a communication channel through which
students can communicate.

A reasonable initial design is a conversation associated with a
potential-match record, with access limited to the two involved
students. However, whether students can message each other before a
potential match, and whether conversations are strictly match-linked,
remains a product decision to confirm.

If real-time messaging is implemented, Socket.IO is a candidate
technology. Persist messages in PostgreSQL; a WebSocket event alone is
not durable storage.

Security and privacy requirements:

-   Only conversation participants can read or send messages.
-   Validate report/match/conversation access on the server.
-   Do not expose private contact details by default.
-   Apply input validation, rate limiting and abuse controls.
-   Define message retention and reporting/moderation policy before
    production.

## 11. Notifications

Notify both students when a potential match is created.

Notification channels may include in-app notifications and push
notifications. Email notifications may be considered separately.

Notifications should be persisted so users can see them even if offline.
Delivery must be idempotent and should not happen for stale or duplicate
matches.

## 12. Non-functional requirements

-   Secure password and OTP handling.
-   Server-side authorization for every protected resource.
-   Input validation and safe error handling.
-   Database constraints and indexes for correctness and performance.
-   No secrets in source control or mobile bundles.
-   Structured logs with sensitive-data redaction.
-   Automated tests for authentication, report lifecycle, candidate
    retrieval, queue retries, matching and authorization.
-   Database migrations and reproducible seed data.
-   Clear setup instructions and `.env.example` with placeholders only.
-   No fake in-memory arrays as a substitute for persistence in core
    functionality.
