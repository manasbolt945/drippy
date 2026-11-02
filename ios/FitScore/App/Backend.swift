import Foundation
import Supabase

/// Shared Supabase client and the JSON decoder for rows coming back from Postgres.
enum Backend {
    static let client = SupabaseClient(supabaseURL: AppConfig.supabaseURL, supabaseKey: AppConfig.supabaseAnonKey)

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let string = try decoder.singleValueContainer().decode(String.self)
            if let date = parsePostgresTimestamp(string) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Bad date \(string)"))
        }
        return decoder
    }()

    /// Postgres timestamptz looks like `2026-10-27T12:23:45.123456+00:00`; ISO8601DateFormatter
    /// can't read microseconds, so the fractional part is dropped before parsing.
    private static func parsePostgresTimestamp(_ string: String) -> Date? {
        let trimmed = string.replacingOccurrences(of: #"\.\d+"#, with: "", options: .regularExpression)
        return ISO8601DateFormatter().date(from: trimmed)
    }
}

/// Keeps the user signed in. Everyone starts as an anonymous user so the first scan
/// needs zero setup; accounts (Sign in with Apple) arrive with the social features.
@Observable
@MainActor
final class SessionModel {
    private(set) var isSignedIn = false
    private(set) var error: String?

    func signInIfNeeded() async {
        do {
            _ = try await Backend.client.auth.session
            isSignedIn = true
        } catch {
            do {
                try await Backend.client.auth.signInAnonymously()
                isSignedIn = true
            } catch {
                self.error = "Couldn't connect. Check your internet connection."
            }
        }
    }
}
