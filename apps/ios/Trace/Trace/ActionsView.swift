//
//  ActionsView.swift
//  Trace
//
//  List of triggerable actions; tapping appends a run to actions.jsonl.
//

import SwiftUI

struct TriggerableAction: Identifiable {
    let id: String
    let title: String
}

private let triggerableActions: [TriggerableAction] = [
    TriggerableAction(id: "generate_digest", title: "Generate digest")
]

struct ActionsView: View {
    let sessionRoot: URL
    @State private var message: String?
    @State private var messageIsError = false

    var body: some View {
        List {
            Section {
                Text("Triggering logs a run to actions.jsonl. Run digest generate on the Mac to update the digest.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("Actions") {
                ForEach(triggerableActions) { action in
                    Button(action: { trigger(action) }) {
                        Text(action.title)
                    }
                }
            }
            if let message {
                Section {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(messageIsError ? .orange : .secondary)
                }
            }
        }
        .navigationTitle("Actions")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private func trigger(_ action: TriggerableAction) {
        message = nil
        if let err = appendActionRun(sessionRoot: sessionRoot, actionId: action.id) {
            message = err
            messageIsError = true
        } else {
            message = "Run logged: \(action.id)"
            messageIsError = false
        }
    }
}
