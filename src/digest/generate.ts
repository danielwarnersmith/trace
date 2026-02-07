import type { DigestInput } from './types.js';

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate Markdown digest content from digest input.
 * Includes session info, marker count, and notable moments (markers with timestamp).
 * Free-form Markdown; manual edits remain allowed per DIGEST codex.
 */
export function generateDigestContent(input: DigestInput): string {
  const { session, markers } = input;
  const lines: string[] = [];

  lines.push('# Session digest');
  lines.push('');
  lines.push(`- **ID:** ${session.id}`);
  lines.push(`- **Started:** ${session.start_time}`);
  lines.push(`- **Status:** ${session.status}`);
  if (session.duration_ms != null) {
    lines.push(`- **Duration:** ${formatMs(session.duration_ms)}`);
  }
  if (session.end_time) {
    lines.push(`- **Ended:** ${session.end_time}`);
  }
  lines.push('');
  lines.push(`**Markers:** ${markers.length}`);
  lines.push('');

  if (markers.length > 0) {
    lines.push('## Notable moments');
    lines.push('');
    for (const m of markers) {
      const time = formatMs(m.offset_ms);
      const label = m.label ?? (m.tags?.length ? m.tags.join(', ') : 'marker');
      lines.push(`- **${time}** — ${label}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
