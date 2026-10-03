import SwiftUI
import CoreData

struct SettingsView: View {
    @Environment(\.managedObjectContext) private var context
    @FetchRequest(fetchRequest: ReceiptEntity.fetchRequest()) private var receipts: FetchedResults<ReceiptEntity>

    @State private var apiKey: String = ""
    @State private var showAPIKey = false
    @State private var showClearConfirmation = false
    @State private var showExportSheet = false
    @State private var exportURL: URL?
    @State private var savedBanner = false

    var appVersion: String {
        (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "1.0"
    }

    var body: some View {
        NavigationStack {
            Form {
                // API Key section
                Section {
                    HStack {
                        if showAPIKey {
                            TextField("sk-ant-...", text: $apiKey)
                                .font(.system(.subheadline, design: .monospaced))
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        } else {
                            SecureField("sk-ant-...", text: $apiKey)
                                .font(.system(.subheadline, design: .monospaced))
                        }
                        Button {
                            showAPIKey.toggle()
                        } label: {
                            Image(systemName: showAPIKey ? "eye.slash" : "eye")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        KeychainService.shared.saveAPIKey(apiKey.trimmingCharacters(in: .whitespaces))
                        withAnimation {
                            savedBanner = true
                        }
                        Haptics.success()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation { savedBanner = false }
                        }
                    } label: {
                        HStack {
                            Text("Save API Key")
                            if savedBanner {
                                Spacer()
                                Label("Saved", systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(Color(hex: "30D158"))
                                    .font(.caption)
                            }
                        }
                    }
                    .disabled(apiKey.trimmingCharacters(in: .whitespaces).isEmpty)

                    if !apiKey.isEmpty {
                        Button(role: .destructive) {
                            apiKey = ""
                            KeychainService.shared.deleteAPIKey()
                        } label: {
                            Text("Remove API Key")
                        }
                    }
                } header: {
                    Label("Claude API Key", systemImage: "key.fill")
                } footer: {
                    Text("Your key is stored securely in the iOS Keychain. Get yours at console.anthropic.com.")
                }

                // Data section
                Section {
                    Button {
                        exportCSV()
                    } label: {
                        Label("Export to CSV", systemImage: "square.and.arrow.up")
                    }
                    .disabled(receipts.isEmpty)

                    Button(role: .destructive) {
                        showClearConfirmation = true
                    } label: {
                        Label("Clear All Data", systemImage: "trash")
                    }
                    .disabled(receipts.isEmpty)
                } header: {
                    Label("Data", systemImage: "externaldrive")
                } footer: {
                    Text("\(receipts.count) receipt\(receipts.count == 1 ? "" : "s") stored locally.")
                }

                // About section
                Section {
                    LabeledContent("Version", value: appVersion)
                    LabeledContent("Minimum iOS", value: "17.0")
                    LabeledContent("OCR Languages", value: "Italian, English")
                } header: {
                    Label("About Slippy", systemImage: "info.circle")
                } footer: {
                    Text("Snap your slip. Know your spending.")
                        .italic()
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                apiKey = KeychainService.shared.getAPIKey() ?? ""
            }
            .confirmationDialog("Clear All Data?", isPresented: $showClearConfirmation, titleVisibility: .visible) {
                Button("Delete All Receipts", role: .destructive) {
                    clearAllData()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete all \(receipts.count) receipts. This action cannot be undone.")
            }
            .sheet(isPresented: $showExportSheet) {
                if let url = exportURL {
                    ShareSheet(activityItems: [url])
                }
            }
        }
    }

    private func exportCSV() {
        let csv = Array(receipts).toCSV()
        let filename = "slippy-export-\(Date().shortDateString.replacingOccurrences(of: " ", with: "-")).csv"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try? csv.write(to: url, atomically: true, encoding: .utf8)
        exportURL = url
        showExportSheet = true
    }

    private func clearAllData() {
        for receipt in receipts {
            context.delete(receipt)
        }
        PersistenceController.shared.save()
        Haptics.impact(.heavy)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
