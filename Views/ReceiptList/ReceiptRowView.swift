import SwiftUI

struct ReceiptRowView: View {
    let receipt: ReceiptEntity

    var body: some View {
        HStack(spacing: 14) {
            // Category icon
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill((receipt.category?.swiftUIColor ?? Color(hex: "007AFF")).opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: receipt.category?.displayIcon ?? "tag.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(receipt.category?.swiftUIColor ?? Color(hex: "007AFF"))
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(receipt.displayStoreName)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(receipt.category?.name ?? "Other")
                        .font(.caption)
                        .foregroundStyle(receipt.category?.swiftUIColor ?? .secondary)
                    Text("·")
                        .foregroundStyle(.tertiary)
                    Text(receipt.displayDate.shortDateString)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Text(receipt.totalAmount.currencyFormatted)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color(.label))
        }
        .padding(.vertical, 2)
    }
}
