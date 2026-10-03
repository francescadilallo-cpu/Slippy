# Slippy: App Store launch plan

## Done in the web app (live)
- Photos stored in IndexedDB (not localStorage); save failures show an error instead of failing silently
- Persistent-storage request; full JSON backup/restore (photos included, API keys excluded)
- Edit receipt items; pinch-zoom enabled (inputs are 16px so iOS does not auto-zoom)
- Model names centralised in `MODELS` (top of `docs/app.js`)
- Privacy policy at `docs/privacy.html`, linked in Settings

## Before submitting (needs you / a Mac)
1. Fill in `SUPPORT_EMAIL` in `docs/privacy.html`.
2. Verify the AI models with real keys: `MODELS.gemini` (`gemini-2.5-flash`) and the Claude ids. Untested here, no keys available.
3. Apple Developer account ($99/yr).
4. Wrap with Capacitor on a Mac with Xcode:
   `npm i @capacitor/core @capacitor/cli @capacitor/ios`, `npx cap init Slippy it.slippy.app --web-dir docs`, `npx cap add ios`, `npx cap sync`.
5. Add native value (guideline 4.2 rejects thin website wrappers): `@capacitor/camera` for scanning,
   `@capacitor/haptics`, `@capacitor/share`, local notifications for budget alerts, a widget.
6. Hosted privacy URL (GitHub Pages `.../privacy.html` works), support URL, 1024px icon, screenshots, privacy nutrition labels
   (data not collected; AI features send data to the user's chosen provider).
7. Test on a real iPhone: camera, offline, storage persistence, dark mode, Dynamic Type.

## Free launch (chosen path)
- No backend, payments or StoreKit needed. AI stays optional: users add their own Claude/Gemini key; everything else works offline with no account.
- Cheapest first step: ship as a PWA (free, no fees). iPhone: Safari > Share > Add to Home Screen. Android: Install app.
- App Store: still needs the Apple Developer account ($99/yr) even for a free app. Google Play is a one-time $25.
- Store review risk is the same for free apps: add native features (step 5) so it is not just a wrapped website.
- If you want donations later: Apple requires in-app tips to use In-App Purchase; external donation links are only allowed for registered non-profits. Simplest is a link on the website or GitHub page, not inside the iOS app.
- Revisit the backend + paid AI only if users ask for AI without their own key.
