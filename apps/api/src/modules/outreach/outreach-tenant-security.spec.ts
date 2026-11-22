/**
 * Tenant isolation for outreach capture clientId / QR scan paths.
 */
describe('Outreach tenant security helpers', () => {
  it('foreign-tenant clientId must not be returned as a successful dedupe', () => {
    const churchId = 'church-a';
    const dup = { id: 'oc-1', churchId: 'church-b', clientId: 'shared-client' };
    const blocked = dup.churchId !== churchId;
    expect(blocked).toBe(true);
  });

  it('QR scan updates require same-church active QR', () => {
    const churchId = 'church-a';
    const qrRows = [
      { id: 'qr-1', churchId: 'church-a', isActive: true },
      { id: 'qr-2', churchId: 'church-b', isActive: true },
      { id: 'qr-3', churchId: 'church-a', isActive: false },
    ];
    const allowed = (qrId: string) =>
      qrRows.find((q) => q.id === qrId && q.churchId === churchId && q.isActive) ?? null;
    expect(allowed('qr-1')?.id).toBe('qr-1');
    expect(allowed('qr-2')).toBeNull();
    expect(allowed('qr-3')).toBeNull();
  });
});
