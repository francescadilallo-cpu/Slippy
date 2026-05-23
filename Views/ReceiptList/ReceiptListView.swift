import SwiftUI
import CoreData

struct ReceiptListView: View {
    @Environment(\.managedObjectContext) private var context
    @FetchRequest(
        fetchRequest: ReceiptEntity.fetchRequest(),
        animation: .default
    ) private var receipts: FetchedResults<ReceiptEntity>

    @State private var showScanner = false
    @State private var searchText = ""

    private var filteredReceipts: [ReceiptEntity] {
        guard !searchText.isEmpty else { return Array(receipts) }
        return receipts.filter {
            $0.displayStoreName.localizedCaseInsensitiveContains(searchText)
            || ($0.category?.name ?? "").localizedCaseInsensitiveContains(searchText)
        }
    }

    private var grouped: [(key: String, receipts: [ReceiptEntity])] {
        filteredReceipts.groupedByDate()
    }

    var body: some View {
        NavigationStack {
            Group {
                if receipts.isEmpty {
                    EmptyReceiptListView()
                } else if filteredReceipts.isEmpty {
                    ContentUnavailableView.search(text: searchText)
                } else {
                    List {
                        ForEach(grouped, id: \.key) { group in
                            Section(group.key) {
                                ForEach(group.receipts, id: \.id) { receipt in
                                    NavigationLink {
                                        ReceiptDetailView(receipt: receipt)
                                    } label: {
                                        ReceiptRowView(receipt: receipt)
                                    }
                                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                        Button(role: .destructive) {
                                            delete(receipt)
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Receipts")
            .searchable(text: $searchText, prompt: "Search store or category")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showScanner = true
                    } label: {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showScanner) {
            ScannerView()
        }
    }

    private func delete(_ receipt: ReceiptEntity) {
        context.delete(receipt)
        PersistenceController.shared.save()
        Haptics.impact(.rigid)
    }
}

struct EmptyReceiptListView: View {
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color(hex: "007AFF").opacity(0.1))
                    .frame(width: 120, height: 120)
                Image(systemName: "receipt")
                    .font(.system(size: 48))
                    .foregroundStyle(Color(hex: "007AFF").opacity(0.6))
            }
            VStack(spacing: 8) {
                Text("No receipts yet")
                    .font(.headline)
                Text("Scan your first receipt to start\ntracking your spending.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    }
}
