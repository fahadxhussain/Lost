# Frontend integration notes

Implemented against backend commit `caef9c6` (pulled from `origin/main`). All implementation changes are in `frontend/`; `ui_draft/` is retained as the reference.

## UI reference

The shared theme uses the draft's navy `#0B3048`, cream `#F2F0E9`, off-white `#FFFEFA`, lime `#B9F12F`, and gray-green surfaces. Screens retain the rounded header, horizontal feed cards, segmented Lost/Found selection, category chips, photo-first form, and Feed / Watchlist / Report / My items / Profile navigation. Expiring remote draft icons are replaced with bundled vector icons. Data, names, photos, scores, and counts come from the API rather than the draft examples.

The welcome screen keeps the navy hero and email-entry layout. Password registration/login and OTP screens replace the draft's magic-link action because these are the authentication mechanisms implemented by the backend. Found reports publish directly; there is no supported private-question step.

## API coverage

All HTTP requests and Socket.IO setup are in `src/services/api.js`.

| Feature           | Current backend contract                                                                                                  | Frontend                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Registration      | `POST /auth/register` → `data.userId`                                                                                     | Student email, name, password, then OTP                                                                 |
| Verification      | `POST /auth/verify-otp` → `data.token`, `data.user`; already-active response may omit token                               | Accept session or return to login                                                                       |
| Resend            | `POST /auth/resend-otp`                                                                                                   | Resend with a local 30-second cooldown                                                                  |
| Login/session     | `POST /auth/login`, `GET /auth/me`                                                                                        | Nested `data` envelope; persisted token; active-account check on restore; 401 sign-out                  |
| Categories        | `GET /categories`                                                                                                         | Actual category IDs, including separate Mobile Phone / Laptop Charger                                   |
| Feed/search       | `GET /reports`, `GET /reports/search?query=...`                                                                           | Lost/Found, category, debounced keywords, pagination                                                    |
| Create/edit       | `POST /reports`, `PATCH /reports/:id`                                                                                     | JSON without photo, multipart `image` with photo; min. 10-character description                         |
| Report management | `GET /reports/me`, `GET /reports/:id`, `PATCH /reports/:id/status`                                                        | Own reports, details, edit, ACTIVE / RESOLVED / CLOSED with confirmation                                |
| Matching          | `GET /reports/:id/matches`                                                                                                | Score, reasoning, comparison modal, contact, 15-second foreground polling                               |
| Notifications     | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | Pages, unread state/count, mark read, open candidate report                                             |
| Conversations     | `GET/POST /conversations`                                                                                                 | Conversation list; contact from a report or match                                                       |
| Messages          | `GET/POST /conversations/:id/messages`; socket `join_conversation`, `send_message`, `new_message`, `leave_conversation`   | Authenticated socket, reconnect/room rejoin, acknowledgement, REST fallback, deduplication, read status |

Read requests ignore obsolete responses after filters or navigation change. Network failures retain a retry path. Session restoration does not delete the saved token on a temporary connection failure. Passwords are never persisted.

## Backend boundaries

- No endpoints exist for magic links, secret questions, ownership claims, approve/reject, claim lockout, phone/profile editing, or notification preferences. These draft actions are not presented as working features.
- Watchlist represents the student's active LOST reports. It has no independent saved-search/watch toggle API. Resolving or closing the report manages its active state.
- AI matching is asynchronous and requires the backend worker plus Gemini configuration. Empty matches do not imply that processing has completed. AI never establishes ownership or resolves reports automatically.
- The messaging service currently returns the first 100 messages at most, ordered oldest first, and ignores its `page` argument. Full history pagination needs a backend fix. Messages received or sent during the current screen session are merged into the visible history.
- REST message sends do not broadcast to Socket.IO rooms. The chat polls every six seconds as a fallback and to refresh read receipts. A socket acknowledgement timeout does not automatically resend, because the first send may already have been persisted.
- The keyword search implementation does not apply date filters, so the UI exposes category/type/keyword filters. Incident dates are still collected and shown independently of submission dates.
- In development, categories may return `source: static_fallback` when the database is unavailable. Successful category loading alone does not establish that report/auth persistence is ready.

## Verification and manual smoke test

`npm test` covers API contracts/interceptors, JSON/multipart requests, form validation, incident dates, pagination, deduplication/read updates, and rendered login/report/contact flows. `npm run check` validates source syntax, imports, and app configuration. Native Expo exports verify Metro resolves the application.

Validation in this workspace: all 12 tests and source checks passed. Android and iOS JavaScript exports passed with `npx expo export --platform android --platform ios --no-bytecode --output-dir dist`. Standard export reached Hermes compilation but Windows could not spawn `hermesc` (`spawn UNKNOWN`), including an elevated attempt. Production bytecode compilation and device behavior remain unverified. The no-bytecode option is a diagnostic check, not a change to the app's configured JavaScript engine.

Device testing still requires a running migrated/seeded backend database, email delivery (or the backend's console OTP in local development), and worker configuration. No live account credentials are included.

1. Register an Islamabad student email, verify the OTP, sign out, and sign back in. Restart the app to verify session restoration.
2. Publish LOST and FOUND reports, each with a category and description; exercise no photo, gallery photo, camera permission denial, and invalid descriptions/dates.
3. Search by keyword/category and switch Lost/Found. Open an item, edit your own report, and resolve/close/reopen it.
4. With matching configured, publish a compatible opposite report, wait for the worker, inspect the match explanation and notification, and contact the student.
5. On two devices/accounts, send messages, reconnect, refresh read receipts, and confirm sign-out removes access to the student navigation.
