import Supabase
import UIKit

enum ScoringError: LocalizedError {
    case dailyLimitReached
    case aiBusy
    case failed

    var errorDescription: String? {
        switch self {
        case .dailyLimitReached: "You've used all your free fit checks for today. Come back tomorrow!"
        case .aiBusy: "Our stylist is swamped right now. Try again in a moment."
        case .failed: "Something went wrong rating your fit. Please try again."
        }
    }
}

enum ScoringService {
    private struct Request: Encodable {
        let image_base64: String
        let occasion_hint: String?
    }

    /// Sends the photo to the score-fit edge function and returns the saved scan.
    static func score(_ image: UIImage, occasionHint: Occasion?) async throws -> Scan {
        guard let jpeg = image.normalized().jpegData(compressionQuality: 0.8) else { throw ScoringError.failed }
        let request = Request(image_base64: jpeg.base64EncodedString(), occasion_hint: occasionHint?.rawValue)
        do {
            return try await Backend.client.functions.invoke(
                "score-fit",
                options: FunctionInvokeOptions(body: request, timeoutInterval: 90),
                decoder: Backend.decoder
            )
        } catch FunctionsError.httpError(let code, _) {
            switch code {
            case 429: throw ScoringError.dailyLimitReached
            case 503: throw ScoringError.aiBusy
            default: throw ScoringError.failed
            }
        } catch {
            throw ScoringError.failed
        }
    }
}
