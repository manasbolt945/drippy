import UIKit

extension UIImage {
    /// Redraws upright (bakes in EXIF orientation / mirroring) with the longest side capped,
    /// which keeps uploads small and AI costs predictable.
    func normalized(maxDimension: CGFloat = 1280) -> UIImage {
        let scale = min(1, maxDimension / max(size.width, size.height))
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
