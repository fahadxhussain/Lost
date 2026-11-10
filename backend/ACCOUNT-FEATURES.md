# Profile and password reset deployment

Apply this release's migration before restarting the backend. Authentication now reads `users.token_version`, so the migration and server release must be deployed together.

```sh
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm start
```

The migration adds nullable profile photos, a session version with a default of zero, and the password-reset token table. Existing accounts and registration numbers are preserved. No database migration was run from the UI development workspace; the database owner is responsible for applying it.

## Environment

Set `PUBLIC_API_URL` to the backend's externally reachable origin, for example `https://api.example.edu.pk`. The app's `EXPO_PUBLIC_API_URL` points to the same backend with `/api/v1` appended. Reset links must not point to localhost when opened on another device. HTTPS is required in production.

Keep the existing SMTP settings configured (`EMAIL_PROVIDER=smtp`, SMTP credentials, and a valid sender). Password reset requires real SMTP and does not print links or reset tokens to the console. In this workspace SMTP connection/authentication was verified without sending messages. Environment files remain ignored by Git.

If a reverse proxy fronts the API, forward `/reset-password`, `/account-assets/*`, and `/api/v1/auth/*` to this server. The reset page uses external scripts/styles compatible with Helmet's CSP. Tokens are supplied in the URL fragment, removed from browser history after reading, and submitted only in a POST body. The page suppresses referrers and caching. Its only account change is resetting the password; it never signs the user in automatically.

## API contracts

- `PATCH /api/v1/auth/me`: authenticated active student; JSON `{ "name": "Display username" }` or multipart with `name` and one `avatar` image. Returns `{ status, message, data: { user } }`. Username edits change the existing display-name field; they do not create a separate unique login identifier. Email, registration number, account status and session version cannot be edited through this endpoint.
- `POST /api/v1/auth/forgot-password`: public `{ "email": "student@isbstudent.comsats.edu.pk" }`. The same success message is returned for active, unknown and ineligible accounts. Rate limited to three requests per 15 minutes per IP. SMTP delivery failures invalidate the generated token and are logged without secrets; they do not expose whether the account exists.
- `POST /api/v1/auth/reset-password`: public `{ "token": "...", "password": "...", "confirmation": "..." }`. Tokens expire after 15 minutes and are consumed atomically. Requesting a new link invalidates older links. Passwords require at least eight characters and at most 72 UTF-8 bytes, matching bcrypt's input limit.

After reset, the session version increases. Previously issued REST tokens and Socket.IO sessions are rejected; students sign in again on every device. Token and password updates happen in one transaction. Concurrent requests serialize on the user record before changing reset tokens.

## Checks

`npm run test:account` runs isolated service/HTTP tests without a database or real outgoing email. `npm test` is the existing database integration suite and needs a configured test database.

With the migration deployed, verify these flows against two test accounts:

1. Save a username and a JPG/PNG/WebP avatar; restart the app and confirm persistence. Confirm email and registration number remain fixed.
2. Use Forgot password from Sign in and request a reset link from Profile. Open each email on a phone, follow its link, and change the password.
3. Confirm that the old password fails, the new password works, and previously signed-in devices lose access.
4. Try a used, expired, invalid, and superseded link. Try mismatching passwords and an oversized avatar. Confirm each receives a useful error.
5. On physical Android/iOS devices, type a multiline chat message with the keyboard open; verify that the composer and icon button stay visible.

Android's keyboard resize setting requires a new native build to affect an installed standalone app. Tab movement respects the device's reduced-motion preference. Report selection now lives in a stack above the main tabs; the floating button is hidden while the keyboard is open.
