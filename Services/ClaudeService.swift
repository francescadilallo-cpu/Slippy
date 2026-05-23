import Foundation

struct SavingTip {
    let text: String
}

final class ClaudeService {
    static let shared = ClaudeService()
    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let model = "claude-sonnet-4-20250514"

    func fetchSavingTip(category: String, amount: Double, receiptCount: Int) async throws -> SavingTip {
        guard let apiKey = KeychainService.shared.getAPIKey(), !apiKey.isEmpty else {
            throw ClaudeError.noAPIKey
        }

        let prompt = """
        The user spent €\(String(format: "%.2f", amount)) on \(category) this month (\(receiptCount) receipt\(receiptCount == 1 ? "" : "s")). \
        Give one short, specific, actionable saving tip in 2 lines max. Be friendly and direct.
        """

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 150,
            "messages": [
                ["role": "user", "content": prompt]
            ]
        ]

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw ClaudeError.httpError(httpResponse.statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]],
              let firstBlock = content.first,
              let text = firstBlock["text"] as? String else {
            throw ClaudeError.invalidResponse
        }

        return SavingTip(text: text.trimmingCharacters(in: .whitespacesAndNewlines))
    }
}

enum ClaudeError: LocalizedError {
    case noAPIKey
    case invalidResponse
    case httpError(Int)

    var errorDescription: String? {
        switch self {
        case .noAPIKey:       return "No API key configured. Add your Claude API key in Settings."
        case .invalidResponse: return "Received an unexpected response from the AI."
        case .httpError(let code): return "AI service error (HTTP \(code))."
        }
    }
}
