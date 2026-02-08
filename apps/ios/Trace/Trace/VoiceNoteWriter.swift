//
//  VoiceNoteWriter.swift
//  Trace
//
//  Append voice note to voice_notes.jsonl, copy audio to media/, update session.json.
//

import Foundation

/// Voice note payload per schema: id, created_at, media_path, offset_ms, duration_ms.
struct VoiceNotePayload {
    let id: String
    let created_at: String
    let media_path: String
    let offset_ms: Int
    let duration_ms: Int
}

/// Appends a voice note to the session: copies audio to media/<id>.m4a, appends to voice_notes.jsonl, updates session.json.
/// Returns nil on success, or an error message.
func appendVoiceNote(sessionRoot: URL, payload: VoiceNotePayload, audioSourceURL: URL) -> String? {
    let mediaDir = sessionRoot.appending(path: "media")
    try? FileManager.default.createDirectory(at: mediaDir, withIntermediateDirectories: true)
    let destURL = sessionRoot.appending(path: payload.media_path)
    do {
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.copyItem(at: audioSourceURL, to: destURL)
    } catch {
        return error.localizedDescription
    }
    let voiceNotesURL = sessionRoot.appending(path: "voice_notes.jsonl")
    let line: [String: Any] = [
        "id": payload.id,
        "created_at": payload.created_at,
        "media_path": payload.media_path,
        "offset_ms": payload.offset_ms,
        "duration_ms": payload.duration_ms
    ]
    guard let lineData = try? JSONSerialization.data(withJSONObject: line),
          let lineStr = String(data: lineData, encoding: .utf8) else { return "Invalid voice note JSON" }
    let appendData = (lineStr + "\n").data(using: .utf8)!
    do {
        if FileManager.default.fileExists(atPath: voiceNotesURL.path) {
            let handle = try FileHandle(forWritingTo: voiceNotesURL)
            defer { try? handle.close() }
            handle.seekToEndOfFile()
            handle.write(appendData)
        } else {
            try appendData.write(to: voiceNotesURL)
        }
    } catch {
        return error.localizedDescription
    }
    return updateSessionForVoiceNote(sessionRoot: sessionRoot)
}

private func updateSessionForVoiceNote(sessionRoot: URL) -> String? {
    let sessionURL = sessionRoot.appending(path: "session.json")
    do {
        let data = try Data(contentsOf: sessionURL)
        var session = try JSONDecoder().decode(Session.self, from: data)
        let now = iso8601String()
        session = Session(
            id: session.id,
            created_at: session.created_at,
            updated_at: now,
            status: session.status,
            start_time: session.start_time,
            timeline_path: session.timeline_path,
            markers_path: session.markers_path,
            transcript_path: session.transcript_path,
            voice_notes_path: "voice_notes.jsonl",
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

private func iso8601String() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
}
