# COMSATS University Islamabad --- Lost & Found (FYP)

Official repository for the COMSATS Lost & Found final year project.

---

## Repository Structure

```text
Lost/
├── docs/                 # Original product requirements, ADRs & technical specs
├── backend/              # Node.js + Express API & asynchronous matching worker
├── frontend/             # React Native (Expo) mobile application
├── ARCHITECTURE.md       # High-level architecture & design invariants
├── WORK-DIVISION.md      # Simultaneous team roadmap & API contracts
├── AGENTS.md             # AI Agent prompt activation for Fahad & Ihtisham
├── PENDING.md            # Decisions log & implementation checklist
└── README.md             # This file
```

---

## Team Parallel Development

To work simultaneously without stepping on each other:
1. **Backend Lead:** Review and develop inside [`backend/`](./backend/README.md).
2. **Frontend Lead:** Review and develop inside [`frontend/`](./frontend/README.md).
3. **Collaboration Guide & Milestones:** Check [`WORK-DIVISION.md`](./WORK-DIVISION.md).

---

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL in .env
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm start
```
