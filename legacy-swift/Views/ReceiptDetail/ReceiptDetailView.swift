import SwiftUI
import CoreData

struct ReceiptDetailView: View {
    @Environment(\.managedObjectContext) private var context
    @ObservedObject var receipt: ReceiptEntity

    @State private var categories: [CategoryEntity] = []
    @State private var showImagePreview = false
    @State private var isEditingCategory = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header card
                ReceiptHeaderCard(receipt: receipt, onImageTap: { showImagePreview = true })

                // Category card
                CategoryCard(
                    receipt: receipt,
                    categories: categories,
                    isEditing: $isEditingCategory
                )

                // Items card
                if !receipt.itemsArray.isEmpty {
                    ItemsCard(items: receipt.itemsArray)
                }

                // AI suggestion
                AISuggestionCard(
                    category: receipt.category?.name ?? "Other",
                    amount: receipt.totalAmount
                )

                // OCR text (debug/reference)
                if let raw = receipt.rawOCRText, !raw.isEmpty {
                    RawOCRCard(text: raw)
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(receipt.displayStoreName)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { categories = CategorizationService.shared.fetchAll(in: context) }
        .sheet(isPresented: $showImagePreview) {
            if let img = receipt.thumbnailImage {
                ImagePreviewSheet(image: img)
            }
        }
    }
}

struct ReceiptHeaderCard: View {
    let receipt: ReceiptEntity
    let onImageTap: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(receipt.displayStoreName)
                        .font(.title2.weight(.bold))
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(receipt.displayDate.shortDateString)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let img = receipt.thumbnailImage {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 64, height: 64)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .onTapGesture { onImageTap() }
                }
            }

            Divider()

            HStack {
                Text("Total")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(receipt.totalAmount.currencyFormatted)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "007AFF"))
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct CategoryCard: View {
    @Environment(\.managedObjectContext) private var context
    let receipt: ReceiptEntity
    let categories: [CategoryEntity]
    @Binding var isEditing: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Category")
                    .font(.headline)
                Spacer()
                Button(isEditing ? "Done" : "Change") {
                    isEditing.toggle()
                }
                .font(.subheadline)
                .foregroundStyle(Color(hex: "007AFF"))
            }

            if isEditing {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(categories, id: \.id) { cat in
                            CategoryChip(
                                category: cat,
                                isSelected: receipt.category?.id == cat.id
                            ) {
                                receipt.category = cat
                                CategorizationService.shared.learn(storeName: receipt.displayStoreName, category: cat)
                                PersistenceController.shared.save()
                                Haptics.impact(.light)
                            }
                        }
                    }
                }
            } else {
                if let cat = receipt.category {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(cat.swiftUIColor.opacity(0.15))
                                .frame(width: 44, height: 44)
                            Image(systemName: cat.displayIcon)
                                .font(.system(size: 20))
                                .foregroundStyle(cat.swiftUIColor)
                        }
                        Text(cat.name ?? "Other")
                            .font(.subheadline.weight(.semibold))
                    }
                }
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct CategoryChip: View {
    let category: CategoryEntity
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: category.displayIcon)
                    .font(.caption.weight(.semibold))
                Text(category.name ?? "")
                    .font(.caption.weight(.semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                isSelected ? category.swiftUIColor : category.swiftUIColor.opacity(0.12),
                in: RoundedRectangle(cornerRadius: 20)
            )
            .foregroundStyle(isSelected ? .white : category.swiftUIColor)
        }
    }
}

struct ItemsCard: View {
    let items: [ReceiptItemEntity]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Items")
                .font(.headline)
            ForEach(items, id: \.id) { item in
                HStack {
                    Text(item.name ?? "Item")
                        .font(.subheadline)
                    Spacer()
                    Text(item.amount.currencyFormatted)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if item.id != items.last?.id {
                    Divider()
                }
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct RawOCRCard: View {
    let text: String
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation { isExpanded.toggle() }
            } label: {
                HStack {
                    Label("Raw OCR Text", systemImage: "doc.plaintext")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if isExpanded {
                Text(text)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 4, y: 1)
    }
}
