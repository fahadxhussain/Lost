# COMSATS Lost & Found mobile app

React Native / Expo SDK 52 frontend using the palette and layouts in `../ui_draft/`.

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

Use a development build or Expo Go compatible with SDK 52. Restart Expo after changing the environment URL. The app defaults to the Android emulator address on Android and localhost elsewhere when no URL is configured.

Run the backend separately using `../backend/README.md`: PostgreSQL must be migrated and seeded, email delivery must be configured, and the matching worker must run for AI matches. This frontend never calls Gemini directly.

## Checks

```sh
npm test
npm run check
npx expo export --platform android --output-dir dist
npx expo export --platform ios --output-dir dist-ios
```

See [INTEGRATION.md](./INTEGRATION.md) for API coverage, draft adaptations, backend limitations, and the device smoke-test checklist.
