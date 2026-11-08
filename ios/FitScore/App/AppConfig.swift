import Foundation

/// Values injected from Config/Secrets.xcconfig through Info.plist.
enum AppConfig {
    static let supabaseURL = URL(string: value(for: "SupabaseURL"))!
    static let supabaseAnonKey = value(for: "SupabaseAnonKey")
    static let facebookAppID = value(for: "FacebookAppID")

    /// Shown on share cards so viewers can find the app.
    static let shareTagline = "Rate your fit · FitScore"

    static func optionalValue(for key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !value.isEmpty,
              !value.hasPrefix("$(") else {
            return nil
        }
        return value
    }

    private static func value(for key: String) -> String {
        guard let value = optionalValue(for: key) else {
            fatalError("Missing \(key). Copy ios/Config/Secrets.example.xcconfig to Secrets.xcconfig and fill it in.")
        }
        return value
    }
}
