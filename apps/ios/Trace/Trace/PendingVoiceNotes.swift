//
//  PendingVoiceNotes.swift
//  Trace
//
//  Queue pending voice notes (payload + local audio file) for upload when session is available.
//

import Foundation

private let pendingKey = "pendingVoiceNotes"
private let pendingDirName = "pending_voice_notes"

/// Pending voice note: payload and path to local audio file (relative to app's pending dir).
struct PendingVoiceNote: Codable {
    let id: String
    let created_at: String
    let media_path: String
    let offset_ms: Int
    let duration_ms: Int
    let localFileName: String
}

enum PendingVoiceNotes {
    private static var pendingDirectory: URL? {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        let dir = docs?.appending(path: pendingDirName)
        if let d = dir {
            try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        }
        return dir
    }

    static func add(payload: VoiceNotePayload, audioSourceURL: URL) {
        guard let dir = pendingDirectory else { return }
        let destURL = dir.appending(path: "\(payload.id).m4a")
        try? FileManager.default.copyItem(at: audioSourceURL, to: destURL)
        let pending = PendingVoiceNote(
            id: payload.id,
            created_at: payload.created_at,
            media_path: payload.media_path,
            offset_ms: payload.offset_ms,
            duration_ms: payload.duration_ms,
            localFileName: "\(payload.id).m4a"
        )
        var list = load()
        list.append(pending)
        save(list)
    }

    static func load() -> [PendingVoiceNote] {
        guard let defaults = UserDefaults(suiteName: SharedState.appGroupID),
              let data = defaults.data(forKey: pendingKey),
              let list = try? JSONDecoder().decode([PendingVoiceNote].self, from: data) else { return [] }
        return list
    }

    private static func save(_ list: [PendingVoiceNote]) {
        guard let defaults = UserDefaults(suiteName: SharedState.appGroupID),
              let data = try? JSONEncoder().encode(list) else { return }
        defaults.set(data, forKey: pendingKey)
    }

    /// Write all pending voice notes to session and clear the queue. Returns number written.
    static func flush(sessionRoot: URL) -> Int {
        var list = load()
        guard let dir = pendingDirectory else { return 0 }
        var written = 0
        var remaining: [PendingVoiceNote] = []
        for pending in list {
            let localURL = dir.appending(path: pending.localFileName)
            guard FileManager.default.fileExists(atPath: localURL.path) else { remaining.append(pending); continue }
            let payload = VoiceNotePayload(
                id: pending.id,
                created_at: pending.created_at,
                media_path: pending.media_path,
                offset_ms: pending.offset_ms,
                duration_ms: pending.duration_ms
            )
            if appendVoiceNote(sessionRoot: sessionRoot, payload: payload, audioSourceURL: localURL) == nil {
                try? FileManager.default.removeItem(at: localURL)
                written += 1
            } else {
                remaining.append(pending)
            }
        }
        save(remaining)
        return written
    }

    static func count() -> Int { load().count }
}
