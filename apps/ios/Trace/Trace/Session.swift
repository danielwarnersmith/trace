//
//  Session.swift
//  Trace
//
//  Session model decoded from session.json. Resolves review audio URL from session root.
//

import Foundation

/// A media item in session.json (path relative to session root, e.g. media/<id>.m4a).
struct MediaItem: Codable {
    let id: String
    let kind: String
    let path: String
    let mime: String
    let created_at: String
    let start_offset_ms: Int
    let duration_ms: Int?
}

/// Session decoded from session.json. Paths in media are relative to session root.
struct Session: Codable {
    let id: String
    let created_at: String
    let updated_at: String
    let status: String
    let start_time: String
    let timeline_path: String
    let markers_path: String
    let transcript_path: String?
    let voice_notes_path: String?
    let digest_path: String?
    let media: [MediaItem]
}

extension Session {
    /// First media item with kind "audio" or "video" (convention: review/primary playback).
    var reviewMedia: MediaItem? {
        media.first { item in
            item.kind == "audio" || item.kind == "video"
        }
    }

    /// Resolves the review audio file URL given the session root directory URL.
    /// Returns nil if no review media or path cannot be resolved.
    func reviewAudioURL(sessionRoot: URL) -> URL? {
        guard let item = reviewMedia else { return nil }
        let url = sessionRoot.appending(path: item.path)
        return url.isFileURL ? url : nil
    }
}

/// Load session.json from a session root directory URL.
func loadSession(from sessionRoot: URL) throws -> Session {
    let sessionURL = sessionRoot.appending(path: "session.json")
    let data = try Data(contentsOf: sessionURL)
    return try JSONDecoder().decode(Session.self, from: data)
}
