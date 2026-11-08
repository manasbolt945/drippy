import PhotosUI
import PostHog
import SwiftUI

/// Home screen: full-screen camera, Snapchat-style.
struct CameraView: View {
    @StateObject private var camera = CameraController()
    @State private var occasion: Occasion?
    @State private var pickerItem: PhotosPickerItem?
    @State private var photo: CapturedPhoto?
    @State private var showHistory = false
    @State private var isCapturing = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            preview.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                Spacer()
                OccasionPicker(selection: $occasion)
                    .padding(.bottom, 20)
                bottomBar
            }
            .padding(.bottom, 12)
        }
        .task { await camera.start() }
        .onDisappear { camera.stop() }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                    photo = CapturedPhoto(image: image)
                    PostHogSDK.shared.capture("photo_added", properties: ["source": "upload"])
                }
                pickerItem = nil
            }
        }
        .fullScreenCover(item: $photo) { photo in
            ScanFlowView(image: photo.image, occasionHint: occasion)
        }
        .sheet(isPresented: $showHistory) {
            HistoryView()
        }
    }

    @ViewBuilder private var preview: some View {
        switch camera.status {
        case .ready, .starting:
            CameraPreview(session: camera.session)
        case .unauthorized:
            placeholder("Camera access is off", "Enable it in Settings, or pick a photo from your library.")
        case .unavailable:
            placeholder("No camera available", "Pick an outfit photo from your library instead.")
        }
    }

    private func placeholder(_ title: String, _ detail: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "camera.fill").font(.largeTitle)
            Text(title).font(.headline)
            Text(detail).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private var topBar: some View {
        HStack {
            CircleButton(systemImage: "clock.arrow.circlepath") {
                showHistory = true
                PostHogSDK.shared.capture("history_opened", properties: ["from": "camera"])
            }
            Spacer()
            Text("FitScore").font(.headline.weight(.heavy)).shadow(radius: 4)
            Spacer()
            CircleButton(systemImage: camera.flashOn ? "bolt.fill" : "bolt.slash.fill") { camera.flashOn.toggle() }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private var bottomBar: some View {
        HStack {
            PhotosPicker(selection: $pickerItem, matching: .images) {
                Image(systemName: "photo.on.rectangle")
                    .font(.title2)
                    .frame(width: 52, height: 52)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
            Spacer()
            Button(action: capture) {
                Circle()
                    .strokeBorder(.white, lineWidth: 6)
                    .frame(width: 84, height: 84)
                    .overlay(Circle().fill(.white.opacity(isCapturing ? 0.6 : 0.15)).padding(10))
            }
            .disabled(camera.status != .ready || isCapturing)
            .accessibilityLabel("Take photo")
            Spacer()
            CircleButton(systemImage: "arrow.triangle.2.circlepath.camera", size: 52) { camera.flip() }
                .disabled(camera.status != .ready)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 28)
    }

    private func capture() {
        isCapturing = true
        Task {
            defer { isCapturing = false }
            if let image = try? await camera.capture() {
                photo = CapturedPhoto(image: image)
                PostHogSDK.shared.capture("photo_added", properties: ["source": "camera"])
            }
        }
    }
}

struct CapturedPhoto: Identifiable {
    let id = UUID()
    let image: UIImage
}

struct CircleButton: View {
    let systemImage: String
    var size: CGFloat = 40
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: size * 0.42, weight: .semibold))
                .frame(width: size, height: size)
                .background(.ultraThinMaterial, in: Circle())
        }
        .foregroundStyle(.white)
    }
}
