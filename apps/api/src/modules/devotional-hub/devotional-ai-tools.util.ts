import { DevotionalPlanSourceType, DevotionalPlanTone } from '@prisma/client';
import { buildOutlineDays, buildSourceLabel, resolveDurationDays } from './devotional-plan-outline.util';

export type ScriptureDepthMode = 'SIMPLE' | 'YOUTH' | 'ADULT_THEOLOGICAL';
export type PrayerPointSource = 'SCRIPTURE' | 'TOPIC' | 'PDF' | 'DAILY_SECTION';
export type PdfReadingLevel =
  | 'KIDS_8_12'
  | 'TEENS'
  | 'YOUTH'
  | 'ADULTS'
  | 'NEW_BELIEVER';

const DEPTH_LABELS: Record<ScriptureDepthMode, string> = {
  SIMPLE: 'simple, plain language',
  YOUTH: 'teen-friendly and relatable',
  ADULT_THEOLOGICAL: 'thoughtful adult study with theological depth',
};

export function buildFullStudyOutline(input: {
  sourceType?: DevotionalPlanSourceType | null;
  sourceLabel: string;
  tone?: DevotionalPlanTone | null;
  durationDays?: number;
  durationWeeks?: number;
}) {
  const days = buildOutlineDays({
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    tone: input.tone,
    durationDays: resolveDurationDays(input.durationDays, input.durationWeeks),
  });

  const breakdown = days.map((d) => ({
    dayNumber: d.dayNumber,
    title: d.title,
    scriptureRef: d.scriptureRef,
    focus: d.reflection?.slice(0, 120) ?? d.title,
  }));

  return {
    sourceLabel: input.sourceLabel,
    summary: `This ${days.length}-day study on "${input.sourceLabel}" walks through key themes with daily scripture, reflection, and practical next steps. Tone: ${input.tone ?? 'ADULT'}.`,
    breakdown,
    studyQuestions: [
      `What is God teaching us about ${input.sourceLabel} in this passage?`,
      'How does this truth challenge or encourage you today?',
      'Who could you discuss this with in your group?',
      'What obstacle might keep you from applying this?',
      'How does this connect to the gospel?',
    ],
    applicationPoints: [
      'Identify one concrete action for today.',
      'Share one insight with your devotional group.',
      'Pray for someone who needs this truth.',
      'Journal one sentence on what you will obey.',
    ],
    days,
  };
}

export function buildPrayerPoints(input: {
  source: PrayerPointSource;
  prompt: string;
  context?: string;
}) {
  const base = input.prompt.trim() || 'today\'s reading';
  const intro =
    input.source === 'SCRIPTURE'
      ? `Prayers rooted in Scripture: ${base}`
      : input.source === 'TOPIC'
        ? `Prayers for the topic: ${base}`
        : input.source === 'PDF'
          ? `Prayers from imported material: ${base}`
          : `Prayers from today's section: ${base}`;

  return {
    source: input.source,
    title: intro,
    points: [
      { category: 'Thanksgiving', text: `Thank God for the truth revealed in ${base}.` },
      { category: 'Confession', text: 'Ask God to reveal areas where your heart needs alignment.' },
      { category: 'Intercession', text: 'Pray for your church, family, and those studying with you.' },
      { category: 'Guidance', text: `Ask the Holy Spirit to help you live out ${base} today.` },
      { category: 'Mission', text: 'Pray for courage to share hope with one person this week.' },
    ],
    closing: 'In Jesus\' name, Amen.',
    context: input.context,
  };
}

export function buildScriptureAnswer(question: string, passage?: string, depth: ScriptureDepthMode = 'SIMPLE') {
  const style = DEPTH_LABELS[depth];
  return {
    question: question.trim(),
    passage: passage?.trim() ?? null,
    depth,
    answer: `Here is a ${style} response to your question.`,
    insights: [
      'The passage points to God\'s character and our response of faith.',
      'Context: consider who wrote this, who they wrote to, and why it matters.',
      depth === 'YOUTH'
        ? 'Try explaining this to a friend in your own words.'
        : 'Cross-reference related scriptures to deepen understanding.',
    ],
    reflectionPrompt:
      depth === 'ADULT_THEOLOGICAL'
        ? 'How does this doctrine shape discipleship and community life?'
        : 'What is one way you can obey this truth today?',
    references: passage ? [passage] : [],
  };
}

export function stubPdfExtractedText(fileName: string, pageCount = 5) {
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    pageNumber: i + 1,
    text: `Page ${i + 1} of "${fileName}": key themes, scripture references, and discussion prompts suitable for a daily devotional format.`,
  }));
  return { pageCount, pages };
}

export function pdfPagesToDevotionalDays(
  pages: Array<{ pageNumber: number; text: string }>,
  fileName: string,
) {
  return pages.map((p) => ({
    dayNumber: p.pageNumber,
    title: `Day ${p.pageNumber}: ${fileName}`,
    scriptureRef: `Section ${p.pageNumber}`,
    scriptureText: p.text.slice(0, 400),
    reflection: 'Reflect on how this section applies to your walk with Christ.',
    prayerPrompt: 'Pray for understanding and obedience.',
    actionPoint: 'Share one takeaway with your group.',
  }));
}

export function simplifyText(text: string, level: PdfReadingLevel) {
  const prefix: Record<PdfReadingLevel, string> = {
    KIDS_8_12: '[Ages 8–12] ',
    TEENS: '[Teens] ',
    YOUTH: '[Youth] ',
    ADULTS: '[Adults] ',
    NEW_BELIEVER: '[New believers] ',
  };
  const simplified = `${prefix[level]}${text.slice(0, 500)}`.replace(/\btherefore\b/gi, 'so');
  return { readingLevel: level, simplified, originalLength: text.length };
}

export function artifactTypeForReadingLevel(level: PdfReadingLevel) {
  switch (level) {
    case 'KIDS_8_12':
      return 'SIMPLIFIED_CHILD' as const;
    case 'TEENS':
      return 'SIMPLIFIED_TEEN' as const;
    case 'YOUTH':
      return 'SIMPLIFIED_YOUTH' as const;
    case 'ADULTS':
      return 'SIMPLIFIED_ADULT' as const;
    case 'NEW_BELIEVER':
      return 'SIMPLIFIED_NEW_BELIEVER' as const;
  }
}

export function resolveStudyTopic(input: {
  sourceType?: DevotionalPlanSourceType | null;
  topic?: string;
  bibleBook?: string;
  topicalBook?: string;
  customTopic?: string;
}) {
  return buildSourceLabel({
    sourceType: input.sourceType,
    sourceLabel: input.topic,
    bibleBook: input.bibleBook,
    topicalBook: input.topicalBook,
    customTopic: input.customTopic,
  });
}
