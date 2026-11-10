# Frontend validation and recovery

The frontend checks input before sending it and explains how to recover from a failure. The backend remains responsible for authentication, authorization, file inspection, rate limits, and data integrity.

## Forms

- Registration normalizes email case and surrounding spaces, checks the Islamabad student domain and email syntax, requires a name, and requires matching passwords of at least eight characters. Sign-in does not impose the registration minimum on existing passwords. Passwords are never trimmed or changed before transmission.
- Errors appear beside the affected fields. Submission focuses the first invalid text field. Editing a field clears its old error. Password visibility can be toggled, and password inputs disable capitalization and autocorrection.
- OTP accepts six digits, handles missing account context, and provides a route back to registration to correct the email. Resend uses an absolute deadline, including time spent in the background. A successful resend clears the old code and explains that only the newest code works. Server expiry, attempt-limit, and cooldown responses remain authoritative.
- Reports require a category and at least ten trimmed description characters. Titles, locations, dates, and photos remain optional. Impossible and future incident dates are rejected using the device's calendar date. Submission chronology is never used to reject matches.
- Photo checks cover missing or unreadable assets, empty files, unsupported formats, and the server's 10 MB limit. Supported formats are JPG, PNG, and WebP. Unknown file sizes are left to the server to check. Permission denial offers device settings and a path to continue without a photo. Canceling photo selection retains the existing draft/photo.
- Client usability caps are centralized in `src/utils/validation.js`: name 100, email 254, title 150, description 5,000, location 250, search 200, and message 5,000 characters. These are frontend limits, not a claim that the backend enforces all the same limits.

## Requests and recovery

- Submission locks protect authentication, OTP, report publishing, messaging, contacts, report status updates, notifications, and sign-out from repeated taps before a disabled state renders.
- Failed form submissions keep entered values. Failed chat sends retain the draft; background refresh cannot clear the send error. Unconfirmed delivery asks the user to refresh before retrying, since a timeout does not prove delivery failed.
- HTTP failures have specific guidance for incorrect credentials, session expiry, inaccessible/missing resources, oversized uploads, rate limits, timeouts, and network/server outages. Raw exceptions, HTML, and recognizable database/stack details are not shown.
- Public auth requests omit saved bearer tokens. Concurrent session-expiry responses share cleanup; a response sent with an old token cannot expire a newer stored session. Storage failures expose recovery guidance instead of escaping as unhandled promises.
- Polling skips overlapping requests and ignores outdated responses. Feed refresh failures retain existing results, pagination retries the failed page, and empty search results offer a way to clear filters. Failed loads are not presented as successful empty results.

## Verification

Run `npm test` and `npm run check` from `frontend/`. Tests cover validation boundaries, malformed email and date inputs, photo assets, rapid submission, failed sends and recovery, OTP cooldown/background time, category outages, session-storage failures, error formatting, and out-of-order requests.

Before a release, also check on physical Android and iOS devices:

1. Submit each blank form; confirm the first invalid field is visible with the keyboard open, including at larger text sizes.
2. Register, receive a real OTP, paste the code, request another code, and try the previous and expired codes. Background the app during the resend countdown.
3. Deny camera/gallery permission, return through device settings, cancel selection, and choose supported/HEIC/oversized images. Publish without a photo as well.
4. Disable connectivity while publishing and sending. Reconnect, refresh first, and check for a successfully saved report/message before retrying an ambiguous timeout.
5. Expire a real server session while several screens are polling. Sign in again and verify that older requests do not sign out the new session.
6. Check empty searches, failed pagination, missing/deleted reports, closed-report editing, and report ownership with two separate student accounts.

Unit tests and a bundle export do not establish real email delivery, real backend authorization, device permission behavior, or physical-device accessibility. No backend files are changed by this frontend review.
