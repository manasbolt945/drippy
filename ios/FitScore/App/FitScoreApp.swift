import SwiftUI

@main
struct FitScoreApp: App {
    @State private var session = SessionModel()

    var body: some Scene {
        WindowGroup {
            CameraView()
                .environment(session)
                .preferredColorScheme(.dark)
                .task { await session.signInIfNeeded() }
        }
    }
}
