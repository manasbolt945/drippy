import SwiftUI

extension Color {
    /// Red → orange → yellow → green as the score rises.
    static func forScore(_ score: Int) -> Color {
        switch score {
        case ..<50: Color(red: 1.0, green: 0.33, blue: 0.33)
        case ..<65: Color(red: 1.0, green: 0.6, blue: 0.2)
        case ..<80: Color(red: 1.0, green: 0.85, blue: 0.25)
        default: Color(red: 0.3, green: 0.9, blue: 0.55)
        }
    }
}

struct ScoreRing: View {
    let score: Int
    let label: String
    var diameter: CGFloat = 170
    /// ImageRenderer never runs onAppear, so share cards pass false to draw the ring filled.
    var animated = true

    @State private var progress: Double = 0

    var body: some View {
        ZStack {
            Circle().stroke(.white.opacity(0.15), lineWidth: diameter * 0.08)
            Circle()
                .trim(from: 0, to: animated ? progress : Double(score) / 100)
                .stroke(Color.forScore(score), style: StrokeStyle(lineWidth: diameter * 0.08, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(score)")
                    .font(.system(size: diameter * 0.36, weight: .black, design: .rounded))
                    .contentTransition(.numericText(value: Double(score)))
                Text(label.uppercased())
                    .font(.system(size: diameter * 0.075, weight: .bold))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .frame(width: diameter, height: diameter)
        .onAppear {
            guard animated else { return }
            withAnimation(.easeOut(duration: 1.2)) { progress = Double(score) / 100 }
        }
    }
}
