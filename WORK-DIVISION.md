# Team Work Division & Parallel Development Roadmap

## COMSATS Lost & Found (FYP)

To enable you and your teammate to work concurrently without blocking each other, the project is split into two primary streams:
- **Teammate 1: Backend, Database & AI Pipeline Lead**
- **Teammate 2: Frontend & Mobile UI/UX Lead (React Native / Expo)**

This document establishes the **work division**, **milestones**, **API contracts**, and **mocking guidelines** so frontend and backend work can progress simultaneously.

---

## 1. Role Responsibilities Overview

```text
+-----------------------------------------------------------------------------------+
|                            COMSATS LOST & FOUND FYP                               |
+-----------------------------------------+-----------------------------------------+
|     TEAMMATE 1: Backend & AI Lead       |     TEAMMATE 2: Frontend & Mobile Lead  |
+-----------------------------------------+-----------------------------------------+
| • PostgreSQL schema & migrations        | • Expo / React Native project setup     |
| • Express.js modular REST API           | • Design system, navigation & themes    |
| • COMSATS email OTP verification        | • Auth screens (Login, Register, OTP)   |
| • Report CRUD & image handling          | • Report creation & image picker forms  |
| • DB full-text / trigram search         | • Feed, search & filter screens         |
| • Candidate retrieval algorithm         | • Potential match alert UI & cards      |
| • Async worker & Gemini API pipeline    | • Real-time chat & notification screen  |
| • Security, validation & test suites    | • API client integration & state mgmt   |
+-----------------------------------------+-----------------------------------------+
```

---

## 2. Phased Simultaneous Milestones

### Milestone 1: Foundations & Auth Flow
| Week / Sprint | Teammate 1 (Backend) | Teammate 2 (Frontend) |
|---|---|---|
| **Phase 1A** | Initialize Express modular structure, Prisma ORM, PostgreSQL connection, DB migrations. | Initialize Expo React Native app with TypeScript/JS, React Navigation (stack + tabs). |
| **Phase 1B** | Implement Registration endpoint (`@*.comsats.edu.pk` validation), OTP generation/hashing, and email service mock/sender. | Build Auth UI: Welcome, Register, OTP Verification, and Login screens with form validation. |
| **Phase 1C** | Implement Login endpoint, JWT token generation, auth middleware (`authenticate`, `requireActiveStudent`). | Setup Auth State management (Zustand / Context), secure storage of JWT token, and Axios/Fetch client with interceptors. |
| **Sync Check 1** | **Joint Testing:** Test end-to-end registration with a COMSATS email, receive OTP, verify, and log into the mobile app. |

---

### Milestone 2: Categories, Reports & Image Upload
| Week / Sprint | Teammate 1 (Backend) | Teammate 2 (Frontend) |
|---|---|---|
| **Phase 2A** | Seed category taxonomy (ensuring "Mobile Phone" and "Laptop Charger" are separate). Expose `GET /api/v1/categories`. | Build Category selection UI (grid or bottom sheet) and Home Feed tabs (Lost vs. Found). |
| **Phase 2B** | Implement `POST /api/v1/reports` (validate mandatory category + description, optional image upload) and `GET /api/v1/reports`. | Build "Create Report" form with category dropdown, title, description, incident date/location picker, and Expo ImagePicker. |
| **Phase 2C** | Implement report detail `GET /api/v1/reports/:id`, update, and close/resolve endpoints with ownership checks. | Build Report Details screen, My Reports list, and status update actions (mark as resolved/closed). |
| **Sync Check 2** | **Joint Testing:** Create LOST and FOUND reports from mobile with/without images, verify status updates and feeds. |

---

### Milestone 3: Search & Candidate Shortlisting
| Week / Sprint | Teammate 1 (Backend) | Teammate 2 (Frontend) |
|---|---|---|
| **Phase 3A** | Implement DB Search endpoint `GET /api/v1/reports/search` with keyword (`pg_trgm`/full-text), category, and type filters. | Build Search UI: Search bar, active filter chips (Category, Lost/Found, Date), and search results list. |
| **Phase 3B** | Implement Candidate Retrieval algorithm: querying opposite-type active reports in the same category with text scoring. | Design and implement "Potential Matches" tab / screen showing shortlisted cards with match indicators. |
| **Sync Check 3** | **Joint Testing:** Search reports using keywords and typos; verify search does not call Gemini and returns fast, filtered results. |

---

