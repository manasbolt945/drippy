import PostHog
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
        let attempt = if case .failed = phase { "retry" } else { "initial" }
        var properties: [String: Any] = ["attempt": attempt]
        if let occasionHint { properties["occasion_hint"] = occasionHint.rawValue }
        PostHogSDK.shared.capture("fit_rating_requested", properties: properties)
        PostHogSDK.shared.logger?.info("fit rating requested", attributes: properties)

        phase = .scanning
        Task {
            do {
                let scan = try await ScoringService.score(image, occasionHint: occasionHint)
                var resultProperties: [String: Any] = ["result_status": scan.status.rawValue]
                if let occasionHint { resultProperties["occasion_hint"] = occasionHint.rawValue }
                if scan.status == .scored { resultProperties["score"] = scan.heroScore.value }
                PostHogSDK.shared.capture("fit_rating_completed", properties: resultProperties)
                PostHogSDK.shared.logger?.info("fit rating completed", attributes: resultProperties)
                withAnimation(.spring) { phase = .result(scan) }
            } catch {
                let errorCategory = errorCategory(for: error)
                PostHogSDK.shared.capture("fit_rating_failed", properties: ["error_category": errorCategory])
                PostHogSDK.shared.logger?.warn("fit rating failed", attributes: ["error_category": errorCategory])
                phase = .failed(error.localizedDescription)
            }
        }
    }

    private func errorCategory(for error: Error) -> String {
        guard let scoringError = error as? ScoringError else { return "unknown" }
        switch scoringError {
        case .dailyLimitReached: "daily_limit_reached"
        case .aiBusy: "ai_busy"
        case .failed: "failed"
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
