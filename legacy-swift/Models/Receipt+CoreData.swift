import CoreData
import UIKit

@objc(ReceiptEntity)
public class ReceiptEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var date: Date?
    @NSManaged public var storeName: String?
    @NSManaged public var totalAmount: Double
    @NSManaged public var rawOCRText: String?
    @NSManaged public var imageData: Data?
    @NSManaged public var createdAt: Date?
    @NSManaged public var category: CategoryEntity?
    @NSManaged public var items: NSSet?

    var itemsArray: [ReceiptItemEntity] {
        let set = items as? Set<ReceiptItemEntity> ?? []
        return set.sorted { ($0.name ?? "") < ($1.name ?? "") }
    }

    var thumbnailImage: UIImage? {
        guard let data = imageData else { return nil }
        return UIImage(data: data)
    }

    var displayStoreName: String {
        storeName?.isEmpty == false ? storeName! : "Unknown Store"
    }

    var displayDate: Date {
        date ?? createdAt ?? Date()
    }

    static func fetchRequest() -> NSFetchRequest<ReceiptEntity> {
        let request = NSFetchRequest<ReceiptEntity>(entityName: "ReceiptEntity")
        request.sortDescriptors = [NSSortDescriptor(keyPath: \ReceiptEntity.date, ascending: false)]
        return request
    }

    static func fetchForMonth(_ month: Date, context: NSManagedObjectContext) -> [ReceiptEntity] {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: month))!
        let end = calendar.date(byAdding: .month, value: 1, to: start)!
        let request = fetchRequest()
        request.predicate = NSPredicate(format: "date >= %@ AND date < %@", start as NSDate, end as NSDate)
        return (try? context.fetch(request)) ?? []
    }
}

@objc(ReceiptItemEntity)
public class ReceiptItemEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var name: String?
    @NSManaged public var amount: Double
    @NSManaged public var receipt: ReceiptEntity?

    static func fetchRequest() -> NSFetchRequest<ReceiptItemEntity> {
        NSFetchRequest<ReceiptItemEntity>(entityName: "ReceiptItemEntity")
    }
}
