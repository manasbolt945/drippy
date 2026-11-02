@preconcurrency import AVFoundation
import UIKit

/// Owns the capture session. All session work happens on `queue`; published state on main.
/// That queue discipline is what makes the unchecked Sendable conformance safe.
final class CameraController: NSObject, ObservableObject, @unchecked Sendable {
    enum Status { case starting, ready, unauthorized, unavailable }
    enum CameraError: Error { case notReady, noImage }

    @Published private(set) var status: Status = .starting
    /// Back camera by default: mirror selfies are shot with the back camera facing the mirror.
    @Published private(set) var position: AVCaptureDevice.Position = .back
    @Published var flashOn = false

    let session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let queue = DispatchQueue(label: "app.fitscore.camera")
    private var input: AVCaptureDeviceInput?
    private var pendingCapture: (continuation: CheckedContinuation<UIImage, Error>, mirrored: Bool)?

    func start() async {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            break
        case .notDetermined:
            guard await AVCaptureDevice.requestAccess(for: .video) else { return publish(.unauthorized) }
        default:
            return publish(.unauthorized)
        }
        let position = position
        queue.async { [self] in
            if input == nil {
                guard configure(position: position) else { return publish(.unavailable) }
            }
            if !session.isRunning { session.startRunning() }
            publish(.ready)
        }
    }

    func stop() {
        queue.async { [self] in
            if session.isRunning { session.stopRunning() }
        }
    }

    func flip() {
        let newPosition: AVCaptureDevice.Position = position == .back ? .front : .back
        queue.async { [self] in
            if configure(position: newPosition) {
                DispatchQueue.main.async { self.position = newPosition }
            }
        }
    }

    func capture() async throws -> UIImage {
        guard status == .ready else { throw CameraError.notReady }
        let mirrored = position == .front
        let flashOn = flashOn
        return try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                pendingCapture = (continuation, mirrored)
                let settings = AVCapturePhotoSettings()
                if flashOn, photoOutput.supportedFlashModes.contains(.on) {
                    settings.flashMode = .on
                }
                photoOutput.capturePhoto(with: settings, delegate: self)
            }
        }
    }

    /// Runs on `queue`. Swaps the camera input; adds the photo output on first use.
    private func configure(position: AVCaptureDevice.Position) -> Bool {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let newInput = try? AVCaptureDeviceInput(device: device) else { return false }

        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo
        if let input { session.removeInput(input) }
        guard session.canAddInput(newInput) else {
            if let input { session.addInput(input) }
            return false
        }
        session.addInput(newInput)
        input = newInput
        if !session.outputs.contains(photoOutput), session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
        }
        return true
    }

    private func publish(_ status: Status) {
        DispatchQueue.main.async { self.status = status }
    }
}

extension CameraController: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let pending = pendingCapture else { return }
        pendingCapture = nil
        if let error { return pending.continuation.resume(throwing: error) }
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else {
            return pending.continuation.resume(throwing: CameraError.noImage)
        }
        // Front-camera shots are saved un-mirrored; flip them to match the preview the user saw.
        pending.continuation.resume(returning: pending.mirrored ? image.withHorizontallyFlippedOrientation() : image)
    }
}
