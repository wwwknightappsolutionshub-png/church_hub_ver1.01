import { Prisma } from '@prisma/client';

export const JOURNAL_MOOD_TAGS = [
  'grateful',
  'peaceful',
  'hopeful',
  'struggling',
  'joyful',
  'anxious',
  'renewed',
  'curious',
] as const;

export const JOURNAL_RECAP_PROMPTS = [
  { id: 'gratitude', text: 'What are you grateful for today?' },
  { id: 'scripture', text: 'What verse stood out to you, and why?' },
  { id: 'obedience', text: 'How will you obey what God showed you today?' },
  { id: 'prayer', text: 'Who or what do you need to bring to God in prayer?' },
  { id: 'community', text: 'How can your group encourage you this week?' },
  { id: 'challenge', text: 'What was hardest today, and where did you see God?' },
] as const;

export const JOURNAL_REACTION_EMOJIS = ['🙏', '❤️', '👍', '✨', '🕊️', '😊', '💡', '🎉'] as const;

export type JournalAttachment = { url: string; caption?: string };
export type JournalScriptureRef = { reference: string; text?: string };

export interface JournalCommentTreeNode {
  id: string;
  memberId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  replies: JournalCommentTreeNode[];
}

export function parseJsonArray<T>(value: Prisma.JsonValue | null | undefined, fallback: T[] = []): T[] {
  if (!value || !Array.isArray(value)) return fallback;
  return value as T[];
}

export function memberDisplayName(member: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  user?: { firstName: string | null; lastName: string | null; email: string } | null;
}) {
  if (member.firstName) {
    return [member.firstName, member.lastName].filter(Boolean).join(' ');
  }
  const u = member.user;
  if (!u) return 'Member';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function exportJournalMarkdown(
  entry: {
    title: string | null;
    body: string;
    moods: Prisma.JsonValue;
    scriptureRefs: Prisma.JsonValue;
    voiceTranscript: string | null;
    createdAt: Date;
    member?: { firstName: string; lastName: string; email?: string | null; user?: { firstName: string | null; lastName: string | null; email: string } | null };
    group?: { name: string } | null;
  },
) {
  const moods = parseJsonArray<string>(entry.moods);
  const refs = parseJsonArray<JournalScriptureRef>(entry.scriptureRefs);
  const lines: string[] = [];
  if (entry.title) lines.push(`# ${entry.title}`, '');
  if (entry.group) lines.push(`*Group: ${entry.group.name}*`, '');
  if (moods.length) lines.push(`**Moods:** ${moods.join(', ')}`, '');
  if (refs.length) {
    lines.push('**Scripture:**');
    for (const r of refs) lines.push(`- ${r.reference}${r.text ? `: ${r.text}` : ''}`);
    lines.push('');
  }
  if (entry.voiceTranscript) lines.push(`**Voice note:** ${entry.voiceTranscript}`, '');
  lines.push(stripHtml(entry.body) || entry.body);
  if (entry.member) {
    lines.push('', `— ${memberDisplayName(entry.member)} · ${entry.createdAt.toISOString().slice(0, 10)}`);
  }
  return lines.join('\n');
}
