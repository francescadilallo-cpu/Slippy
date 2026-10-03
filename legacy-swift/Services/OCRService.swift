import Vision
import UIKit

struct OCRResult {
    var storeName: String
    var totalAmount: Double?
    var date: Date?
    var rawText: String
    var items: [(name: String, amount: Double)]
}

final class OCRService {
    static let shared = OCRService()

    func recognizeText(in image: UIImage) async throws -> OCRResult {
        guard let cgImage = image.cgImage else {
            throw OCRError.invalidImage
        }

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let observations = request.results as? [VNRecognizedTextObservation] ?? []
                let lines = observations.compactMap { $0.topCandidates(1).first?.string }
                let result = self.parse(lines: lines)
                continuation.resume(returning: result)
            }
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["it", "en"]
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    private func parse(lines: [String]) -> OCRResult {
        let raw = lines.joined(separator: "\n")
        let storeName = extractStoreName(from: lines)
        let total = extractTotal(from: lines)
        let date = extractDate(from: lines)
        let items = extractItems(from: lines)

        return OCRResult(
            storeName: storeName,
            totalAmount: total,
            date: date,
            rawText: raw,
            items: items
        )
    }

    private func extractStoreName(from lines: [String]) -> String {
        // First non-empty, non-numeric line is typically the store name
        for line in lines.prefix(5) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.count > 2 && !trimmed.allSatisfy({ $0.isNumber || $0 == "." || $0 == "," || $0 == " " }) {
                return trimmed.capitalized
            }
        }
        return "Unknown Store"
    }

    private func extractTotal(from lines: [String]) -> Double? {
        let totalKeywords = ["totale", "tot.", "tot ", "total", "da pagare", "importo", "€", "eur"]
        let amountPattern = /(\d+[.,]\d{2})/

        // Scan from bottom for total keywords
        for line in lines.reversed() {
            let lower = line.lowercased()
            let isTotal = totalKeywords.contains(where: { lower.contains($0) })
            if isTotal, let match = line.firstMatch(of: amountPattern) {
                return parseAmount(String(match.output.1))
            }
        }

        // Fallback: last number that looks like a total
        for line in lines.reversed() {
            if let match = line.firstMatch(of: amountPattern) {
                let amount = parseAmount(String(match.output.1))
                if let amount, amount > 0 {
                    return amount
                }
            }
        }
        return nil
    }

    private func extractDate(from lines: [String]) -> Date? {
        let formatters: [DateFormatter] = {
            let formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy-MM-dd", "MM/dd/yyyy"]
            return formats.map {
                let f = DateFormatter()
                f.dateFormat = $0
                f.locale = Locale(identifier: "it_IT")
                return f
            }
        }()

        let datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
        for line in lines {
            if let match = line.firstMatch(of: datePattern) {
                let dateStr = String(match.output.1)
                for formatter in formatters {
                    if let date = formatter.date(from: dateStr) {
                        return date
                    }
                }
            }
        }
        return nil
    }

    private func extractItems(from lines: [String]) -> [(name: String, amount: Double)] {
        var items: [(name: String, amount: Double)] = []
        let itemPattern = /^(.+?)\s+(\d+[.,]\d{2})\s*$/
        let skipKeywords = ["totale", "tot", "iva", "subtotale", "sconto", "resto", "pagato", "contanti", "visa", "mastercard"]

        for line in lines {
            let lower = line.lowercased()
            if skipKeywords.contains(where: { lower.contains($0) }) { continue }
            if let match = line.firstMatch(of: itemPattern) {
                let name = String(match.output.1).trimmingCharacters(in: .whitespaces)
                if let amount = parseAmount(String(match.output.2)), amount > 0, name.count > 1 {
                    items.append((name: name.capitalized, amount: amount))
                }
            }
        }
        return items
    }

    private func parseAmount(_ string: String) -> Double? {
        let normalized = string.replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }
}

enum OCRError: LocalizedError {
    case invalidImage

    var errorDescription: String? {
        switch self {
        case .invalidImage: return "The image could not be processed. Please try again."
        }
    }
}
