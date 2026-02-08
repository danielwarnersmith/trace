//
//  DigestView.swift
//  Trace
//
//  Read-only digest view: displays session's digest.md (UTF-8 Markdown) or placeholder.
//

import SwiftUI

/// Load digest.md from session root. Returns content as UTF-8 string or nil if missing/unreadable.
func loadDigest(from sessionRoot: URL) -> String? {
    let path = sessionRoot.appending(path: "digest.md")
    guard FileManager.default.fileExists(atPath: path.path) else { return nil }
    guard let data = try? Data(contentsOf: path),
          let text = String(data: data, encoding: .utf8),
          !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
    return text
}

struct DigestView: View {
    let sessionRoot: URL
    @State private var content: String?

    var body: some View {
        Group {
            if let content {
                ScrollView {
                    Text(attributedDigest(content))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                }
                .textSelection(.enabled)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "doc.text")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("No digest")
                        .font(.headline)
                    Text("Run digest generate on the Mac.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle("Digest")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            content = loadDigest(from: sessionRoot)
        }
    }

    private func attributedDigest(_ raw: String) -> AttributedString {
        (try? AttributedString(markdown: raw)) ?? AttributedString(raw)
    }
}
