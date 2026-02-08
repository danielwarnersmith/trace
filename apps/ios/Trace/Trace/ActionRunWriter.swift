//
//  ActionRunWriter.swift
//  Trace
//
//  Append action run to actions.jsonl per ACTIONS codex (id, action, created_at, status).
//

import Foundation

private let iso8601: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

/// Appends an action run to the session's actions.jsonl with status "started".
/// Creates the file if it does not exist. Returns nil on success, or an error message.
func appendActionRun(sessionRoot: URL, actionId: String) -> String? {
    let actionsURL = sessionRoot.appending(path: "actions.jsonl")
    let entry: [String: Any] = [
        "id": ulid(),
        "action": actionId,
        "created_at": iso8601.string(from: Date()),
        "status": "started"
    ]
    guard let lineData = try? JSONSerialization.data(withJSONObject: entry),
          let line = String(data: lineData, encoding: .utf8) else { return "Invalid action run JSON" }
    let lineWithNewline = line + "\n"
    guard let appendData = lineWithNewline.data(using: .utf8) else { return "Encoding" }
    do {
        if FileManager.default.fileExists(atPath: actionsURL.path) {
            let handle = try FileHandle(forWritingTo: actionsURL)
            defer { try? handle.close() }
            handle.seekToEndOfFile()
            handle.write(appendData)
        } else {
            try appendData.write(to: actionsURL)
        }
        return nil
    } catch {
        return error.localizedDescription
    }
}
