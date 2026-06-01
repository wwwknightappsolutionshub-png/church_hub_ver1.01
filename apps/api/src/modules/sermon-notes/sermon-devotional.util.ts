import type { OutlineDayInput } from '../devotional-hub/devotional-plan-outline.util';

const WEEKLY_THEMES = [
  { theme: 'The heart of the message', focus: 'overview and main theme' },
  { theme: 'God’s Word for today', focus: 'scriptural foundation' },
  { theme: 'Truth to receive', focus: 'teaching and conviction' },
  { theme: 'Faith in action', focus: 'personal application' },
  { theme: 'Walking it out', focus: 'daily obedience' },
  { theme: 'Together in Christ', focus: 'community and family' },
  { theme: 'Living sent', focus: 'mission and next steps' },
] as const;

const SERMON_SCRIPTURE_REFS: Array<{ ref: string; readGuide: string }> = [
  {
    ref: 'Psalm 119:105',
    readGuide:
      'Read Psalm 119:105 — “Your word is a lamp to my feet and a light to my path.” Notice how God’s Word guides daily decisions.',
  },
  {
    ref: '2 Timothy 3:16-17',
    readGuide:
      'Read 2 Timothy 3:16-17 — All Scripture is God-breathed and useful for teaching, rebuking, correcting, and training in righteousness.',
  },
  {
    ref: 'Joshua 1:8',
    readGuide:
      'Read Joshua 1:8 — Meditate on God’s Word day and night so you may be careful to do everything written in it.',
  },
  {
    ref: 'James 1:22',
    readGuide:
      'Read James 1:22 — Do not merely listen to the word, and so deceive yourselves. Do what it says.',
  },
  {
    ref: 'Romans 12:2',
    readGuide:
      'Read Romans 12:2 — Be transformed by the renewing of your mind. Ask what thought patterns this sermon challenges.',
  },
  {
    ref: 'Hebrews 10:24-25',
    readGuide:
      'Read Hebrews 10:24-25 — Consider how to spur one another on toward love and good deeds, not giving up meeting together.',
  },
  {
    ref: 'Matthew 28:19-20',
    readGuide:
      'Read Matthew 28:19-20 — Jesus sends disciples to make disciples. Pray for one person you will encourage this week.',
  },
];

function splitIntoSegments(text: string, parts: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return Array(parts).fill('');

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= parts) {
    const per = Math.ceil(paragraphs.length / parts);
    return Array.from({ length: parts }, (_, i) =>
      paragraphs.slice(i * per, (i + 1) * per).join('\n\n'),
    );
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= parts) {
    const per = Math.ceil(sentences.length / parts);
    return Array.from({ length: parts }, (_, i) =>
      sentences.slice(i * per, (i + 1) * per).join(' '),
    );
  }

  const chunkLen = Math.max(1, Math.ceil(normalized.length / parts));
  return Array.from({ length: parts }, (_, i) =>
    normalized.slice(i * chunkLen, (i + 1) * chunkLen).trim(),
  );
}

