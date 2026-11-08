import PostHog
import SwiftUI

/// Hero score, best-for occasions, full occasion breakdown, tips, and share actions.
struct ResultView: View {
    let scan: Scan
    let image: UIImage
    var onDone: (() -> Void)?

    @State private var showAllOccasions = false
    @State private var shareCard: UIImage?
    @State private var instagramMissing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                header
                if scan.status == .scored {
                    scored
                } else {
                    notScored
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 40)
        }
        .background(Color.black.ignoresSafeArea())
        .foregroundStyle(.white)
        .task { renderShareCard() }
        .alert("Instagram isn't installed", isPresented: $instagramMissing) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Use the share button to post your FitScore anywhere else.")
        }
    }

    private var header: some View {
        ZStack(alignment: .topLeading) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(height: 360)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 24))
            if let onDone {
                CircleButton(systemImage: "xmark", action: onDone).padding(12)
            }
        }
    }

    @ViewBuilder private var scored: some View {
        let hero = scan.heroScore
        ScoreRing(score: hero.value, label: hero.label)

        if let headline = scan.headline {
            Text(headline)
                .font(.title3.weight(.bold))
                .multilineTextAlignment(.center)
        }

        bestFor
        if let breakdown = scan.breakdown { breakdownBars(breakdown) }
        allOccasions
        tips
        shareButtons
    }

    private var bestFor: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Best for")
            HStack(spacing: 8) {
                ForEach(scan.bestFor) { item in
                    VStack(spacing: 4) {
                        Text(item.occasion.emoji).font(.title2)
                        Text(item.occasion.label).font(.caption.weight(.semibold))
                        Text("\(item.score)").font(.headline.weight(.black)).foregroundStyle(Color.forScore(item.score))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }

    private func breakdownBars(_ b: Scan.Breakdown) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Breakdown")
            bar("Color harmony", b.colorHarmony)
            bar("Fit", b.fit)
            bar("Styling", b.styling)
            bar("Cohesion", b.cohesion)
        }
    }

    private func bar(_ title: String, _ value: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.subheadline)
                Spacer()
                Text("\(value)").font(.subheadline.weight(.bold))
            }
            GeometryReader { geo in
                Capsule().fill(.white.opacity(0.12))
                    .overlay(alignment: .leading) {
                        Capsule().fill(Color.forScore(value)).frame(width: geo.size.width * CGFloat(value) / 100)
                    }
            }
            .frame(height: 8)
        }
    }

    private var allOccasions: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation { showAllOccasions.toggle() }
                PostHogSDK.shared.capture("occasion_breakdown_toggled", properties: ["is_expanded": showAllOccasions])
            } label: {
                HStack {
                    sectionTitle("Every occasion")
                    Spacer()
                    Image(systemName: "chevron.down").rotationEffect(.degrees(showAllOccasions ? 180 : 0))
                }
            }
            if showAllOccasions {
                ForEach(scan.occasions ?? []) { item in
                    HStack(alignment: .top, spacing: 12) {
                        Text(item.occasion.emoji).font(.title3)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.occasion.label).font(.subheadline.weight(.semibold))
                            Text(item.reason).font(.footnote).foregroundStyle(.white.opacity(0.7))
                        }
                        Spacer()
                        Text("\(item.score)%")
                            .font(.headline.weight(.black))
                            .foregroundStyle(Color.forScore(item.score))
                    }
                    .padding(12)
                    .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
                }
            }
        }
    }

    @ViewBuilder private var tips: some View {
        if let tips = scan.tips, !tips.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionTitle("Level it up")
                ForEach(tips, id: \.self) { tip in
                    Label(tip, systemImage: "wand.and.stars")
                        .font(.subheadline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    @ViewBuilder private var shareButtons: some View {
        if let shareCard {
            VStack(spacing: 12) {
                PrimaryButton(title: "Share to Instagram Story", systemImage: "camera.circle.fill") {
                    if ShareService.shareToInstagramStories(shareCard) {
                        PostHogSDK.shared.capture("instagram_story_shared")
                    } else {
                        instagramMissing = true
                    }
                }
                ShareLink(
                    item: Image(uiImage: shareCard),
                    preview: SharePreview("My FitScore", image: Image(uiImage: shareCard))
                ) {
                    Label("Share anywhere", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(.white.opacity(0.12), in: Capsule())
                }
                .simultaneousGesture(TapGesture().onEnded {
                    PostHogSDK.shared.capture("share_sheet_opened")
                })
            }
        }
    }

    private var notScored: some View {
        VStack(spacing: 12) {
            Image(systemName: "eye.trianglebadge.exclamationmark").font(.largeTitle)
            Text("We couldn't rate this one").font(.title3.weight(.bold))
            Text(scan.message ?? "Try a photo where your full outfit is visible.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(.top, 12)
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title.uppercased()).font(.caption.weight(.heavy)).foregroundStyle(.white.opacity(0.6))
    }

    @MainActor private func renderShareCard() {
        guard scan.status == .scored, shareCard == nil else { return }
        let renderer = ImageRenderer(content: ShareCardView(scan: scan, image: image))
        renderer.scale = 3
        shareCard = renderer.uiImage
    }
}
