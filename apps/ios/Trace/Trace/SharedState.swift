//
//  SharedState.swift
//  Trace
//
//  App Group shared state for widget: session root bookmark and current playback offset_ms.
//

import Foundation

enum SharedState {
    static let appGroupID = "group.dws.Trace"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }

    static var sessionRootBookmark: Data? {
        get { defaults?.data(forKey: "sessionRootBookmark") }
        set { defaults?.set(newValue, forKey: "sessionRootBookmark") }
    }

    static var currentOffsetMs: Int {
        get { defaults?.integer(forKey: "currentOffsetMs") ?? 0 }
        set { defaults?.set(newValue, forKey: "currentOffsetMs") }
    }

    /// Resolves the session root URL from the stored bookmark, or nil if missing/invalid.
    static func resolveSessionRoot() -> URL? {
        guard let data = sessionRootBookmark else { return nil }
        var isStale = false
        guard let url = try? URL(resolvingBookmarkData: data, options: .withoutImplicitSecurityScope, relativeTo: nil, bookmarkDataIsStale: &isStale) else { return nil }
        _ = url.startAccessingSecurityScopedResource()
        return url
    }

    /// Store the session root URL as a security-scoped bookmark for the widget/app to resolve later.
    static func setSessionRoot(_ url: URL) {
        do {
            let data = try url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil)
            sessionRootBookmark = data
        } catch {
            sessionRootBookmark = nil
        }
    }

    static func clearSessionRoot() {
        sessionRootBookmark = nil
    }
}
