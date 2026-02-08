//
//  PendingMarkers.swift
//  Trace
//
//  Queue pending markers for upload when session is available. Persists in App Group.
//

import Foundation

private let pendingMarkersKey = "pendingMarkers"

struct PendingMarker: Codable {
    let tag: String
    let offset_ms: Int
    let created_at: String
}

enum PendingMarkers {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: SharedState.appGroupID)
    }

    static func add(tag: String, offsetMs: Int) {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let pending = PendingMarker(
            tag: tag,
            offset_ms: offsetMs,
            created_at: f.string(from: Date())
        )
        var list = load()
        list.append(pending)
        save(list)
    }

    static func load() -> [PendingMarker] {
        guard let data = defaults?.data(forKey: pendingMarkersKey),
              let list = try? JSONDecoder().decode([PendingMarker].self, from: data) else { return [] }
        return list
    }

    private static func save(_ list: [PendingMarker]) {
        guard let data = try? JSONEncoder().encode(list) else { return }
        defaults?.set(data, forKey: pendingMarkersKey)
    }

    /// Write all pending markers to session and clear the queue. Returns number written.
    static func flush(sessionRoot: URL) -> Int {
        let list = load()
        var written = 0
        var remaining: [PendingMarker] = []
        for pending in list {
            if appendMarker(sessionRoot: sessionRoot, offsetMs: pending.offset_ms, tag: pending.tag) == nil {
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
