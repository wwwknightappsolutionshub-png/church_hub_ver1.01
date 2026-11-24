export type DuplicateMatchView = {
  followUpId: string;
  contactName: string;
  stage: string;
  outreachContactId: string | null;
  capturedAt: string | null;
};

export function redactContactName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Existing contact';
  return 'Existing contact';
}

export function formatDuplicateMatchesForClient(
  matches: Array<{
    followUpId: string;
    contactName: string;
    stage: string;
    outreachContactId: string | null;
    capturedAt: Date | null;
  }>,
  exposePii: boolean,
): DuplicateMatchView[] {
  return matches.map((m) => ({
    followUpId: m.followUpId,
    contactName: exposePii ? m.contactName : redactContactName(m.contactName),
    stage: m.stage,
    outreachContactId: m.outreachContactId,
    capturedAt: m.capturedAt?.toISOString() ?? null,
  }));
}