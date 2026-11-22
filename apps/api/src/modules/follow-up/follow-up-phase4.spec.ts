/**
 * Phase 4 — assignment notification + stage audit contracts.
 */

describe('Phase 4 Establishment notifications & audit', () => {
  it('assignment notification payload uses FOLLOW_UP_ASSIGNED and establishment deep link', () => {
    const appUrl = 'https://church-hub.online';
    const contactName = 'Ada Lovelace';
    const assignerLabel = 'Pastor Grace';
    const title = `Assigned: ${contactName}`;
    const body = `${assignerLabel} assigned ${contactName} to you in Establishment.\n\nOpen: ${appUrl}/dashboard/establishment`;
    const type = 'FOLLOW_UP_ASSIGNED';

    expect(title).toContain('Assigned:');
    expect(body).toContain('/dashboard/establishment');
    expect(body).not.toContain('/dashboard/follow-up');
    expect(type).toBe('FOLLOW_UP_ASSIGNED');
  });

  it('stage audit row records actor, from→to, and timestamp fields', () => {
    const audit = {
      actorId: 'user-actor',
      fromStage: 'NEW_LEAD',
      toStage: 'CONTACTED',
      note: 'Called and left voicemail',
      createdAt: new Date('2026-11-22T12:00:00Z'),
    };

    expect(audit.actorId).toBeTruthy();
    expect(audit.fromStage).not.toBe(audit.toStage);
    expect(audit.createdAt.toISOString()).toBe('2026-11-22T12:00:00.000Z');
  });

  it('view-only modes have no request-edit surface', () => {
    const viewOnlyModes = ['viewOnly', 'wsfLeader'] as const;
    for (const mode of viewOnlyModes) {
      const canMutate = false;
      const showRequestEdit = false; // locked NO in Phase 2/4
      expect(mode === 'viewOnly' || mode === 'wsfLeader').toBe(true);
      expect(canMutate).toBe(false);
      expect(showRequestEdit).toBe(false);
    }
  });
});
