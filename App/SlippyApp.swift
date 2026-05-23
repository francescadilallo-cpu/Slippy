import SwiftUI

@main
struct SlippyApp: App {
    let persistence = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.managedObjectContext, persistence.container.viewContext)
        }
    }
}

struct RootView: View {
    @Environment(\.managedObjectContext) private var context
    @State private var showOnboarding = !UserDefaults.standard.bool(forKey: "hasSeenOnboarding")

    var body: some View {
        if showOnboarding {
            OnboardingView(isPresented: $showOnboarding)
        } else {
            MainTabView()
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var showScanner = false

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tag(0)
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }
                ReceiptListView()
                    .tag(1)
                    .tabItem {
                        Label("Receipts", systemImage: "list.bullet.rectangle.fill")
                    }
                SettingsView()
                    .tag(2)
                    .tabItem {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
            }
            .tint(Color(hex: "007AFF"))

            // Floating scan button
            Button {
                showScanner = true
                Haptics.impact(.medium)
            } label: {
                ZStack {
                    Circle()
                        .fill(Color(hex: "007AFF"))
                        .frame(width: 56, height: 56)
                        .shadow(color: Color(hex: "007AFF").opacity(0.4), radius: 8, y: 4)
                    Image(systemName: "camera.viewfinder")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .offset(y: -24)
        }
        .fullScreenCover(isPresented: $showScanner) {
            ScannerView()
        }
    }
}

struct OnboardingView: View {
    @Binding var isPresented: Bool

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            VStack(spacing: 24) {
                // Illustration
                ZStack {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color(hex: "007AFF").opacity(0.1))
                        .frame(width: 160, height: 160)
                    VStack(spacing: 4) {
                        Image(systemName: "doc.text.viewfinder")
                            .font(.system(size: 72))
                            .foregroundStyle(Color(hex: "007AFF"))
                        // Smile curve
                        Path { path in
                            path.move(to: CGPoint(x: 20, y: 0))
                            path.addQuadCurve(to: CGPoint(x: 60, y: 0),
                                              control: CGPoint(x: 40, y: 12))
                        }
                        .stroke(Color(hex: "30D158"), lineWidth: 3)
                        .frame(width: 80, height: 12)
                    }
                }

                VStack(spacing: 8) {
                    Text("Slippy")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(hex: "007AFF"))
                    Text("Snap your slip.\nKnow your spending.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(alignment: .leading, spacing: 16) {
                    FeatureRow(icon: "camera.viewfinder", color: "007AFF", title: "Scan receipts instantly", subtitle: "OCR in Italian and English")
                    FeatureRow(icon: "tag.fill",           color: "AF52DE", title: "Auto-categorized",        subtitle: "Smart keyword matching")
                    FeatureRow(icon: "chart.bar.fill",     color: "30D158", title: "Spending insights",       subtitle: "Monthly charts and trends")
                    FeatureRow(icon: "sparkles",           color: "FF9500", title: "AI saving tips",          subtitle: "Powered by Claude")
                }
                .padding(.horizontal, 8)
            }
            .padding(.horizontal, 32)

            Spacer()

            Button {
                UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")
                isPresented = false
            } label: {
                Text("Get Started")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "007AFF"), in: RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 48)
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let color: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: color).opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color(hex: color))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline).fontWeight(.semibold)
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
    }
}
