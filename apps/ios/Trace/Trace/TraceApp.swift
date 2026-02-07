//
//  TraceApp.swift
//  Trace
//
//  Created by Daniel Smith on 2/7/26.
//

import SwiftUI

@main
struct TraceApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onOpenURL { url in
            handleAddMarkerURL(url)
        }
    }

    /// Handle trace://add-marker?tag=highlight (or structure, texture_sample, fix_review).
    private func handleAddMarkerURL(_ url: URL) {
        guard url.scheme == "trace" else { return }
        let host = url.host ?? ""
        guard host == "add-marker" else { return }
        guard let comp = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let tag = comp.queryItems?.first(where: { $0.name == "tag" })?.value,
              !tag.isEmpty else { return }
        let normalizedTag = tag.lowercased().replacingOccurrences(of: " ", with: "_")
        guard let sessionRoot = SharedState.resolveSessionRoot() else { return }
        let offsetMs = SharedState.currentOffsetMs
        _ = appendMarker(sessionRoot: sessionRoot, offsetMs: offsetMs, tag: normalizedTag)
    }
}
