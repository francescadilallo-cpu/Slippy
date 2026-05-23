import CoreData

struct PersistenceController {
    static let shared = PersistenceController()

    static let preview: PersistenceController = {
        let controller = PersistenceController(inMemory: true)
        let context = controller.container.viewContext
        CategoryEntity.createDefaults(in: context)
        let receipt = ReceiptEntity(context: context)
        receipt.id = UUID()
        receipt.storeName = "Esselunga"
        receipt.totalAmount = 42.50
        receipt.date = Date()
        receipt.createdAt = Date()
        receipt.rawOCRText = "ESSELUNGA\nTOTALE 42.50"
        if let groceries = try? context.fetch(CategoryEntity.fetchRequest()).first(where: { $0.name == "Groceries" }) {
            receipt.category = groceries
        }
        let item1 = ReceiptItemEntity(context: context)
        item1.id = UUID()
        item1.name = "Pasta"
        item1.amount = 1.89
        item1.receipt = receipt
        let item2 = ReceiptItemEntity(context: context)
        item2.id = UUID()
        item2.name = "Latte"
        item2.amount = 1.35
        item2.receipt = receipt
        try? context.save()
        return controller
    }()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "Slippy")
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores { _, error in
            if let error {
                fatalError("Core Data failed to load: \(error.localizedDescription)")
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        seedCategoriesIfNeeded()
    }

    private func seedCategoriesIfNeeded() {
        let context = container.viewContext
        let request: NSFetchRequest<CategoryEntity> = CategoryEntity.fetchRequest()
        guard (try? context.count(for: request)) == 0 else { return }
        CategoryEntity.createDefaults(in: context)
        try? context.save()
    }

    func save() {
        let context = container.viewContext
        guard context.hasChanges else { return }
        try? context.save()
    }
}
