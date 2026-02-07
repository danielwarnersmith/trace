//
//  PlaybackService.swift
//  Trace
//
//  Plays the session's review audio and exposes current offset in milliseconds from start.
//

import AVFoundation
import Combine
import Foundation

@MainActor
final class PlaybackService: ObservableObject {
    /// Current playback position in milliseconds from start (0 at start).
    @Published private(set) var currentOffsetMs: Int = 0
    /// Whether the player is currently playing.
    @Published private(set) var isPlaying: Bool = false
    /// Total duration in milliseconds, if known.
    @Published private(set) var durationMs: Int? = nil
    /// Error loading or playing (e.g. no review audio).
    @Published private(set) var error: String? = nil

    private var player: AVPlayer?
    private var timeObserver: Any?
    private let sessionRoot: URL
    private let session: Session

    init(sessionRoot: URL, session: Session) {
        self.sessionRoot = sessionRoot
        self.session = session
    }

    /// Load review audio and prepare playback. Call after init. Sets error if no review audio.
    func load() {
        error = nil
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            self.error = "Audio session: \(error.localizedDescription)"
            return
        }
        guard let audioURL = session.reviewAudioURL(sessionRoot: sessionRoot) else {
            error = "No review audio in session"
            return
        }
        guard audioURL.isFileURL, FileManager.default.fileExists(atPath: audioURL.path) else {
            error = "Review audio file not found"
            return
        }
        let item = AVPlayerItem(url: audioURL)
        let avPlayer = AVPlayer(playerItem: item)
        self.player = avPlayer

        // Observe duration when available
        Task {
            let dur = await item.asset.load(.duration)
            let ms = Int(CMTimeGetSeconds(dur) * 1000)
            await MainActor.run { self.durationMs = ms }
        }

        // Periodic time observer: publish currentOffsetMs
        let interval = CMTime(seconds: 0.1, preferredTimescale: 600)
        timeObserver = avPlayer.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self else { return }
            let seconds = CMTimeGetSeconds(time)
            guard seconds.isFinite else { return }
            currentOffsetMs = Int(seconds * 1000)
        }
    }

    func play() {
        player?.play()
        isPlaying = true
    }

    func pause() {
        player?.pause()
        isPlaying = false
    }

    func togglePlayPause() {
        if isPlaying { pause() } else { play() }
    }

    func seek(toOffsetMs ms: Int) {
        let time = CMTime(seconds: Double(ms) / 1000, preferredTimescale: 600)
        player?.seek(to: time)
        currentOffsetMs = ms
    }

    deinit {
        if let observer = timeObserver, let p = player {
            p.removeTimeObserver(observer)
        }
    }
}
