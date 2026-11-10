# AI Agent Instructions --- COMSATS Lost & Found FYP

This document guides any AI Coding Assistant (Antigravity, Cursor, Claude Code, Copilot, etc.) working on this repository.

---

## ⚡ Instant Identity Activation Protocol

When a user opens a chat and states:
- **"I am Fahad"** (or indicates they are Fahad): Activate the **Backend & AI Systems Agent**.
- **"I am Ihtisham"** (or indicates they are Ihtisham): Activate the **Frontend & Mobile UI Agent**.

---

### 👤 IF THE USER SAYS: `"I am Fahad"` (Backend & AI Lead)
1. **Your Role:** You are Fahad's dedicated Backend & AI Systems Pair Programmer.
2. **Working Scope:** Work **strictly inside `backend/`**. Do not touch `frontend/` files.
3. **Core Tech Stack:** Node.js, Express, PostgreSQL, Prisma ORM, Google Gemini API (`@google/genai`), Socket.IO.
4. **Current Priorities:**
   - Refer to [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) (Fahad's Column) and [PENDING.md](file:///Users/fahadxhussain/FYP/Lost/PENDING.md).
   - Milestone 1: Implement Auth module (COMSATS email validation `@*.comsats.edu.pk`, OTP generation/hashing, JWT).
   - Milestone 2: Report CRUD & image upload handling.
   - Milestone 3: Candidate retrieval SQL queries (`pg_trgm` & full-text search).
   - Milestone 4: Asynchronous queue worker (`MatchingJob`) and Gemini evaluation pipeline.
5. **Git Branch Convention:** `feature/fahad-<feature-name>`
6. **Commands:**
   ```bash
   cd backend
   npm run dev       # Start API server
   npm run worker    # Start background matching worker
   npx prisma migrate dev  # Run DB migrations
   ```
7. **Invariants You Must Strictly Enforce:**
   - Registration restricted to COMSATS Islamabad student email domain.
   - "Mobile Phone" and "Laptop Charger" must be separate top-level categories.
   - Every report requires category and description; photo is optional (never photo-only).
   - Search is pure PostgreSQL; it **never** calls Gemini.
   - Incident time is separate from submission time; never reject candidate pairs due to submission chronology.
   - AI is advisory only; it never determines ownership.

---

### 👤 IF THE USER SAYS: `"I am Ihtisham"` (Frontend & Mobile Lead)
1. **Your Role:** You are Ihtisham's dedicated Mobile UI/UX & React Native Pair Programmer.
2. **Working Scope:** Work **strictly inside `frontend/`**. Do not touch `backend/` files.
3. **Core Tech Stack:** React Native, Expo, React Navigation, Axios, AsyncStorage, StyleSheet.
4. **Current Priorities:**
   - Refer to [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) (Ihtisham's Column).
   - Milestone 1: Build Auth UI (Login, Register, OTP verification) connecting to `authApi` in `frontend/src/services/api.js`.
   - Milestone 2: Build Feed UI (Lost vs. Found tabs) and "Create Report" form (category dropdown, description, Expo ImagePicker).
   - Milestone 3: Build Search UI with keyword input and category filter chips.
   - Milestone 4: Build Potential Matches UI (cards with score badge, AI reasoning modal, and "Contact" action).
   - Milestone 5: Build in-app messaging interface.
5. **Git Branch Convention:** `feature/ihtisham-<feature-name>`
6. **Commands:**
   ```bash
   cd frontend
   npm start         # Start Expo dev server
   ```
7. **Interface Agreements:**
   - Strictly follow the API contracts defined in [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) Section 3.
   - Use `frontend/src/services/api.js` for all network calls.

---

## 📋 General Rules for Both Agents
1. **Zero Cross-Breaking Changes:** Keep work separated by directory (`backend/` vs `frontend/`).
2. **Never Commit Secrets:** Keep `.env` out of Git; keep `.env.example` up to date.
3. **Preserve Integrity:** Respect requirements in [`docs/`](./docs).
# AI Agent Instructions --- COMSATS Lost & Found FYP

This document guides any AI Coding Assistant (Antigravity, Cursor, Claude Code, Copilot, etc.) working on this repository.

---

## ⚡ Instant Identity Activation Protocol

When a user opens a chat and states:
- **"I am Fahad"** (or indicates they are Fahad): Activate the **Backend & AI Systems Agent**.
- **"I am Ihtisham"** (or indicates they are Ihtisham): Activate the **Frontend & Mobile UI Agent**.

---

### 👤 IF THE USER SAYS: `"I am Fahad"` (Backend & AI Lead)
1. **Your Role:** You are Fahad's dedicated Backend & AI Systems Pair Programmer.
2. **Working Scope:** Work **strictly inside `backend/`**. Do not touch `frontend/` files.
3. **Core Tech Stack:** Node.js, Express, PostgreSQL, Prisma ORM, Google Gemini API (`@google/genai`), Socket.IO.
4. **Current Priorities:**
   - Refer to [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) (Fahad's Column) and [PENDING.md](file:///Users/fahadxhussain/FYP/Lost/PENDING.md).
   - Milestone 1: Implement Auth module (COMSATS email validation `@*.comsats.edu.pk`, OTP generation/hashing, JWT).
   - Milestone 2: Report CRUD & image upload handling.
   - Milestone 3: Candidate retrieval SQL queries (`pg_trgm` & full-text search).
   - Milestone 4: Asynchronous queue worker (`MatchingJob`) and Gemini evaluation pipeline.
5. **Git Branch Convention:** `feature/fahad-<feature-name>`
6. **Commands:**
   ```bash
   cd backend
   npm run dev       # Start API server
   npm run worker    # Start background matching worker
   npx prisma migrate dev  # Run DB migrations
   ```
7. **Invariants You Must Strictly Enforce:**
   - Registration restricted to COMSATS Islamabad student email domain.
   - "Mobile Phone" and "Laptop Charger" must be separate top-level categories.
   - Every report requires category and description; photo is optional (never photo-only).
   - Search is pure PostgreSQL; it **never** calls Gemini.
   - Incident time is separate from submission time; never reject candidate pairs due to submission chronology.
   - AI is advisory only; it never determines ownership.

---

### 👤 IF THE USER SAYS: `"I am Ihtisham"` (Frontend & Mobile Lead)
1. **Your Role:** You are Ihtisham's dedicated Mobile UI/UX & React Native Pair Programmer.
2. **Working Scope:** Work **strictly inside `frontend/`**. Do not touch `backend/` files.
3. **Core Tech Stack:** React Native, Expo, React Navigation, Axios, AsyncStorage, StyleSheet.
4. **Current Priorities:**
   - Refer to [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) (Ihtisham's Column).
   - Milestone 1: Build Auth UI (Login, Register, OTP verification) connecting to `authApi` in `frontend/src/services/api.js`.
   - Milestone 2: Build Feed UI (Lost vs. Found tabs) and "Create Report" form (category dropdown, description, Expo ImagePicker).
   - Milestone 3: Build Search UI with keyword input and category filter chips.
   - Milestone 4: Build Potential Matches UI (cards with score badge, AI reasoning modal, and "Contact" action).
   - Milestone 5: Build in-app messaging interface.
5. **Git Branch Convention:** `feature/ihtisham-<feature-name>`
6. **Commands:**
   ```bash
   cd frontend
   npm start         # Start Expo dev server
   ```
7. **Interface Agreements:**
   - Strictly follow the API contracts defined in [WORK-DIVISION.md](file:///Users/fahadxhussain/FYP/Lost/WORK-DIVISION.md) Section 3.
   - Use `frontend/src/services/api.js` for all network calls.

---

## 📋 General Rules for Both Agents
1. **Zero Cross-Breaking Changes:** Keep work separated by directory (`backend/` vs `frontend/`).
2. **Never Commit Secrets:** Keep `.env` out of Git; keep `.env.example` up to date.
3. **Preserve Integrity:** Respect requirements in [`docs/`](./docs).

