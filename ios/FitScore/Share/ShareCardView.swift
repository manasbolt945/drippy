import SwiftUI

/// 9:16 story card rendered to an image with ImageRenderer (360×640 pt × 3 = 1080×1920 px).
struct ShareCardView: View {
    let scan: Scan
    let image: UIImage

    var body: some View {
        let hero = scan.heroScore
        ZStack(alignment: .bottom) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 360, height: 640)
                .clipped()
            LinearGradient(colors: [.clear, .black.opacity(0.85)], startPoint: .center, endPoint: .bottom)

            VStack(spacing: 14) {
                ScoreRing(score: hero.value, label: hero.label, diameter: 140, animated: false)
                    .background(Circle().fill(.black.opacity(0.55)))
                if let headline = scan.headline {
                    Text(headline)
                        .font(.system(size: 19, weight: .bold))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                HStack(spacing: 6) {
                    ForEach(scan.bestFor) { item in
                        Text("\(item.occasion.emoji) \(item.occasion.label) \(item.score)")
                            .font(.system(size: 13, weight: .semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.white.opacity(0.18), in: Capsule())
                    }
                }
                Text(AppConfig.shareTagline)
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(.white.opacity(0.75))
                    .padding(.top, 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 36)
        }
        .frame(width: 360, height: 640)
        .foregroundStyle(.white)
        .environment(\.colorScheme, .dark)
    }
}
