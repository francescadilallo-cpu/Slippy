import SwiftUI
import CoreData

struct DashboardView: View {
    @Environment(\.managedObjectContext) private var context
    @State private var selectedMonth = Date()

    private var currentReceipts: [ReceiptEntity] {
        ReceiptEntity.fetchForMonth(selectedMonth, context: context)
    }

    private var previousReceipts: [ReceiptEntity] {
        ReceiptEntity.fetchForMonth(selectedMonth.startOfPreviousMonth, context: context)
    }

    private var totalSpend: Double {
        currentReceipts.reduce(0) { $0 + $1.totalAmount }
    }

    private var previousSpend: Double {
        previousReceipts.reduce(0) { $0 + $1.totalAmount }
    }

    private var percentChange: Double? {
        guard previousSpend > 0 else { return nil }
        return ((totalSpend - previousSpend) / previousSpend) * 100
    }

    private var avgTicket: Double {
        currentReceipts.isEmpty ? 0 : totalSpend / Double(currentReceipts.count)
    }

    private var spendByCategory: [(category: CategoryEntity, total: Double)] {
        var map: [UUID: (CategoryEntity, Double)] = [:]
        for receipt in currentReceipts {
            guard let cat = receipt.category, let id = cat.id else { continue }
            if let existing = map[id] {
                map[id] = (existing.0, existing.1 + receipt.totalAmount)
            } else {
                map[id] = (cat, receipt.totalAmount)
            }
        }
        return map.values
            .sorted { $0.1 > $1.1 }
            .map { (category: $0.0, total: $0.1) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    MonthPicker(selectedMonth: $selectedMonth)
                        .padding(.horizontal)

                    if currentReceipts.isEmpty {
                        EmptyDashboardView()
                            .padding(.top, 40)
                    } else {
                        SpendSummaryCard(
                            total: totalSpend,
                            percentChange: percentChange,
                            receiptCount: currentReceipts.count,
                            avgTicket: avgTicket
                        )
                        .padding(.horizontal)

                        if !spendByCategory.isEmpty {
                            CategoryBarChart(data: spendByCategory, totalSpend: totalSpend)
                                .padding(.horizontal)
                        }
                    }
                }
                .padding(.bottom, 100)
            }
            .navigationTitle("Dashboard")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct MonthPicker: View {
    @Binding var selectedMonth: Date

    var body: some View {
        HStack {
            Button {
                selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: selectedMonth)!
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Color(hex: "007AFF"))
            }

            Spacer()
            Text(selectedMonth.monthYearString)
                .font(.headline)
                .contentTransition(.numericText())
                .animation(.easeInOut(duration: 0.2), value: selectedMonth)
            Spacer()

            Button {
                let next = Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)!
                if next <= Date() {
                    selectedMonth = next
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(
                        Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)! > Date()
                        ? Color(.tertiaryLabel)
                        : Color(hex: "007AFF")
                    )
            }
            .disabled(Calendar.current.date(byAdding: .month, value: 1, to: selectedMonth)! > Date())
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
    }
}

struct SpendSummaryCard: View {
    let total: Double
    let percentChange: Double?
    let receiptCount: Int
    let avgTicket: Double

    var changeColor: Color {
        guard let pct = percentChange else { return .secondary }
        return pct > 0 ? Color(hex: "FF9500") : Color(hex: "30D158")
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 6) {
                Text("Monthly Spend")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(total.currencyFormatted)
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "007AFF"))
                    .contentTransition(.numericText())

                if let pct = percentChange {
                    HStack(spacing: 4) {
                        Image(systemName: pct > 0 ? "arrow.up.right" : "arrow.down.right")
                        Text("\(String(format: "%.1f", abs(pct)))% vs last month")
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(changeColor)
                }
            }
            .padding(.vertical, 24)

            Divider()

            HStack {
                StatPill(label: "Receipts", value: "\(receiptCount)", icon: "doc.text.fill")
                Divider().frame(height: 40)
                StatPill(label: "Avg. Ticket", value: avgTicket.currencyFormatted, icon: "ticket.fill")
            }
            .padding(.vertical, 16)
        }
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct StatPill: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct EmptyDashboardView: View {
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color(hex: "007AFF").opacity(0.1))
                    .frame(width: 120, height: 120)
                Image(systemName: "doc.text.magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundStyle(Color(hex: "007AFF").opacity(0.6))
            }
            VStack(spacing: 8) {
                Text("No receipts this month")
                    .font(.headline)
                Text("Tap the camera button below\nto scan your first receipt.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}
