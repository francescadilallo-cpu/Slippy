# Slippy: App Store launch plan

## Done in the web app (live)
- Photos stored in IndexedDB (not localStorage); save failures show an error instead of failing silently
- Persistent-storage request; full JSON backup/restore (photos included, API keys excluded)
- Edit receipt items; pinch-zoom enabled (inputs are 16px so iOS does not auto-zoom)
- Model names centralised in `MODELS` (top of `docs/app.js`)
- Privacy policy at `docs/privacy.html`, linked in Settings

## iOS project (generated, in `ios/`)
Capacitor 7 wraps `docs/` (the web app). Native camera + haptics are used automatically inside the app (falls back to the browser in the PWA).
The original SwiftUI app from the first commit (`App/`, `Views/`, `Slippy.xcodeproj`, ...) is untouched and no longer matches the web app's features. Pick one; recommended: ship the Capacitor build and archive the Swift code.

## Steps on a Mac (cannot be done from this Linux environment)
1. `npm install && npx cap sync ios && npx cap open ios`
2. Xcode: select the App target, set your Team (Apple Developer account, $99/yr) and a unique Bundle Identifier (default `it.slippy.app`).
3. Run on a real iPhone: camera, photo library, haptics, offline, backup/restore, dark mode.
4. Product > Archive > Distribute App > App Store Connect.
5. In App Store Connect: privacy policy URL (GitHub Pages `.../privacy.html`), support URL, screenshots (6.7" and 6.1"), description IT/EN, category Finance, price Free, privacy labels ("Data not collected"; AI is optional and uses the user's own key).
6. Fill in `SUPPORT_EMAIL` in `docs/privacy.html` first. Verify `MODELS` ids with real keys.
7. Review risk (guideline 4.2): in review notes mention native camera, haptics, offline-first local storage, backup/restore. Consider adding a widget or budget notifications before submitting.

## Free launch (chosen path)
- No backend, payments or StoreKit needed. AI stays optional: users add their own Claude/Gemini key; everything else works offline with no account.
- Cheapest first step: ship as a PWA (free, no fees). iPhone: Safari > Share > Add to Home Screen. Android: Install app.
- App Store: still needs the Apple Developer account ($99/yr) even for a free app. Google Play is a one-time $25.
- Store review risk is the same for free apps: add native features (step 5) so it is not just a wrapped website.
- If you want donations later: Apple requires in-app tips to use In-App Purchase; external donation links are only allowed for registered non-profits. Simplest is a link on the website or GitHub page, not inside the iOS app.
- Revisit the backend + paid AI only if users ask for AI without their own key.
