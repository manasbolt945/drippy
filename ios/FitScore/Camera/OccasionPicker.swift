import SwiftUI

/// "Where are you headed?" chips. Optional: nil means score for overall style.
struct OccasionPicker: View {
    @Binding var selection: Occasion?

    var body: some View {
        VStack(spacing: 8) {
            Text("Where are you headed?")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
                .shadow(radius: 3)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip(title: "✨ Anywhere", isSelected: selection == nil) { selection = nil }
                    ForEach(Occasion.allCases) { occasion in
                        chip(title: "\(occasion.emoji) \(occasion.label)", isSelected: selection == occasion) {
                            selection = occasion
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func chip(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? AnyShapeStyle(.white) : AnyShapeStyle(.ultraThinMaterial), in: Capsule())
                .foregroundStyle(isSelected ? .black : .white)
        }
    }
}
