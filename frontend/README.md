# COMSATS Lost & Found --- Mobile App (Frontend)

This is the React Native (Expo) mobile client for the COMSATS Lost & Found system.

---

## Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `EXPO_PUBLIC_API_URL` points to your backend instance:
- If testing on an Android/iOS emulator on the same machine: `http://localhost:5000/api/v1`
- If testing on a physical phone via Expo Go: use your computer's local Wi-Fi IP address, e.g.: `http://192.168.1.50:5000/api/v1`

### 3. Start Expo Dev Server
```bash
npm start
```
Scan the QR code with the Expo Go app (on Android/iOS) or press `a` for Android Emulator / `i` for iOS Simulator.

---

## Folder Organization

```text
src/
├── assets/         # App icons, splash screens, branding images
├── components/     # Reusable UI widgets (Buttons, Inputs, Cards, Headers)
├── constants/      # App colors, typography, theme definitions
├── context/        # Auth & global state providers
├── navigation/     # Stack & Tab navigators
├── screens/
│   ├── auth/       # Login, Register, OTP Verification
│   ├── feed/       # Lost & Found listings
│   ├── reports/    # Create Report form & Report Details
│   ├── search/     # Database keyword & category search
│   ├── matches/    # Potential Matches cards & AI reasoning modal
│   ├── chat/       # Direct messaging & conversation list
│   └── profile/    # User profile & My Reports
└── services/       # Axios API client & WebSocket connections
```

Refer to [`WORK-DIVISION.md`](../WORK-DIVISION.md) for milestone synchronization with the backend lead.
