import {
  captureFingerprint,
  mergeCapturePayloads,
  outreachPayloadsConflict,
} from './outreach-sync.util';

describe('outreach-sync.util', () => {
  it('detects conflicting captures', () => {
    const server = { firstName: 'Ada', phone: '555-0100' };
    const client = { firstName: 'Ada', phone: '555-0199' };
    expect(outreachPayloadsConflict(server, client)).toBe(true);
  });

  it('treats matching fingerprints as no conflict', () => {
    const payload = { firstName: 'Ada', lastName: 'Lovelace', email: 'a@test.com' };
    expect(captureFingerprint(payload)).toBe(captureFingerprint({ ...payload }));
    expect(outreachPayloadsConflict(payload, { ...payload })).toBe(false);
  });

  it('merges client overrides into server payload', () => {
    const merged = mergeCapturePayloads(
      { firstName: 'Ada', phone: '555-0100', notes: 'Server' },
      { firstName: 'Ada', phone: '555-0199', notes: 'Client' },
    );
    expect(merged.phone).toBe('555-0199');
    expect(String(merged.notes)).toContain('Server');
    expect(String(merged.notes)).toContain('Client');
  });
});
