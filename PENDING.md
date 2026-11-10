# Pending Decisions & Implementation Backlog

This document tracks items that require confirmation, unresolved architecture points, and the current task checklist.

---

## 1. Unresolved Architecture Points (from ADR-015)

1. **Email Delivery Provider for Production:**
   - *Current Implementation:* Fallback to local console logger in development + configurable SMTP/Nodemailer.
   - *Pending:* Confirm if COMSATS IT SMTP, Resend, or SendGrid credentials will be used in production.
2. **Object / Image Storage Provider:**
   - *Current Implementation:* Cloudinary object storage (`cloudinary`) with automatic WebP compression, CDN distribution, and local disk fallback.
   - *Status:* **Resolved** (Cloudinary connected & verified).
3. **Queue Provider:**
   - *Current Implementation:* Robust database-backed job queue table (`MatchingJob`) using row locking (`FOR UPDATE SKIP LOCKED`), retries, and backoff. Zero external broker dependency.
   - *Pending:* Confirm if migration to Supabase `pgmq` or Redis BullMQ is needed when scale demands.
4. **Chat Access Rules:**
   - *Default:* Conversations are linked either to an acknowledged potential match or directly to a report item between two verified students.
   - *Pending:* Confirm if any verified student can message on a public active report, or if a mutual match is required first.

---

## 2. Phase-by-Phase Checklist

- [x] **Phase 0: Repository Audit & Planning**
  - [x] Documentation organized into `docs/`
  - [x] Baseline git repository initialized
  - [x] Architectural definitions established in `ARCHITECTURE.md`
  - [x] Decisions and unknowns documented in `PENDING.md`
- [x] **Phase 1: Database Foundation & Categories**
  - [x] Initialize `backend/` Node.js modular architecture
  - [x] Configure Prisma schema with models, constraints, and indexes
  - [x] Seed script with approved categories (distinct "Mobile Phone" and "Laptop Charger")
  - [x] Verification tests for schema and seed idempotency
- [x] **Phase 2: Authentication & University Email OTP**
  - [x] Domain validation (`@*.comsats.edu.pk` and `@isbstudent.comsats.edu.pk`)
  - [x] Argon2/Bcrypt password hashing & OTP generation
  - [x] Gating unverified accounts from protected endpoints
  - [x] JWT authentication and session handling
- [x] **Phase 3: Report Management & Image Handling**
  - [x] Create, update, view, and close LOST and FOUND reports
  - [x] Mandatory category and description validation
  - [x] Optional image upload and safe file handling
- [x] **Phase 4: Student Search**
  - [x] PostgreSQL full-text and trigram search across reports
  - [x] Category, type, date, and location filtering (no Gemini calls)
- [x] **Phase 5: Candidate Retrieval Algorithms**
  - [x] Opposite-type candidate retrieval with temporal and category matching
  - [x] Lexical token-overlap and trigram ranking
- [x] **Phase 6: Async Queue & Gemini Evaluation**
  - [x] Background matching worker process
  - [x] Gemini API client with structured schema responses & Multimodal Image inspection
  - [x] Live Google Gemini 3.5 Flash Lite integrated with fallback
  - [x] Notification generation for both report owners
- [x] **Phase 7: In-App Messaging & Notifications**
  - [x] Conversation threads and message persistence
  - [x] Unread notification counts and delivery
  - [x] Real-time Socket.IO events and room joins
- [x] **Phase 8: Campus Demo Dataset & Multimodal Verification**
  - [x] Rich COMSATS demo seeder (`npm run prisma:seed:demo`) with 5 students, 8 reports, and sample chat
  - [x] Multimodal image comparison using inline base64 image parts with Gemini vision
