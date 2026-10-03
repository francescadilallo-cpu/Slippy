import SwiftUI

struct AISuggestionCard: View {
    let category: String
    let amount: Double

    @State private var tip: String?
    @State private var isLoading = false
    @State private var error: String?
    @State private var hasFetched = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(hex: "FF9500"))
                Text("AI Saving Tip")
                    .font(.headline)
                Spacer()
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                } else if tip == nil && !isLoading {
                    Button {
                        fetchTip()
                    } label: {
                        Text("Get tip")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color(hex: "007AFF"))
                    }
                }
            }

            if let tip {
                Text(tip)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else if let error {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.caption)
                    Text(error)
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            } else if !hasFetched {
                Text("Tap "Get tip" for a personalized saving suggestion.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .animation(.easeInOut(duration: 0.3), value: tip)
    }

    private func fetchTip() {
        guard KeychainService.shared.getAPIKey() != nil else {
            error = "Add your Claude API key in Settings to get tips."
            return
        }
        isLoading = true
        hasFetched = true
        error = nil
        Task {
            do {
                let result = try await ClaudeService.shared.fetchSavingTip(
                    category: category,
                    amount: amount,
                    receiptCount: 1
                )
                await MainActor.run {
                    tip = result.text
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}
