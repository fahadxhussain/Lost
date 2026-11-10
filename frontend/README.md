# COMSATS Lost & Found mobile app

React Native / Expo SDK 58 frontend using the palette and layouts in `../ui_draft/`.

## Run

```sh
cd frontend
npm ci
cp .env.example .env
npm start
```

On Windows PowerShell, use `Copy-Item .env.example .env`. Set `EXPO_PUBLIC_API_URL` in `.env` before starting Expo:

- Android emulator: `http://10.0.2.2:5000/api/v1`
- iOS simulator: `http://localhost:5000/api/v1`
- Physical phone: your computer's LAN address, such as `http://192.168.1.50:5000/api/v1`. Keep both devices on the same network and allow port 5000 through the computer's firewall.

Use a development build or Expo Go compatible with SDK 58. Restart Expo after changing the environment URL. The app defaults to the Android emulator address on Android and localhost elsewhere when no URL is configured.

After pulling dependency changes, run `npm ci`. If you use a custom development build, rebuild it to include the native dependencies, including `react-native-keyboard-controller`, Reanimated, and Worklets. Versions are matched to SDK 58.

Run the backend separately using `../backend/README.md`: PostgreSQL must be migrated and seeded, email delivery must be configured, and the matching worker must run for AI matches. This frontend never calls Gemini directly.

## Keyboard behavior

Forms use keyboard-aware scrolling to keep the focused field or multiline caret 12 points above the keyboard. Registration, login, OTP, reports, profile edits, password recovery, and feed search share this behavior. Form scrollers handle keyboard spacing themselves; the chat composer keeps its separate docked layout.

After updating these dependencies, restart Metro with `npx expo start --clear`. Expo Go must match SDK 58; installed development/standalone builds need a native rebuild. Keyboard Controller is included in SDK 58's Expo Go according to the [version-specific Expo documentation](https://docs.expo.dev/versions/v58.0.0/sdk/keyboard-controller/).

On a physical device, focus Confirm password and the incident-date field near the bottom, switch between fields with the keyboard open, and type multiple lines in Description. Confirm the active text stays visible with a small gap, including after rotating the phone or changing keyboard height. Unit tests and bundle exports do not verify physical keyboard geometry.

## Checks

```sh
npm test
npm run check
npx expo export --platform android --output-dir dist
npx expo export --platform ios --output-dir dist-ios
```

See [INTEGRATION.md](./INTEGRATION.md) for API coverage, draft adaptations, backend limitations, and the device smoke-test checklist.
