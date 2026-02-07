//
//  TraceWidget.swift
//  TraceWidget
//
//  Homescreen widget: four marker category buttons; tap opens app with add-marker URL.
//

import SwiftUI
import WidgetKit

struct MarkerEntry: TimelineEntry {
    let date: Date
}

struct MarkerProvider: TimelineProvider {
    func placeholder(in context: Context) -> MarkerEntry {
        MarkerEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (MarkerEntry) -> Void) {
        completion(MarkerEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MarkerEntry>) -> Void) {
        completion(Timeline(entries: [MarkerEntry(date: Date())], policy: .never))
    }
}

struct TraceWidgetView: View {
    var entry: MarkerEntry
    @Environment(\.widgetFamily) var family

    private let categories: [(tag: String, label: String)] = [
        ("highlight", "Highlight"),
        ("structure", "Structure"),
        ("texture_sample", "Texture/Sample"),
        ("fix_review", "Fix/Review")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Add marker")
                .font(.caption2)
                .foregroundStyle(.secondary)
            if family == .systemSmall {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                    ForEach(categories, id: \.tag) { item in
                        Link(destination: URL(string: "trace://add-marker?tag=\(item.tag)")!) {
                            Text(item.label)
                                .font(.caption2)
                                .lineLimit(1)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            } else {
                ForEach(categories, id: \.tag) { item in
                    Link(destination: URL(string: "trace://add-marker?tag=\(item.tag)")!) {
                        Text(item.label)
                            .font(.subheadline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 4)
                    }
                }
            }
        }
        .padding()
    }
}

@main
struct TraceWidget: Widget {
    let kind: String = "TraceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MarkerProvider()) { entry in
            TraceWidgetView(entry: entry)
        }
        .configurationDisplayName("Trace Markers")
        .description("Add a marker at current playback time.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    TraceWidget()
} timeline: {
    MarkerEntry(date: Date())
}
