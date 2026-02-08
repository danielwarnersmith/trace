//
//  ContentView.swift
//  Trace
//
//  Open a session folder, play review audio, show current offset_ms.
//

import SwiftUI
import UniformTypeIdentifiers

private let voiceNoteDateFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

struct ContentView: View {
    @State private var sessionRoot: URL?
    @State private var session: Session?
    @State private var playback: PlaybackService?
    @StateObject private var recording = RecordingService()
    @State private var showFolderPicker = false
    @State private var loadError: String?

    var body: some View {
        NavigationStack {
            Group {
                if let playback {
                    playbackView(playback)
                } else if let loadError {
                    errorView(loadError)
                } else if sessionRoot != nil {
                    ProgressView("Loading…")
                } else {
                    openSessionView
                }
            }
            .padding()
        }
        .fileImporter(
            isPresented: $showFolderPicker,
            allowedContentTypes: [.folder],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                _ = url.startAccessingSecurityScopedResource()
                sessionRoot = url
                SharedState.setSessionRoot(url)
                loadSessionAndPlayback()
            case .failure(let err):
                loadError = err.localizedDescription
            }
        }
    }

    private var openSessionView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.badge.plus")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Open session folder")
                .font(.headline)
            Text("Choose a TRACE session directory containing session.json and media/.")
                .font(.caption)
                .multilineTextAlignment(.center)
            Button("Open…") {
                showFolderPicker = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(.orange)
            Text(message)
                .font(.caption)
                .multilineTextAlignment(.center)
            Button("Open another session") {
                loadError = nil
                sessionRoot = nil
                session = nil
                playback = nil
            }
        }
    }

    private func playbackView(_ playback: PlaybackService) -> some View {
        VStack(spacing: 20) {
            Text("Review audio")
                .font(.headline)
            HStack(spacing: 16) {
                Button(action: { playback.togglePlayPause() }) {
                    Image(systemName: playback.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 44))
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Offset: \(playback.currentOffsetMs) ms")
                        .font(.subheadline.monospacedDigit())
                    if let dur = playback.durationMs {
                        Text("Duration: \(dur) ms")
                            .font(.caption.monospacedDigit())
                    }
                }
            }
            if let err = playback.error {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Button(action: { toggleVoiceNote(playback: playback) }) {
                HStack(spacing: 6) {
                    Image(systemName: recording.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.title2)
                    Text(recording.isRecording ? "Stop voice note" : "Voice note")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(recording.isRecording ? .red : .accentColor)
            if let err = recording.error {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let root = sessionRoot {
                NavigationLink("Digest") {
                    DigestView(sessionRoot: root)
                }
                NavigationLink("Actions") {
                    ActionsView(sessionRoot: root)
                }
            }
            Button("Open another session") {
                SharedState.clearSessionRoot()
                sessionRoot = nil
                session = nil
                self.playback = nil
                loadError = nil
            }
            .font(.caption)
        }
        .onChange(of: playback.currentOffsetMs) { _, new in
            SharedState.currentOffsetMs = new
        }
    }

    private func toggleVoiceNote(playback: PlaybackService) {
        if recording.isRecording {
            guard let result = recording.stopRecording() else { return }
            let id = ulid()
            let mediaPath = "media/\(id).m4a"
            let createdAt = voiceNoteDateFormatter.string(from: Date())
            let payload = VoiceNotePayload(
                id: id,
                created_at: createdAt,
                media_path: mediaPath,
                offset_ms: result.offsetMs,
                duration_ms: result.durationMs
            )
            if let root = sessionRoot, appendVoiceNote(sessionRoot: root, payload: payload, audioSourceURL: result.fileURL) == nil {
                _ = PendingVoiceNotes.flush(sessionRoot: root)
            } else {
                PendingVoiceNotes.add(payload: payload, audioSourceURL: result.fileURL)
            }
        } else {
            _ = recording.startRecording(offsetMs: playback.currentOffsetMs)
        }
    }

    private func loadSessionAndPlayback() {
        loadError = nil
        guard let root = sessionRoot else { return }
        do {
            let s = try loadSession(from: root)
            session = s
            let svc = PlaybackService(sessionRoot: root, session: s)
            svc.load()
            playback = svc
            _ = PendingMarkers.flush(sessionRoot: root)
            _ = PendingVoiceNotes.flush(sessionRoot: root)
        } catch {
            loadError = error.localizedDescription
        }
    }
}

#Preview {
    ContentView()
}
