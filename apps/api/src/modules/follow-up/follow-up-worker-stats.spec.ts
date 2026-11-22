/**
 * Phase 3 — worker dashboard metric definitions (mirrors FollowUpService.getStats).
 * Graduated = last pipeline phase (joined service unit / baptism track).
 */

const GRADUATED = new Set(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']);

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

type Row = { stage: string; dueAt: Date | null };

function computeWorkerMetrics(rows: Row[], now = new Date()) {
  const start = startOfLocalDay(now).getTime();
  const end = endOfLocalDay(now).getTime();
  const assigned = rows.length;
  const graduated = rows.filter((r) => GRADUATED.has(r.stage)).length;
  const pipeline = rows.filter((r) => !GRADUATED.has(r.stage));
  const pending = pipeline.length;
  const overdue = pipeline.filter(
    (r) => r.dueAt && r.dueAt.getTime() < now.getTime(),
  ).length;
  const dueToday = pipeline.filter((r) => {
    if (!r.dueAt) return false;
    const t = r.dueAt.getTime();
    return t >= start && t <= end;
  }).length;
  return { assigned, pending, overdue, dueToday, graduated };
}

describe('Phase 3 worker dashboard metrics', () => {
  const now = new Date('2026-11-22T12:00:00');

  it('counts assigned, pipeline, overdue, due today, graduated', () => {
    const rows: Row[] = [
      { stage: 'NEW_LEAD', dueAt: new Date('2026-11-20T10:00:00') }, // overdue
      { stage: 'CONTACTED', dueAt: new Date('2026-11-22T15:00:00') }, // due today
      { stage: 'VISITED', dueAt: null },
      { stage: 'JOINED_GROUP', dueAt: new Date('2026-11-10T10:00:00') }, // graduated
      { stage: 'ENLISTED_FOR_BAPTISM', dueAt: null }, // graduated
    ];

    const m = computeWorkerMetrics(rows, now);
    expect(m.assigned).toBe(5);
    expect(m.pending).toBe(3);
    expect(m.overdue).toBe(1);
    expect(m.dueToday).toBe(1);
    expect(m.graduated).toBe(2);
    expect(m.pending + m.graduated).toBe(m.assigned);
  });

  it('does not treat graduated contacts as overdue/due today', () => {
    const rows: Row[] = [
      { stage: 'JOINED_GROUP', dueAt: new Date('2026-11-01T08:00:00') },
      { stage: 'ENLISTED_FOR_BAPTISM', dueAt: new Date('2026-11-22T09:00:00') },
    ];
    const m = computeWorkerMetrics(rows, now);
    expect(m.graduated).toBe(2);
    expect(m.overdue).toBe(0);
    expect(m.dueToday).toBe(0);
    expect(m.pending).toBe(0);
  });
});
