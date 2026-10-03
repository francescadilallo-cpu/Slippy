import SwiftUI
import VisionKit
import PhotosUI

struct ScannerView: View {
    @Environment(\.managedObjectContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var capturedImage: UIImage?
    @State private var ocrResult: OCRResult?
    @State private var isProcessing = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if let result = ocrResult, let image = capturedImage {
                    OCRPreviewView(
                        ocrResult: result,
                        image: image,
                        onSave: { _ in dismiss() },
                        onRetake: resetScan
                    )
                } else if isProcessing {
                    ProcessingView()
                } else {
                    ScanPickerView(
                        onCamera: { showCamera = true },
                        onLibrary: { showPhotoPicker = true }
                    )
                }
            }
            .navigationTitle("Scan Receipt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Scan Error", isPresented: .init(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
        .sheet(isPresented: $showCamera) {
            DocumentCameraView { image in
                showCamera = false
                processImage(image)
            }
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
        .onChange(of: selectedPhotoItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    processImage(image)
                }
            }
        }
    }

    private func processImage(_ image: UIImage) {
        capturedImage = image
        isProcessing = true
        Task {
            do {
                let result = try await OCRService.shared.recognizeText(in: image)
                await MainActor.run {
                    ocrResult = result
                    isProcessing = false
                    Haptics.success()
                }
            } catch {
                await MainActor.run {
                    isProcessing = false
                    errorMessage = error.localizedDescription
                    Haptics.error()
                }
            }
        }
    }

    private func resetScan() {
        capturedImage = nil
        ocrResult = nil
        isProcessing = false
    }
}

struct ScanPickerView: View {
    let onCamera: () -> Void
    let onLibrary: () -> Void

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 12) {
                Image(systemName: "doc.text.viewfinder")
                    .font(.system(size: 80))
                    .foregroundStyle(Color(hex: "007AFF"))
                Text("Scan a Receipt")
                    .font(.title2.weight(.bold))
                Text("Point your camera at a receipt or\nimport from your photo library.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            VStack(spacing: 12) {
                Button(action: onCamera) {
                    Label("Use Camera", systemImage: "camera.fill")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "007AFF"), in: RoundedRectangle(cornerRadius: 16))
                }

                Button(action: onLibrary) {
                    Label("Choose from Library", systemImage: "photo.fill")
                        .font(.headline)
                        .foregroundStyle(Color(hex: "007AFF"))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "007AFF").opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 48)
        }
    }
}

struct ProcessingView: View {
    @State private var angle: Double = 0

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .stroke(Color(hex: "007AFF").opacity(0.2), lineWidth: 4)
                    .frame(width: 80, height: 80)
                Circle()
                    .trim(from: 0, to: 0.25)
                    .stroke(Color(hex: "007AFF"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(angle))
                Image(systemName: "doc.text.viewfinder")
                    .font(.system(size: 28))
                    .foregroundStyle(Color(hex: "007AFF"))
            }
            .onAppear {
                withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                    angle = 360
                }
            }
            Text("Reading receipt…")
                .font(.headline)
            Text("Extracting text with OCR")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - VisionKit wrapper

struct DocumentCameraView: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let vc = VNDocumentCameraViewController()
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onCapture: onCapture) }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onCapture: (UIImage) -> Void
        init(onCapture: @escaping (UIImage) -> Void) { self.onCapture = onCapture }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController,
                                          didFinishWith scan: VNDocumentCameraScan) {
            controller.dismiss(animated: true)
            let image = scan.imageOfPage(at: 0)
            onCapture(image)
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true)
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController,
                                          didFailWithError error: Error) {
            controller.dismiss(animated: true)
        }
    }
}
