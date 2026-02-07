# Plan: M2 To-do 2 — Fixed CC → category mapping

**Status:** Implemented

**Goal:** Map (MIDI channel, CC number, optionally value) to one of the four categories: Highlight, Structure, Texture/Sample, Fix/Review. Config must be editable so different hardware can map different CCs. Output: category string (tag or label) per MARK; schema has no category field yet, use tags or label.

**Spec/codex:** [trace-spec/SPEC.md](../SPEC.md) Stage 2 — "a fixed category: Highlight, Structure, Texture / Sample, Fix / Review"; [trace-spec/codex/MARK.md](../codex/MARK.md) — categories as tags or label. [milestone-02-midi-marker-input.md](../milestones/milestone-02-midi-marker-input.md) to-do 2.

**Steps:**

1. Add a config file for CC → category mapping. Default: `trace-spec/midi-categories.json` (or load from project root `.trace-midi.json` if present). Format: map keys like `"channel:cc"` (e.g. `"0:20"`) to category tag string: `"highlight"`, `"structure"`, `"texture-sample"`, `"fix-review"`. Example default: CC 20 ch 0 → highlight; 21 → structure; 22 → texture-sample; 23 → fix-review.
2. Implement a resolver in `src/midi/` (e.g. `src/midi/categories.ts`): `getCategoryForCC(channel, controller, value?)` that reads config and returns category string or null if not mapped. Use tag-style lowercase (highlight, structure, texture-sample, fix-review) so it can be passed as `tags: [category]` or `label: "Highlight"` later.
3. Optionally wire into `trace midi listen`: when logging CC, also log the resolved category (if any) so users can verify the mapping. No marker writing yet (to-do 4).
4. Document in docs/midi-setup.md: default mapping, config file path and format, how to override (e.g. copy/edit `trace-spec/midi-categories.json` or create `.trace-midi.json` in project root).

**Where:** Config: `trace-spec/midi-categories.json` (default); optional override: project root `.trace-midi.json`. Code: `src/midi/categories.ts` (or under existing `src/midi/`). Docs: `docs/midi-setup.md`.

**Acceptance:** Given a CC event (channel, controller, value), the system resolves a single category string (e.g. "highlight") when the CC is in the config; returns null otherwise. Default config maps CC 20–23 on channel 0 to the four categories. Documented how to override.

**Agent:** Implement in repo; run npm run build, npm test.
