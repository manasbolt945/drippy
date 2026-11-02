import UIKit

enum ShareService {
    /// Opens Instagram's story composer with the card as a full-screen background.
    /// Returns false when Instagram isn't installed. Only works on a real device.
    @MainActor
    @discardableResult
    static func shareToInstagramStories(_ card: UIImage) -> Bool {
        guard let url = URL(string: "instagram-stories://share?source_application=\(AppConfig.facebookAppID)"),
              UIApplication.shared.canOpenURL(url),
              let png = card.pngData() else { return false }

        UIPasteboard.general.setItems(
            [["com.instagram.sharedSticker.backgroundImage": png]],
            options: [.expirationDate: Date().addingTimeInterval(5 * 60)]
        )
        UIApplication.shared.open(url)
        return true
    }
}
