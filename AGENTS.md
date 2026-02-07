# Agent instructions

- **Spec**: CLI behavior and semantics follow `trace-spec/SPEC.md` and `trace-spec/codex/`; build priorities in `trace-spec/ROADMAP.md`. Implementations live in `src/`, tests in `test/`, spec and schemas in `trace-spec/`.
- **Non-trivial work**: Use the conductor subagent (multi-step work, refactors, planning, or when a specialist would help). Handle quick fixes and lookups directly.
- **Milestone execution**: For plan → delegate → verify (next set from trace-spec/milestones), use the **eng-manager** subagent.
