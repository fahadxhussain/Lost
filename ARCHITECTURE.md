# COMSATS Lost & Found --- Architecture Overview

## 1. System Overview

COMSATS Lost & Found is a community-exclusive platform serving COMSATS University Islamabad students. The system enables students to report lost or found items, search records, receive automated potential-match suggestions, and communicate safely to facilitate item recovery.

```text
+-----------------------------------------------------------+
|              React Native / Expo Mobile App               |
+-----------------------------------------------------------+
                             |
                             | HTTPS / REST & WebSocket
                             v
+-----------------------------------------------------------+
|               Node.js + Express Modular Monolith          |
|                                                           |
|  +----------------+  +----------------+  +-------------+  |
|  | Authentication |  | Users & Profile|  | Categories  |  |
|  +----------------+  +----------------+  +-------------+  |
|  | Reports (CRUD) |  | DB Search (SQL)|  | Messaging   |  |
|  +----------------+  +----------------+  +-------------+  |
|  | Matching Orchestrator              |  |Notifications|  |
|  +------------------------------------+--+-------------+  |
+-----------------------------------------------------------+
          |                                  |
          | Persistent Storage               | Job Queue
          v                                  v
+-----------------------+          +-------------------------+
|      PostgreSQL       |<---------| Matching Worker Process |
|  - Relational Schema  |          | - Shortlist Retrieval   |
|  - pg_trgm & Text FTS |          | - Gemini API Client     |
|  - Queue Storage      |          | - Match Scoring & Alert |
+-----------------------+          +-------------------------+
                                                 |
                                                 v
                                   +-------------------------+
                                   | Google Gemini API       |
                                   | (Multimodal Evaluation) |
                                   +-------------------------+
```

---

## 2. Core Architectural Principles & Invariants

1. **COMSATS Islamabad Exclusivity:** Registration requires a verified university email matching the approved domain pattern (e.g., `*.comsats.edu.pk` / `isbstudent.comsats.edu.pk`). Unverified accounts are strictly gated from reporting, searching, or messaging.
2. **Two-Stage Matching Pipeline:**
   - **Stage 1 (Algorithmic DB Filter):** High-recall, low-cost search on opposite report types (`LOST` searches `FOUND`; `FOUND` searches `LOST`) using category match and PostgreSQL text matching (`pg_trgm` / tsvector). **Never calls Gemini.**
   - **Stage 2 (Asynchronous Worker + Gemini):** Background worker pulls candidate pairs and queries Google Gemini with structured prompts (incorporating images if present).
3. **Decoupled Incident Time vs. Submission Time:** Candidates are never disqualified simply because the lost report was submitted chronologically later than the found report.
4. **Advisory AI Only:** AI scores potential match confidence (0.0 to 1.0) and generates an explanatory rationale. It **never** decides ownership or automatically closes reports.
5. **Mandatory Category & Description:** Every report must have an approved category and text description. Photos are optional. Photo-only submissions are prohibited.
6. **Distinct Categories:** "Mobile Phone" and "Laptop Charger" are distinct top-level categories.

---

## 3. Modular Monolith Directory Structure (`backend/`)

```text
backend/
├── prisma/
│   ├── schema.prisma       # Data model, indexes, and relations
│   └── seed.js             # Repeatable category and test seed
├── src/
│   ├── app.js              # Express app setup and middleware
│   ├── server.js           # Server bootstrap & graceful shutdown
│   ├── config/             # Environment, constants, email & AI config
│   ├── middleware/         # Auth, validation, error handler, rate limit
│   ├── modules/
│   │   ├── auth/           # Registration, OTP verification, JWT login
│   │   ├── users/          # Profile retrieval and management
│   │   ├── categories/     # Read-only and admin category listings
│   │   ├── reports/        # Report creation, updates, status transitions
│   │   ├── search/         # PostgreSQL-based keyword and category search
│   │   ├── matching/       # Candidate shortlist generation & queueing
│   │   ├── notifications/  # Match alerts and unread counts
│   │   └── messaging/      # Threaded conversations between users
│   ├── services/
│   │   ├── ai/             # Gemini client abstraction & prompt builder
│   │   ├── email/          # OTP email delivery (console / SMTP / provider)
│   │   └── storage/        # Image upload & URL generation
│   ├── workers/
│   │   └── matchingWorker.js # Asynchronous worker processing candidate pairs
│   └── shared/
│       ├── errors/         # Application error classes (NotFound, Forbidden)
│       ├── utils/          # Normalizers, regex, token generators
│       └── logger/         # Structured logger
└── tests/                  # Integration & unit test suites
```

---

## 4. Key Data Models

- **User**: id, email, password_hash, status (PENDING_VERIFICATION, ACTIVE, SUSPENDED), email_verified_at, created_at, updated_at.
- **EmailVerificationOtp**: id, user_id, otp_hash, expires_at, attempt_count, consumed_at, created_at.
- **Category**: id, name, slug, icon, created_at. (Mobile Phone and Laptop Charger distinct).
- **Report**: id, user_id, type (LOST, FOUND), category_id, title, description, image_url, incident_location, incident_date, status (ACTIVE, RESOLVED, CLOSED), created_at, updated_at.
- **PotentialMatch**: id, lost_report_id, found_report_id, score, ai_reasoning, status (PENDING, CONFIRMED, DISMISSED), created_at.
- **MatchingJob**: id, source_report_id, status (QUEUED, PROCESSING, COMPLETED, FAILED), attempts, error_message, created_at, updated_at.
- **Conversation & Message**: Threaded messaging linked between participants or match pairs.
- **Notification**: id, user_id, type, title, body, metadata, is_read, created_at.
