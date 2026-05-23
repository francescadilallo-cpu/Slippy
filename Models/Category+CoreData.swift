import CoreData
import SwiftUI

@objc(CategoryEntity)
public class CategoryEntity: NSManagedObject {
    @NSManaged public var id: UUID?
    @NSManaged public var name: String?
    @NSManaged public var icon: String?
    @NSManaged public var color: String?
    @NSManaged public var keywords: String?
    @NSManaged public var receipts: NSSet?

    var keywordsArray: [String] {
        (keywords ?? "").split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
    }

    var swiftUIColor: Color {
        Color(hex: color ?? "007AFF")
    }

    var displayIcon: String {
        icon ?? "tag.fill"
    }

    static func fetchRequest() -> NSFetchRequest<CategoryEntity> {
        NSFetchRequest<CategoryEntity>(entityName: "CategoryEntity")
    }

    static func createDefaults(in context: NSManagedObjectContext) {
        let defaults: [(name: String, icon: String, color: String, keywords: String)] = [
            ("Groceries",    "cart.fill",           "34C759",
             "esselunga,conad,lidl,carrefour,aldi,eurospin,pam,despar,spar,coop,iper,sigma,simply,penny,in's,md,bennet,famila,gigante,supermercato,grocery,supermarket"),
            ("Restaurants",  "fork.knife",          "FF9500",
             "mcdonald,ristorante,pizzeria,burger,osteria,trattoria,bar,cafe,caffè,caffe,bistro,sushi,kebab,pizza,gelateria,pasticceria,bakery,restaurant,hamburger,wendy,kfc,subway"),
            ("Pharmacy",     "cross.fill",          "FF3B30",
             "farmacia,pharmacy,boots,lloyds,fisiocare,farmacista,drugstore,parafarmacia"),
            ("Fuel",         "fuelpump.fill",       "FF6B00",
             "q8,eni,shell,agip,ip,tamoil,api,gulf,esso,totalenergies,fuel,benzina,gasolio,carburante"),
            ("Shopping",     "bag.fill",            "AF52DE",
             "amazon,zalando,ikea,leroy,bricofer,brico,obi,decathlon,mediaworld,euronics,unieuro,shopping,negozio"),
            ("Clothing",     "tshirt.fill",         "5856D6",
             "zara,h&m,hm,mango,bershka,stradivarius,pull&bear,uniqlo,gap,primark,calzedonia,intimissimi,abbigliamento,clothing,scarpe,shoes"),
            ("Electronics",  "laptopcomputer",      "007AFF",
             "apple store,mediaworld,euronics,unieuro,expert,trony,samsung,electronics,informatica,tech"),
            ("Other",        "ellipsis.circle.fill","8E8E93", ""),
        ]

        for def in defaults {
            let cat = CategoryEntity(context: context)
            cat.id = UUID()
            cat.name = def.name
            cat.icon = def.icon
            cat.color = def.color
            cat.keywords = def.keywords
        }
    }
}
