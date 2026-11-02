import Foundation

/// Must match OCCASIONS in supabase/functions/score-fit/prompt.ts.
enum Occasion: String, Codable, CaseIterable, Identifiable {
    case work, formal, wedding, party, date, casual, festive, gym

    var id: String { rawValue }

    var label: String {
        switch self {
        case .work: "Work"
        case .formal: "Interview"
        case .wedding: "Wedding"
        case .party: "Party"
        case .date: "Date Night"
        case .casual: "Brunch"
        case .festive: "Festive"
        case .gym: "Gym"
        }
    }

    var emoji: String {
        switch self {
        case .work: "💼"
        case .formal: "👔"
        case .wedding: "💍"
        case .party: "🪩"
        case .date: "🌹"
        case .casual: "☕️"
        case .festive: "🪔"
        case .gym: "🏋️"
        }
    }
}
