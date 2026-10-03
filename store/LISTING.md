# App Store listing (copy/paste into App Store Connect)

**Name:** Slippy (try "Slippy: Scontrini e Spese" / "Slippy: Receipt Tracker" if the name is taken)
**Category:** Finance (secondary: Productivity)  **Price:** Free  **Age rating:** 4+
**Support / Marketing / Privacy URL:** https://francescadilallo-cpu.github.io/Slippy/privacy.html (assumes GitHub Pages is served from `docs/`; confirm it opens, or use your own domain)
**Copyright:** 2026 <your name>

## Italiano
**Sottotitolo (max 30):** Scontrini e spese, in privato
**Testo promozionale:** Fotografa lo scontrino, scegli la categoria, tieni il budget sotto controllo. Tutto resta sul tuo iPhone.
**Parole chiave (max 100):** scontrini,spese,budget,ricevute,risparmio,scanner,finanza,offline,privacy,categorie,tracker
**Descrizione:**
Slippy è il modo semplice e privato per tenere traccia delle tue spese.

• Aggiungi uno scontrino in pochi secondi, con foto, prodotti e note
• Dashboard mensile: totale, media, categorie, calendario delle spese, andamento sugli ultimi 6 mesi
• Budget mensile con avvisi all'80% e al 100%
• Previsione di fine mese e confronto con il mese precedente
• Cerca e filtra per negozio, categoria, prodotto o nota
• Esporta in CSV, backup e ripristino completo con le foto
• Italiano e inglese, valute multiple, tema chiaro e scuro
• Funziona offline, senza account, senza pubblicità, senza tracciamento

PRIVACY PRIMA DI TUTTO
Scontrini e foto restano sul tuo dispositivo. Nessun server Slippy, nessun account.

FUNZIONI AI OPZIONALI
Se inserisci una tua chiave API (Gemini o Claude) puoi leggere automaticamente le foto degli scontrini e ricevere consigli e analisi mensili. Senza chiave, tutto il resto funziona normalmente.

## English
**Subtitle (max 30):** Receipts & spending, private
**Promotional text:** Snap a receipt, pick a category, stay on budget. Everything stays on your iPhone.
**Keywords (max 100):** receipts,expenses,budget,spending,tracker,scanner,savings,offline,private,finance,money
**Description:**
Slippy is the simple, private way to track what you spend.

• Add a receipt in seconds, with photo, items and notes
• Monthly dashboard: total, average, categories, spending calendar, 6-month trend
• Monthly budget with alerts at 80% and 100%
• End-of-month forecast and comparison with last month
• Search and filter by store, category, product or note
• CSV export, full backup and restore including photos
• Italian and English, multiple currencies, light and dark mode
• Works offline, no account, no ads, no tracking

PRIVACY FIRST
Receipts and photos stay on your device. No Slippy servers, no account.

OPTIONAL AI FEATURES
If you add your own API key (Gemini or Claude) you can read receipt photos automatically and get tips and monthly analysis. Without a key, everything else works normally.

## App Review notes
Slippy needs no login. All data is stored locally on the device (IndexedDB/localStorage), including receipt photos. Native features: camera and photo-library capture, haptic feedback, local notifications for budget alerts. AI features are optional and disabled until the user enters their own API key in Settings; to test without a key, use "+" to add a receipt manually and set a budget in Settings to see alerts.

## Privacy "nutrition label"
Data collected by the developer: **None.** (No analytics, no accounts, no servers.) If the user enables AI with their own key, content is sent directly to Google/Anthropic under the user's own account. Describe that in the review notes and the privacy policy (already in `docs/privacy.html`).
Tracking: No.  Export compliance: no non-exempt encryption (`ITSAppUsesNonExemptEncryption` = false is set).

## Screenshots
`store/screenshots/` — 1290x2796 (6.5"/6.7" iPhone). Files `it-*` and `en-*`: dashboard, insights, receipts, detail, add receipt, settings. Upload the 6.7" set; Apple scales for smaller sizes. Demo data only.
