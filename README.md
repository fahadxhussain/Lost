# COMSATS University Islamabad — Lost & Found (FYP)

Full-stack Lost & Found platform built for **COMSATS University Islamabad (CUI)** students. It combines fast PostgreSQL full-text and trigram search, an asynchronous Gemini AI multimodal matching pipeline, and real-time Socket.IO student-to-student messaging inside an Expo React Native mobile app.

---

## Key Features

- **University-Gated Authentication & Account Recovery:** Registration restricted to COMSATS Islamabad email domains (`@isbstudent.comsats.edu.pk`, `@comsats.edu.pk`), 6-digit OTP verification, JWT authentication, profile updates, and password reset flow (`/reset-password`).
- **Lost & Found Report Management:** Create, browse, edit, and resolve `LOST` and `FOUND` reports with mandatory category + description, incident date validation, and optional photo uploads (local disk or Cloudinary storage).
- **11 Distinct Campus Categories:** Keeps top-level categories clearly separated (including distinct `"Mobile Phone"` and `"Laptop Charger"` categories).
- **Fast PostgreSQL Search:** Instant keyword, category, type, date, and location filtering powered by PostgreSQL full-text search and `pg_trgm` trigram similarity — zero AI calls on search.
- **Asynchronous AI Matching Worker:** Background worker (`MatchingJob` queue using `FOR UPDATE SKIP LOCKED`) retrieves opposite-type candidates and evaluates text + image evidence via Google Gemini (`gemini-3.5-flash-lite`) to surface potential match scores, reasoning, and notifications. AI is strictly advisory and never decides ownership.
- **Real-Time Messaging & Notifications:** In-app Socket.IO chat with typing indicators, read receipts, unread notification tracking, and campus analytics (`/api/v1/stats`).
- **Interactive API Docs:** OpenAPI / Swagger UI served at `/docs` and `/api-docs`, plus a Postman collection in [`docs/comsats-lost-and-found.postman_collection.json`](./docs/comsats-lost-and-found.postman_collection.json).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend API & Worker** | Node.js, Express (`4.x`), PostgreSQL, Prisma ORM (`5.x`), Socket.IO (`4.x`), Zod, JWT, Bcryptjs, Nodemailer, Multer, Cloudinary, Helmet, Express Rate Limit, Swagger UI |
| **AI Pipeline** | Google Gemini API (`gemini-3.5-flash-lite`) via async `MatchingJob` worker |
| **Mobile Frontend** | React Native (`0.88`), Expo SDK `58`, React `19`, React Navigation (`7.x`), `@shopify/flash-list`, `react-native-keyboard-controller`, `react-native-reanimated`, Axios, `socket.io-client`, AsyncStorage |
| **Testing** | Jest + Supertest (`backend`), Node test runner + `react-test-renderer` (`frontend`) |

---

## Repository Structure

```text
Lost/
├── backend/              # Express API server, Prisma schema/migrations, seeders, & matching worker
│   ├── prisma/           # schema.prisma, migrations, seed.js, seedDemo.js
│   ├── src/
│   │   ├── modules/      # analytics, auth, categories, matching, messaging, notifications, reports, search, users
│   │   ├── workers/      # matchingWorker.js (async Gemini evaluation loop)
│   │   └── docs/         # OpenAPI/Swagger spec
│   └── tests/            # Jest + Supertest integration & unit suites
├── frontend/             # Expo React Native (SDK 58) mobile application
│   ├── src/
│   │   ├── components/   # Reusable UI primitives, FloatingTabBar, keyboard helpers, touch targets
│   │   ├── navigation/   # Stack & tab navigators
│   │   ├── screens/      # Auth, Feed, Search, Report, Watchlist, Matches, Chat, Notifications, Profile
│   │   └── services/     # Axios API client (with Metro LAN IP auto-detection) & Socket.IO client
│   └── tests/            # Frontend unit & screen contract tests
├── docs/                 # Product requirements, ADRs, technical design, implementation plan, Postman collection
├── ARCHITECTURE.md       # System architecture & core design invariants
├── WORK-DIVISION.md      # Team roadmap & frontend/backend API contracts
├── PENDING.md            # Decisions log & phase checklist
├── AGENTS.md             # AI assistant instructions & repository guardrails
└── README.md             # Project overview & setup guide
```

---

## Quick Start

### Prerequisites

- **Node.js** (LTS recommended) and **npm**
- **PostgreSQL** with `pg_trgm` extension support
- *(Optional)* **Gemini API key** for AI match evaluation, **Cloudinary** credentials for cloud image uploads, and **SMTP** credentials for production OTP emails (local dev defaults to console OTP logging and local disk uploads)

### 1. Backend API & Matching Worker

```bash
cd backend
npm install
cp .env.example .env
```

Update `backend/.env` with your PostgreSQL `DATABASE_URL` (and `GEMINI_API_KEY` if running the AI worker), then initialize the database:

```bash
npx prisma migrate dev --name init
npm run prisma:seed
# Optional: seed rich campus demo data (5 students, 8 reports, sample chat)
npm run prisma:seed:demo
```

Start the API server (binds to `0.0.0.0:5000` for simulator and LAN device access) and the background matching worker in separate terminals:

```bash
npm run dev      # API + Socket.IO server on port 5000 (Swagger docs at /docs)
npm run worker   # Background MatchingJob & Gemini evaluation worker
```

Run backend tests:

```bash
npm test
```

### 2. Mobile Frontend (Expo SDK 58)

```bash
cd frontend
npm ci
cp .env.example .env
npm start
```

> **API URL Resolution:** When `EXPO_PUBLIC_API_URL` is omitted or left unset, [`frontend/src/services/api.js`](./frontend/src/services/api.js) automatically detects your machine's LAN IP from the Metro bundle URL on physical devices, and falls back to `10.0.2.2:5000` on Android emulators or `localhost:5000` elsewhere. You can also set `EXPO_PUBLIC_API_URL` explicitly in `frontend/.env`.

Run frontend tests and validation checks:

```bash
npm test
npm run check
```

---

## Design Invariants

1. **COMSATS Domain Restriction:** Registration is limited to verified COMSATS Islamabad email domains.
2. **Distinct Categories:** `"Mobile Phone"` and `"Laptop Charger"` remain separate top-level categories.
3. **Structured Reports:** Every report requires a category and description; photos are optional (photo-only submissions are rejected).
4. **Pure SQL Search:** Keyword/filter search runs strictly in PostgreSQL and never calls Gemini.
5. **Chronology Independence:** `incidentDate` is stored separately from `createdAt`; candidate retrieval never rejects pairs based on report submission order.
6. **Advisory AI Only:** Gemini provides match likelihood scores and human-readable reasoning — ownership is never decided automatically.

---

## Further Documentation

- [`backend/README.md`](./backend/README.md) — Complete REST & Socket.IO API reference
- [`frontend/README.md`](./frontend/README.md) & [`frontend/INTEGRATION.md`](./frontend/INTEGRATION.md) — Mobile setup, keyboard behavior, and integration checklist
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design and architectural boundaries
- [`WORK-DIVISION.md`](./WORK-DIVISION.md) — API contracts and parallel development milestones
- [`PENDING.md`](./PENDING.md) — Architectural decisions and phase progress
- [`docs/`](./docs/) — PRDs, ADRs, technical design, and Postman collection
