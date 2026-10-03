# Slippy — Snap your slip. Know your spending.

Receipt tracker for iPhone. Offline-first, private (data stays on the device), Italian and English, optional AI.

- `docs/` — the app (HTML/JS), also published as a PWA on GitHub Pages
- `ios/` — Capacitor iOS project that wraps `docs/` (native camera + haptics)
- `legacy-swift/` — the original SwiftUI prototype, no longer maintained
- `STORE_LAUNCH.md` — App Store release steps

Build for iOS (on a Mac): `npm install && npx cap sync ios && npx cap open ios`
