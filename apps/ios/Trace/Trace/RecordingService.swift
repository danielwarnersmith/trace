//
//  RecordingService.swift
//  Trace
//
//  Tap-to-toggle voice note recording; returns offset_ms at start and duration_ms.
//

import AVFoundation
import Combine
import Foundation

@MainActor
final class RecordingService: ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var error: String?

    private var recorder: AVAudioRecorder?
    private var startOffsetMs: Int = 0
    private var recordingStartTime: Date?

    /// Start recording. Call with current playback offset_ms. Returns true if started.
    func startRecording(offsetMs: Int) -> Bool {
        error = nil
        startOffsetMs = offsetMs
        recordingStartTime = Date()
        #if os(iOS)
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            self.error = error.localizedDescription
            return false
        }
        #endif
        let tempDir = FileManager.default.temporaryDirectory
        let id = ulid()
        let url = tempDir.appending(path: "voice_\(id).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]
        do {
            recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder?.record()
            isRecording = true
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    /// Stop recording. Returns (offsetMs at start, durationMs, recordedFileURL) or nil on failure.
    func stopRecording() -> (offsetMs: Int, durationMs: Int, fileURL: URL)? {
        guard let rec = recorder, isRecording else { return nil }
        rec.stop()
        isRecording = false
        let url = rec.url
        recorder = nil
        guard let start = recordingStartTime else { return nil }
        let durationMs = Int(Date().timeIntervalSince(start) * 1000)
        return (startOffsetMs, durationMs, url)
    }
}
