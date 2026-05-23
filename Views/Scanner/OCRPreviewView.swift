import SwiftUI

struct OCRPreviewView: View {
    @Environment(\.managedObjectContext) private var context

    let ocrResult: OCRResult
    let image: UIImage
    let onSave: (ReceiptEntity) -> Void
    let onRetake: () -> Void

    @State private var storeName: String
    @State private var totalAmountText: String
    @State private var date: Date
    @State private var selectedCategory: CategoryEntity?
    @State private var categories: [CategoryEntity] = []
    @State private var isSaving = false
    @State private var showImagePreview = false

    init(ocrResult: OCRResult, image: UIImage, onSave: @escaping (ReceiptEntity) -> Void, onRetake: @escaping () -> Void) {
        self.ocrResult = ocrResult
        self.image = image
        self.onSave = onSave
        self.onRetake = onRetake
        _storeName = State(initialValue: ocrResult.storeName)
        _totalAmountText = State(initialValue: ocrResult.totalAmount.map { String(format: "%.2f", $0) } ?? "")
        _date = State(initialValue: ocrResult.date ?? Date())
    }

    var parsedAmount: Double? { Double(totalAmountText.replacingOccurrences(of: ",", with: ".")) }

    var body: some View {
        Form {
            Section {
                HStack {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 70, height: 70)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .onTapGesture { showImagePreview = true }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Receipt captured")
                            .font(.headline)
                        Text("Review and correct the details below.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Retake") { onRetake() }
                        .font(.caption)
                }
            }

            Section("Store Details") {
                LabeledContent("Store Name") {
                    TextField("Store name", text: $storeName)
                        .multilineTextAlignment(.trailing)
                        .onChange(of: storeName) { _, name in
                            selectedCategory = CategorizationService.shared.categorize(storeName: name, in: context)
                        }
                }

                LabeledContent("Total (€)") {
                    TextField("0.00", text: $totalAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                }

                DatePicker("Date", selection: $date, displayedComponents: .date)
            }

            Section("Category") {
                if categories.isEmpty {
                    ProgressView()
                } else {
                    Picker("Category", selection: $selectedCategory) {
                        ForEach(categories, id: \.id) { cat in
                            HStack {
                                Image(systemName: cat.displayIcon)
                                    .foregroundStyle(cat.swiftUIColor)
                                Text(cat.name ?? "")
                            }
                            .tag(Optional(cat))
                        }
                    }
                    .pickerStyle(.menu)
                }
            }

            if !ocrResult.items.isEmpty {
                Section("Detected Items") {
                    ForEach(ocrResult.items, id: \.name) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            Text(item.amount.currencyFormatted)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section {
                Button {
                    saveReceipt()
                } label: {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Label("Save Receipt", systemImage: "checkmark.circle.fill")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                }
                .listRowBackground(Color(hex: "007AFF"))
                .disabled(isSaving)
            }
        }
        .navigationTitle("Review Receipt")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadCategories() }
        .sheet(isPresented: $showImagePreview) {
            ImagePreviewSheet(image: image)
        }
    }

    private func loadCategories() {
        categories = CategorizationService.shared.fetchAll(in: context)
        if selectedCategory == nil {
            selectedCategory = CategorizationService.shared.categorize(storeName: storeName, in: context)
        }
    }

    private func saveReceipt() {
        isSaving = true
        let receipt = ReceiptEntity(context: context)
        receipt.id = UUID()
        receipt.storeName = storeName.trimmingCharacters(in: .whitespaces)
        receipt.totalAmount = parsedAmount ?? ocrResult.totalAmount ?? 0
        receipt.date = date
        receipt.createdAt = Date()
        receipt.rawOCRText = ocrResult.rawText
        receipt.imageData = image.jpegData(compressionQuality: 0.7)
        receipt.category = selectedCategory

        if let cat = selectedCategory {
            CategorizationService.shared.learn(storeName: receipt.displayStoreName, category: cat)
        }

        for item in ocrResult.items {
            let entity = ReceiptItemEntity(context: context)
            entity.id = UUID()
            entity.name = item.name
            entity.amount = item.amount
            entity.receipt = receipt
        }

        PersistenceController.shared.save()
        Haptics.success()
        onSave(receipt)
    }
}

struct ImagePreviewSheet: View {
    @Environment(\.dismiss) private var dismiss
    let image: UIImage

    var body: some View {
        NavigationStack {
            ScrollView([.horizontal, .vertical]) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            }
            .navigationTitle("Receipt Image")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
