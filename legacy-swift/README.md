# Slippy — Snap your slip. Know your spending.

A complete iOS receipt scanner app built with SwiftUI, VisionKit, Core Data, and the Claude API.

## Setup in Xcode

1. **Open the project**: `open Slippy/Slippy.xcodeproj` in Xcode 15+
2. **Set signing team**: In Xcode → Targets → Slippy → Signing & Capabilities, select your Apple Developer team
3. **Run on device** (required for camera): Select your device and press ⌘R
4. **Add API key**: Launch the app → Settings → paste your Claude API key

> The simulator supports the photo-library import path but not the live camera scanner.

## Architecture

```
Slippy/
├── App/
│   ├── SlippyApp.swift          # @main entry, tab bar, onboarding gate
│   └── Info.plist               # Camera + photo library permissions, ATS config
├── Models/
│   ├── Slippy.xcdatamodeld/     # Core Data schema (Receipt, ReceiptItem, Category)
│   ├── Receipt+CoreData.swift   # ReceiptEntity + ReceiptItemEntity NSManagedObject subclasses
│   └── Category+CoreData.swift  # CategoryEntity with default seeding
├── Views/
│   ├── Dashboard/
│   │   ├── DashboardView.swift  # Monthly total, % change, stat pills, month picker
│   │   └── CategoryBarChart.swift  # Swift Charts horizontal bar chart + legend
│   ├── Scanner/
│   │   ├── ScannerView.swift    # Camera/library picker, VisionKit wrapper, processing state
│   │   └── OCRPreviewView.swift # Editable confirmation form before saving
│   ├── ReceiptList/
│   │   ├── ReceiptListView.swift  # Searchable list grouped by date, swipe-to-delete
│   │   └── ReceiptRowView.swift   # Category icon + store name + amount row
│   ├── ReceiptDetail/
│   │   ├── ReceiptDetailView.swift  # Full detail: header, category picker, items, raw OCR
│   │   └── AISuggestionCard.swift   # On-demand Claude API saving tip card
│   └── Settings/
│       └── SettingsView.swift    # API key (Keychain), CSV export, clear data
├── Services/
│   ├── PersistenceController.swift  # Core Data stack + category seeding
│   ├── OCRService.swift             # Vision VNRecognizeTextRequest, bilingual IT/EN parsing
│   ├── CategorizationService.swift  # Keyword matcher + UserDefaults learning
│   └── ClaudeService.swift          # claude-sonnet-4-20250514, URLSession, error handling
└── Utilities/
    └── Extensions.swift  # Color(hex:), Double.currencyFormatted, Date helpers,
                          # KeychainService, Haptics, CSV export, receipt grouping
```

## Feature walkthrough

### Scanner
- Tap the floating **+** button on any tab
- Choose **Use Camera** (VNDocumentCameraViewController) or **Choose from Library** (PhotosUI)
- Vision OCR runs with `recognitionLanguages: ["it", "en"]` at `.accurate` level
- Parser extracts: store name (first meaningful line), total (searches for TOTALE/TOT/€ keywords from bottom up), date (regex for dd/MM/yyyy variants), line items (name + price pairs)
- Editable confirmation form lets you correct any field before saving
- Category auto-assigned from keyword rules; user overrides are learned via UserDefaults

### Dashboard
- Monthly spend shown prominently with % delta vs previous month
- Colour-coded horizontal bar chart per category (Swift Charts)
- Month picker navigates history; future months are disabled

### AI Tips
- Tap **Get tip** on any receipt detail to call Claude
- Prompt: spending amount + category + receipt count → 2-line friendly saving tip
- Fails gracefully (no API key, offline) with a clear message instead of crashing

### Settings
- API key stored in iOS Keychain (never in code or UserDefaults)
- CSV export via share sheet
- Destructive "Clear All Data" guarded by a confirmation dialog

## Permissions required (Info.plist)
| Key | Reason |
|-----|--------|
| `NSCameraUsageDescription` | VisionKit document scanner |
| `NSPhotoLibraryUsageDescription` | PhotosUI import path |

## iOS version requirements
- **Minimum**: iOS 17.0
- Uses: Swift regex literals (`/pattern/`), `ContentUnavailableView`, Swift Charts, `@Observable`-compatible patterns

## Later phases (not yet implemented)
- CloudKit sync (add `NSPersistentCloudKitContainer`)
- StoreKit 2 subscriptions (premium: unlimited AI tips, CSV export)
- App icon asset catalog (create in Xcode with the receipt+smile concept)
- Widget extension (today's spend)
