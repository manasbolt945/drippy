import Foundation

/// A row of the `scans` table, also returned by the score-fit function.
struct Scan: Codable, Identifiable, Hashable {
    enum Status: String, Codable {
        case scored
        case notScorable = "not_scorable"
        case refused
    }

    struct Breakdown: Codable, Hashable {
        let colorHarmony: Int
        let fit: Int
        let styling: Int
        let cohesion: Int

        enum CodingKeys: String, CodingKey {
            case colorHarmony = "color_harmony"
            case fit, styling, cohesion
        }
    }

    struct OccasionScore: Codable, Hashable, Identifiable {
        let occasion: Occasion
        let score: Int
        let reason: String
        var id: Occasion { occasion }
    }

    let id: UUID
    let status: Status
    let message: String?
    let imagePath: String?
    let occasionHint: Occasion?
    let overall: Int?
    let headline: String?
    let breakdown: Breakdown?
    /// Sorted best-first by the server.
    let occasions: [OccasionScore]?
    let tips: [String]?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, status, message, overall, headline, breakdown, occasions, tips
        case imagePath = "image_path"
        case occasionHint = "occasion_hint"
        case createdAt = "created_at"
    }

    /// The big number: the chosen occasion's score if the user picked one, else overall.
    var heroScore: (value: Int, label: String) {
        if let hint = occasionHint, let match = occasions?.first(where: { $0.occasion == hint }) {
            return (match.score, "for \(hint.label)")
        }
        return (overall ?? 0, "Overall")
    }

    var bestFor: [OccasionScore] { Array((occasions ?? []).prefix(3)) }
}
