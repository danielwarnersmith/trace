/** Session summary for digest generation. */
export type DigestSessionSummary = {
  id: string;
  start_time: string;
  status: string;
  end_time?: string;
  duration_ms?: number;
};

/** Timeline entry (minimal for digest). */
export type DigestTimelineEntry = {
  offset_ms: number;
  kind: string;
};

/** Transcript segment (minimal for digest). */
export type DigestTranscriptSegment = {
  offset_ms: number;
  duration_ms: number;
  text: string;
};

/** Marker (minimal for digest). */
export type DigestMarker = {
  offset_ms: number;
  label?: string;
  tags?: string[];
};

/** Voice note summary (minimal for digest). */
export type DigestVoiceNoteSummary = {
  offset_ms: number;
  duration_ms?: number;
  transcript_text?: string;
};

/** Action run (minimal for digest). */
export type DigestActionRun = {
  id: string;
  action: string;
  created_at: string;
  status: string;
  error?: string;
};

/** Structured input for digest content generation. */
export type DigestInput = {
  session: DigestSessionSummary;
  timeline: DigestTimelineEntry[];
  transcript: DigestTranscriptSegment[];
  markers: DigestMarker[];
  voice_notes: DigestVoiceNoteSummary[];
  actions: DigestActionRun[];
};
