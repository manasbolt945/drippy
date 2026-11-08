import PostHog
import SwiftUI

@main
struct FitScoreApp: App {
    @State private var session = SessionModel()

    init() {
        guard let projectToken = AppConfig.optionalValue(for: "PostHogProjectToken") else {
            reportMissingPostHogConfiguration("POSTHOG_PROJECT_TOKEN")
            return
        }
        guard let host = AppConfig.optionalValue(for: "PostHogHost") else {
            reportMissingPostHogConfiguration("POSTHOG_HOST")
            return
        }

        let config = PostHogConfig(projectToken: projectToken, host: host)
        config.errorTrackingConfig.autoCapture = true
        config.logs.serviceName = "fitscore-ios"
        #if DEBUG
        config.logs.environment = "development"
        #else
        config.logs.environment = "production"
        #endif
        PostHogSDK.shared.setup(config)
    }

    private func reportMissingPostHogConfiguration(_ variable: String) {
        #if DEBUG
        assertionFailure("\(variable) variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once \(variable) is configured")
        #endif
    }

    var body: some Scene {
        WindowGroup {
            CameraView()
                .environment(session)
                .preferredColorScheme(.dark)
                .task { await session.signInIfNeeded() }
        }
    }
}
