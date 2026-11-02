import SwiftUI

/// Animated scan line plus rotating status text while the AI works (~5-15 s).
struct ScanningView: View {
    private static let steps = [
        "Spotting your pieces…",
        "Checking color harmony…",
        "Judging the fit…",
        "Trying it at a wedding…",
        "Trying it at the office…",
        "Asking the fashion council…",
    ]

    @State private var lineAtBottom = false
    @State private var step = 0

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                Color.black.opacity(0.35)
                LinearGradient(colors: [.clear, .cyan.opacity(0.7), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: 120)
                    .offset(y: lineAtBottom ? geo.size.height - 60 : -60)
                Text(Self.steps[step])
                    .font(.headline)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .contentTransition(.opacity)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 1.6).repeatForever()) { lineAtBottom = true }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1.8))
                withAnimation { step = (step + 1) % Self.steps.count }
            }
        }
    }
}