function extractScriptureMention(text: string): string | null {
  const match = text.match(
    /\b([1-3]?\s?[A-Za-z]+)\s+(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/,
  );
  if (!match) return null;
  const book = match[1].replace(/\s+/g, ' ').trim();
  const chapter = match[2];
  const verse = match[3];
  const end = match[4];
  return end ? `${book} ${chapter}:${verse}-${end}` : `${book} ${chapter}:${verse}`;
}

function buildDayReflection(input: {
  dayNumber: number;
  theme: string;
  focus: string;
  sermonTitle: string;
  speakerName?: string | null;
  segment: string;
  pastorContext?: string | null;
  summary: string;
}): string {
  const speaker = input.speakerName?.trim()
    ? `From ${input.speakerName}'s teaching on “${input.sermonTitle}”`
    : `From Sunday’s message, “${input.sermonTitle}”`;

  const contextBlock = input.pastorContext?.trim()
    ? `\n\nPastor’s notes for clarity: ${input.pastorContext.trim()}`
    : '';

  const segmentBlock = input.segment.trim()
    ? `\n\nToday’s focus (${input.focus}): ${input.segment.trim()}`
    : `\n\nToday’s focus: ${input.focus} drawn from the overall teaching summary.`;

  return (
    `${speaker} — Day ${input.dayNumber}: ${input.theme}. ` +
    `This reading helps you go deeper into the message, not just remember a headline. ` +
    `Take 10–15 minutes with your Bible, journal, and prayer.` +
    segmentBlock +
    (input.summary ? `\n\nTeaching thread: ${input.summary}` : '') +
    contextBlock +
    `\n\nReflection questions: What is God saying to me today? What must I believe, repent of, or obey? Who can I encourage with this truth?`
  );
}

/** Build a 7-day sermon-based devotional with full daily descriptions and scripture to read. */
export function buildSermonDevotionalDays(input: {
  sermonTitle: string;
  speakerName?: string | null;
  transcript: string;
  pastorContext?: string | null;
  summary: string;
  durationDays?: number;
}): OutlineDayInput[] {
  const count = Math.min(Math.max(input.durationDays ?? 7, 1), 7);
  const combined =
    [input.transcript, input.pastorContext].filter(Boolean).join('\n\n') || input.summary;
  const segments = splitIntoSegments(combined, count);
  const pastorChunks = input.pastorContext?.trim()
    ? splitIntoSegments(input.pastorContext.trim(), count)
    : Array(count).fill('');

  const mentionedRef = extractScriptureMention(combined);

  return Array.from({ length: count }, (_, i) => {
    const dayNumber = i + 1;
    const { theme, focus } = WEEKLY_THEMES[i] ?? WEEKLY_THEMES[WEEKLY_THEMES.length - 1];
    const scripture = SERMON_SCRIPTURE_REFS[i] ?? SERMON_SCRIPTURE_REFS[0];
    const scriptureRef =
      i === 0 && mentionedRef ? mentionedRef : scripture.ref;

    const readGuide =
      i === 0 && mentionedRef
        ? `Read ${mentionedRef} in your Bible. This passage was highlighted in Sunday’s teaching — underline words that stand out and pray over them.`
        : scripture.readGuide;

    return {
      dayNumber,
      title: `Day ${dayNumber}: ${theme}`,
      scriptureRef,
      scriptureText: readGuide,
      reflection: buildDayReflection({
        dayNumber,
        theme,
        focus,
        sermonTitle: input.sermonTitle,
        speakerName: input.speakerName,
        segment: [segments[i], pastorChunks[i]].filter(Boolean).join('\n\n'),
        pastorContext: pastorChunks[i] || (i === 0 ? input.pastorContext : null),
        summary: input.summary,
      }),
      prayerPrompt: `Lord, help me understand and live out “${theme}” from this week’s message. Speak through ${scriptureRef} and give me courage to obey. Amen.`,
      actionPoint: `Set aside 15 minutes today: read ${scriptureRef}, write two sentences on what you learned, and share one insight with someone in your church.`,
    };
  });
}

export function buildSermonSummary(input: {
  title: string;
  transcript: string;
  pastorContext?: string | null;
}): string {
  const base = [input.transcript, input.pastorContext].filter(Boolean).join('\n\n').trim();
  if (!base) return `Weekly devotional from “${input.title}”.`;

  const condensed = base.replace(/\s+/g, ' ').trim();
  const excerpt = condensed.slice(0, 600);
  const pastorNote = input.pastorContext?.trim()
    ? ` Pastor context: ${input.pastorContext.trim().slice(0, 200)}${input.pastorContext.length > 200 ? '…' : ''}.`
    : '';

  return (
    `This seven-day plan unpacks “${input.title}” with daily scripture, teaching summary, and practical steps.` +
    ` ${excerpt}${condensed.length > 600 ? '…' : ''}${pastorNote}`
  );
}
