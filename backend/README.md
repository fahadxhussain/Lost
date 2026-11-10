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
Ensure `DATABASE_URL` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://fahadxhussain@localhost:5432/comsats_lost_found?schema=public"
```

### 3. Run Migrations & Seed
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
API server will start on port `5000` with WebSocket support.

### 5. Run the Background AI Matching Worker
```bash
npm run worker
```

### 6. Run Integration Test Suite
```bash
npm test
```

---

## Complete API Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register with COMSATS email (`@*.comsats.edu.pk`) & dispatches OTP | No |
| `POST` | `/api/v1/auth/verify-otp` | Validates 6-digit OTP code & activates account | No |
| `POST` | `/api/v1/auth/resend-otp` | Resends fresh OTP to student email | No |
| `POST` | `/api/v1/auth/login` | Authenticates verified student, returns JWT | No |
| `GET` | `/api/v1/auth/me` | Returns current authenticated student profile | Yes |

### Categories (`/api/v1/categories`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/categories` | Returns all 11 university categories (Mobile & Charger distinct) | No |

### Reports (`/api/v1/reports`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/reports` | Create report (LOST/FOUND, mandatory category & description, optional image) | Yes |
| `GET` | `/api/v1/reports` | Feed listing with filters (`type`, `categoryId`, `page`, `limit`) | No |
| `GET` | `/api/v1/reports/me` | List reports submitted by the logged-in student | Yes |
| `GET` | `/api/v1/reports/:id` | Get report details by ID | No |
| `PATCH` | `/api/v1/reports/:id` | Update report title, description, or image (owner only) | Yes |
| `PATCH` | `/api/v1/reports/:id/status`| Update status (`ACTIVE`, `RESOLVED`, `CLOSED`) (owner only) | Yes |
| `GET` | `/api/v1/reports/:id/matches`| Retrieve potential matches evaluated by Gemini with AI reasoning | Yes |

### Search (`/api/v1/search` or `/api/v1/reports/search`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/search` | Fast PostgreSQL trigram (`pg_trgm`) & full-text search with typo tolerance | No |

### Notifications (`/api/v1/notifications`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | List user notifications (unread first) | Yes |
| `GET` | `/api/v1/notifications/unread-count` | Get total unread notifications count | Yes |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark specific notification as read | Yes |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all user notifications as read | Yes |

### Messaging (`/api/v1/conversations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/conversations` | List user's conversations with latest message | Yes |
| `POST` | `/api/v1/conversations` | Create or get existing conversation with another student | Yes |
| `GET` | `/api/v1/conversations/:id/messages` | Get messages in conversation (auto-marks read) | Yes |
| `POST` | `/api/v1/conversations/:id/messages` | Send message in conversation | Yes |

---

## Real-Time WebSocket Events (Socket.IO)

Connect with auth token in handshake:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'jwt_token_here' }
});

// Join conversation room
socket.emit('join_conversation', { conversationId: 'uuid' });

// Listen for incoming messages
socket.on('new_message', (message) => {
  console.log('New message received:', message);
});

// Send message via socket
socket.emit('send_message', { conversationId: 'uuid', content: 'Hello!' }, (response) => {
  console.log('Server response:', response);
});

// Typing indicator
socket.emit('typing', { conversationId: 'uuid', isTyping: true });
socket.on('user_typing', ({ userId, isTyping }) => { ... });
```

---

## Modules Directory

```text
src/
├── config/             # Config loader with environment validation
├── middleware/         # Auth, validation, error handler
├── modules/
│   ├── auth/           # COMSATS email OTP, JWT, registration
│   ├── categories/     # Category listings (distinct Mobile & Charger)
│   ├── reports/        # Lost and Found CRUD & image upload
│   ├── search/         # Pure PostgreSQL-based keyword & category search
│   ├── matching/       # Candidate retrieval & job queueing
│   ├── notifications/  # Match & status notifications
│   └── messaging/      # Threaded conversations between students
├── services/
│   ├── ai/             # Gemini API client & structured prompts
│   ├── email/          # OTP delivery (console logger / SMTP)
│   └── storage/        # Multer image upload handling
├── workers/
│   └── matchingWorker.js # Asynchronous queue processor
└── shared/             # Custom errors, logger, utilities
```

Refer to [`WORK-DIVISION.md`](../WORK-DIVISION.md) and [`AGENTS.md`](../AGENTS.md) for collaboration details.
