import SwiftUI

/// Photo preview → AI scan → result, presented full-screen over the camera.
struct ScanFlowView: View {
    let image: UIImage
    let occasionHint: Occasion?

    @Environment(\.dismiss) private var dismiss
    @State private var phase: Phase = .preview

    enum Phase {
        case preview
        case scanning
        case result(Scan)
        case failed(String)
    }

    var body: some View {
        switch phase {
        case .result(let scan):
            ResultView(scan: scan, image: image, onDone: { dismiss() })
        default:
            ZStack {
                Color.black.ignoresSafeArea()
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .overlay {
                        if case .scanning = phase { ScanningView() }
                    }
                VStack {
                    HStack {
                        CircleButton(systemImage: "xmark") { dismiss() }
                        Spacer()
                    }
                    Spacer()
                    footer
                }
                .padding(16)
            }
        }
    }

    @ViewBuilder private var footer: some View {
        switch phase {
        case .preview:
            PrimaryButton(title: "Rate my fit", systemImage: "sparkles", action: rate)
        case .failed(let message):
            VStack(spacing: 12) {
                Text(message)
                    .multilineTextAlignment(.center)
                    .padding(12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                PrimaryButton(title: "Try again", systemImage: "arrow.clockwise", action: rate)
            }
        default:
            EmptyView()
        }
    }

    private func rate() {
        phase = .scanning
        Task {
            do {
                let scan = try await ScoringService.score(image, occasionHint: occasionHint)
                withAnimation(.spring) { phase = .result(scan) }
            } catch {
                phase = .failed(error.localizedDescription)
            }
        }
    }
}

struct PrimaryButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(.white, in: Capsule())
                .foregroundStyle(.black)
        }
    }
}
