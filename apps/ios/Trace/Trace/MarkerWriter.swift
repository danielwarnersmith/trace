//
//  MarkerWriter.swift
//  Trace
//
//  Append marker to markers.jsonl and update session.json.updated_at per MARK codex.
//

import Foundation

private let iso8601: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

/// Appends a marker to the session's markers.jsonl and updates session.json.updated_at.
/// Returns nil on success, or an error message.
func appendMarker(sessionRoot: URL, offsetMs: Int, tag: String) -> String? {
    let markersURL = sessionRoot.appending(path: "markers.jsonl")
    let marker = [
        "id": ulid(),
        "offset_ms": offsetMs,
        "created_at": iso8601.string(from: Date()),
        "source": "user",
        "tags": [tag]
    ] as [String : Any]
    guard let lineData = try? JSONSerialization.data(withJSONObject: marker),
          let line = String(data: lineData, encoding: .utf8) else { return "Invalid marker JSON" }
    let lineWithNewline = line + "\n"
    guard let appendData = lineWithNewline.data(using: .utf8) else { return "Encoding" }
    do {
        if FileManager.default.fileExists(atPath: markersURL.path) {
            let handle = try FileHandle(forWritingTo: markersURL)
            defer { try? handle.close() }
            handle.seekToEndOfFile()
            handle.write(appendData)
        } else {
            try appendData.write(to: markersURL)
        }
    } catch {
        return error.localizedDescription
    }
    return updateSessionUpdatedAt(sessionRoot: sessionRoot)
}

/// Updates session.json.updated_at to current time (RFC 3339).
private func updateSessionUpdatedAt(sessionRoot: URL) -> String? {
    let sessionURL = sessionRoot.appending(path: "session.json")
    do {
        let data = try Data(contentsOf: sessionURL)
        var session = try JSONDecoder().decode(Session.self, from: data)
        let now = iso8601.string(from: Date())
        session = Session(
            id: session.id,
            created_at: session.created_at,
            updated_at: now,
            status: session.status,
            start_time: session.start_time,
            timeline_path: session.timeline_path,
            markers_path: session.markers_path,
            transcript_path: session.transcript_path,
            voice_notes_path: session.voice_notes_path,
            digest_path: session.digest_path,
            media: session.media
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        try encoder.encode(session).write(to: sessionURL)
        return nil
    } catch {
        return error.localizedDescription
    }
}