### Milestone 4: Async Gemini Worker & Match Notifications
| Week / Sprint | Teammate 1 (Backend) | Teammate 2 (Frontend) |
|---|---|---|
| **Phase 4A** | Set up background queue table (`MatchingJob`) with row locking (`FOR UPDATE SKIP LOCKED`) and worker process. | Build Notification Center UI showing match alerts with read/unread indicators. |
| **Phase 4B** | Integrate Google Gemini API service (structured JSON output for match score 0-1 and explanatory rationale). | Build "Match Detail Modal" showing AI confidence, reasoning summary, side-by-side comparison, and "Contact Finder/Owner" button. |
| **Phase 4C** | Persist `PotentialMatch` records and trigger notifications for both report owners. | Hook up push/polling notifications to refresh match status when a new report is processed. |
| **Sync Check 4** | **Joint Testing:** Submit matching reports; verify worker triggers Gemini asynchronously and both devices receive match alerts. |

---

### Milestone 5: In-App Messaging & Final Polish
| Week / Sprint | Teammate 1 (Backend) | Teammate 2 (Frontend) |
|---|---|---|
| **Phase 5A** | Implement messaging schema: conversations, messages, read receipts, and access control. | Build Chat screen (GiftedChat or custom) and Conversations list. |
| **Phase 5B** | Real-time transport (Socket.IO or SSE) for instant message delivery between verified students. | Connect mobile chat client to real-time events with auto-scroll and send status. |
| **Phase 5C** | Security audit, rate limiting, edge-case unit/integration tests. | UI polish, loading states, offline notice, error handling, final demo preparations. |
| **Sync Check 5** | **Joint Testing:** Full end-to-end demo rehearsal from registration to recovery coordination. |

---

## 3. Strict API Contracts (Interface Agreement)

To ensure Teammate 2 can build screens with mock data while Teammate 1 writes endpoints, both agree to follow these exact payload formats:

### Auth Endpoints
```text
POST /api/v1/auth/register
Body: { "email": "sp23-bse-011@isbstudent.comsats.edu.pk", "password": "SecurePassword123!", "name": "Fahad Hussain" }
Response (201): { "status": "success", "message": "Verification OTP sent to your university email", "userId": "uuid" }

POST /api/v1/auth/verify-otp
Body: { "userId": "uuid", "otp": "123456" }
Response (200): { "status": "success", "message": "Account activated successfully" }

POST /api/v1/auth/login
Body: { "email": "sp23-bse-011@isbstudent.comsats.edu.pk", "password": "SecurePassword123!" }
Response (200): { "status": "success", "token": "jwt_token_string", "user": { "id": "uuid", "email": "...", "name": "..." } }
```

### Report Endpoints
```text
GET /api/v1/categories
Response (200): {
  "status": "success",
  "data": [
    { "id": "1", "name": "Mobile Phone", "slug": "mobile-phone" },
    { "id": "2", "name": "Laptop Charger", "slug": "laptop-charger" },
    { "id": "3", "name": "Student ID Card", "slug": "student-id-card" }
  ]
}

POST /api/v1/reports (multipart/form-data or JSON)
Fields:
  type: "LOST" | "FOUND" (required)
  categoryId: string (required)
  title: string (required)
  description: string (required)
  incidentLocation: string (optional)
  incidentDate: ISO date string (optional)
  image: File (optional)
Response (201): { "status": "success", "data": { "id": "report-uuid", ... } }
```

### Potential Matches Endpoint
```text
GET /api/v1/reports/:id/matches
Response (200): {
  "status": "success",
  "data": [
    {
      "matchId": "uuid",
      "score": 0.88,
      "aiReasoning": "Both describe a black 65W Dell Type-C laptop charger found in CS Block Lab 3.",
      "candidateReport": {
        "id": "other-report-uuid",
        "type": "FOUND",
        "title": "Dell Type-C Charger",
        "description": "Found a 65W Dell black charger on table 4",
        "imageUrl": "https://...",
        "incidentLocation": "CS Block Lab 3",
        "incidentDate": "2026-11-10T10:00:00Z",
        "owner": { "id": "user-uuid", "name": "Ali" }
      }
    }
  ]
}
```

---

## 4. Git Collaboration Workflow

To keep the codebase clean and avoid merge conflicts:

1. **Main Branch Protection:** `main` is always working and deployable.
2. **Branch Naming:**
   - Teammate 1 (Backend): `feature/backend-auth`, `feature/backend-reports`, `feature/gemini-worker`
   - Teammate 2 (Frontend): `feature/ui-auth`, `feature/ui-reports`, `feature/ui-chat`
3. **Folder Isolation:**
   - Teammate 1 works predominantly inside the `backend/` folder.
   - Teammate 2 works predominantly inside the `frontend/` folder.
   - Root changes (`package.json`, `README.md`, docs) should be coordinated.
4. **Environment Variables:**
   - Maintain `.env.example` inside `backend/` and `frontend/`.
   - Never commit actual `.env` files with secret keys.
