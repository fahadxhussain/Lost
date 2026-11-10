# COMSATS Lost & Found --- Backend API & Worker

Node.js + Express modular monolith with PostgreSQL, Prisma ORM, and Google Gemini AI matching pipeline.

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL database.

### 3. Run Migrations & Seed
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`. Test the health check:
```bash
curl http://localhost:5000/health
```

### 5. Run the Matching Worker (Background Process)
```bash
npm run worker
```

---

## Modules Directory

```text
src/
├── config/             # Config loader with environment validation
├── middleware/         # Auth, validation, rate limiting, error handler
├── modules/
│   ├── auth/           # COMSATS email OTP, JWT, registration
│   ├── categories/     # Category listings (distinct Mobile & Charger)
│   ├── reports/        # Lost and Found CRUD & image upload
│   ├── search/         # PostgreSQL-based keyword & category search
│   ├── matching/       # Candidate retrieval & job queueing
│   ├── notifications/  # Match & status notifications
│   └── messaging/      # Student-to-student conversations
├── services/
│   ├── ai/             # Gemini API client & structured prompts
│   ├── email/          # OTP delivery (console logger / SMTP)
│   └── storage/        # File upload handling
├── workers/
│   └── matchingWorker.js # Asynchronous queue processor
└── shared/             # Custom errors, logger, utilities
```

Refer to [`WORK-DIVISION.md`](../WORK-DIVISION.md) for milestone synchronization with the frontend lead.
