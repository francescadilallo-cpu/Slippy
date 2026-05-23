import SwiftUI
import Charts

struct CategoryBarChart: View {
    let data: [(category: CategoryEntity, total: Double)]
    let totalSpend: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("By Category")
                .font(.headline)
                .padding(.horizontal, 20)
                .padding(.top, 20)

            Chart(data, id: \.category.id) { item in
                BarMark(
                    x: .value("Amount", item.total),
                    y: .value("Category", item.category.name ?? "Other")
                )
                .foregroundStyle(item.category.swiftUIColor)
                .cornerRadius(6)
                .annotation(position: .trailing, alignment: .leading) {
                    Text(item.total.currencyFormatted)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let name = value.as(String.self) {
                            HStack(spacing: 4) {
                                if let cat = data.first(where: { $0.category.name == name })?.category {
                                    Image(systemName: cat.displayIcon)
                                        .font(.caption2)
                                        .foregroundStyle(cat.swiftUIColor)
                                }
                                Text(name)
                                    .font(.caption)
                            }
                        }
                    }
                }
            }
            .frame(height: CGFloat(data.count) * 44 + 20)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)

            // Percentage legend
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(data, id: \.category.id) { item in
                        CategoryLegendChip(
                            category: item.category,
                            percentage: totalSpend > 0 ? (item.total / totalSpend) * 100 : 0
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct CategoryLegendChip: View {
    let category: CategoryEntity
    let percentage: Double

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: category.displayIcon)
                .font(.system(size: 16))
                .foregroundStyle(category.swiftUIColor)
            Text("\(Int(percentage))%")
                .font(.caption2.weight(.semibold))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(category.swiftUIColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
    }
}
