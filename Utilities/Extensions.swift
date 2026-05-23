import SwiftUI
import Security

// MARK: - Color from hex

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 122, 255)
        }
        self.init(.sRGB,
                  red: Double(r) / 255,
                  green: Double(g) / 255,
                  blue: Double(b) / 255,
                  opacity: Double(a) / 255)
    }
}

// MARK: - Currency formatting

extension Double {
    var currencyFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "€"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter.string(from: NSNumber(value: self)) ?? "€\(self)"
    }
}

// MARK: - Date helpers

extension Date {
    var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale.current
        return formatter.string(from: self)
    }

    var shortDateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: self)
    }

    var startOfMonth: Date {
        let calendar = Calendar.current
        return calendar.date(from: calendar.dateComponents([.year, .month], from: self))!
    }

    var startOfPreviousMonth: Date {
        let calendar = Calendar.current
        return calendar.date(byAdding: .month, value: -1, to: startOfMonth)!
    }

    func isSameDay(as other: Date) -> Bool {
        Calendar.current.isDate(self, inSameDayAs: other)
    }

    func isSameMonth(as other: Date) -> Bool {
        let cal = Calendar.current
        return cal.component(.year, from: self) == cal.component(.year, from: other)
            && cal.component(.month, from: self) == cal.component(.month, from: other)
    }
}

// MARK: - Keychain

final class KeychainService {
    static let shared = KeychainService()
    private let service = "com.slippy.app"
    private let account = "ClaudeAPIKey"

    func saveAPIKey(_ key: String) {
        let data = Data(key.utf8)
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]
        SecItemDelete(query as CFDictionary)
        var addQuery = query
        addQuery[kSecValueData] = data
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    func getAPIKey() -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func deleteAPIKey() {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Haptics

struct Haptics {
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
}

// MARK: - Receipt grouping

extension Array where Element == ReceiptEntity {
    func groupedByDate() -> [(key: String, receipts: [ReceiptEntity])] {
        let calendar = Calendar.current
        let today = Date()
        var groups: [String: [ReceiptEntity]] = [:]

        for receipt in self {
            let date = receipt.displayDate
            let key: String
            if calendar.isDateInToday(date) {
                key = "Today"
            } else if calendar.isDateInYesterday(date) {
                key = "Yesterday"
            } else if let daysAgo = calendar.dateComponents([.day], from: date, to: today).day, daysAgo < 7 {
                key = "This Week"
            } else {
                key = "Older"
            }
            groups[key, default: []].append(receipt)
        }

        let order = ["Today", "Yesterday", "This Week", "Older"]
        return order.compactMap { key in
            guard let receipts = groups[key], !receipts.isEmpty else { return nil }
            return (key: key, receipts: receipts.sorted { $0.displayDate > $1.displayDate })
        }
    }
}

// MARK: - CSV Export

extension Array where Element == ReceiptEntity {
    func toCSV() -> String {
        var lines = ["Date,Store,Category,Total (€),Items"]
        for receipt in self {
            let date = receipt.displayDate.shortDateString
            let store = receipt.displayStoreName.replacingOccurrences(of: ",", with: " ")
            let cat = receipt.category?.name ?? "Other"
            let total = String(format: "%.2f", receipt.totalAmount)
            let items = receipt.itemsArray.map { $0.name ?? "" }.joined(separator: "; ")
            lines.append("\(date),\(store),\(cat),\(total),\(items)")
        }
        return lines.joined(separator: "\n")
    }
}
