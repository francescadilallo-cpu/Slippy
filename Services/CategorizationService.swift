import CoreData
import Foundation

final class CategorizationService {
    static let shared = CategorizationService()
    private let learnedMappingsKey = "SlippyLearnedMappings"

    private var learnedMappings: [String: String] {
        get { UserDefaults.standard.dictionary(forKey: learnedMappingsKey) as? [String: String] ?? [:] }
        set { UserDefaults.standard.set(newValue, forKey: learnedMappingsKey) }
    }

    func categorize(storeName: String, in context: NSManagedObjectContext) -> CategoryEntity? {
        let categories = fetchAll(in: context)
        let normalized = storeName.lowercased().trimmingCharacters(in: .whitespaces)

        // Check learned mappings first
        if let learnedName = learnedMappings[normalized],
           let cat = categories.first(where: { $0.name == learnedName }) {
            return cat
        }

        // Keyword matching
        for category in categories where category.name != "Other" {
            for keyword in category.keywordsArray where !keyword.isEmpty {
                if normalized.contains(keyword) {
                    return category
                }
            }
        }

        return categories.first(where: { $0.name == "Other" })
    }

    func learn(storeName: String, category: CategoryEntity) {
        let normalized = storeName.lowercased().trimmingCharacters(in: .whitespaces)
        guard !normalized.isEmpty, let name = category.name else { return }
        var mappings = learnedMappings
        mappings[normalized] = name
        learnedMappings = mappings
    }

    func fetchAll(in context: NSManagedObjectContext) -> [CategoryEntity] {
        let request = CategoryEntity.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \CategoryEntity.name, ascending: true)]
        return (try? context.fetch(request)) ?? []
    }
}
