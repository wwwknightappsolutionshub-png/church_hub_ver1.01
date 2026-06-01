export type ChoirVoicePart = 'SOPRANO' | 'TENOR' | 'ALTO' | 'BASS';
export type ChoirRosterEventType = 'SUNDAY_MINISTRY' | 'MIDWEEK_REHEARSAL';
export type ChoirAttendanceEventType = 'REHEARSAL' | 'SUNDAY_MINISTRY';

export const CHOIR_VOICE_PARTS: Array<{ value: ChoirVoicePart; label: string; abbr: string }> = [
  { value: 'SOPRANO', label: 'Soprano', abbr: 'S' },
  { value: 'TENOR', label: 'Tenor', abbr: 'T' },
  { value: 'ALTO', label: 'Alto', abbr: 'A' },
  { value: 'BASS', label: 'Bass', abbr: 'B' },
];

export const CHOIR_ROSTER_EVENTS = [
  { value: 'SUNDAY_MINISTRY' as const, label: 'Sunday ministration' },
  { value: 'MIDWEEK_REHEARSAL' as const, label: 'Midweek rehearsal' },
];

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

function normalizeKey(key: string): { root: string; suffix: string } | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const m = /^([A-Ga-g])([#b]?)(m|min|maj)?$/i.exec(trimmed.replace(/\s+/g, ''));
  if (!m) return null;
  let root = m[1].toUpperCase() + (m[2] ?? '');
  if (root.length === 2 && root[1] === 'b') root = FLAT_MAP[root] ?? root;
  const suffix = m[3]?.toLowerCase().startsWith('m') && !m[3].startsWith('maj') ? 'm' : '';
  return { root, suffix };
}

function keyToIndex(root: string): number {
  const idx = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  return idx >= 0 ? idx : 0;
}

/** Transpose a key by semitones (supports sharps/flats and minor suffix). */
export function transposeMusicalKey(key: string, semitones: number): string {
  const parsed = normalizeKey(key);
  if (!parsed) return key;
  const next = (keyToIndex(parsed.root) + semitones + 120) % 12;
  return `${CHROMATIC[next]}${parsed.suffix}`;
}

export function transposeChordChart(chart: string, semitones: number): string {
  if (!chart.trim() || semitones === 0) return chart;
  return chart.replace(
    /\b([A-G])([#b]?)(m|maj|dim|aug|sus[24]?)?\b/gi,
    (_, letter: string, acc: string, qual: string) => {
      const raw = `${letter}${acc ?? ''}`;
      const transposed = transposeMusicalKey(raw, semitones);
      return `${transposed}${qual ?? ''}`;
    },
  );
}
