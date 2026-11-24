import { stripUntrustedCaptureFlags } from './outreach-capture.types';

describe('stripUntrustedCaptureFlags', () => {
  it('removes server-only capture fields from client/sync payloads', () => {
    const safe = stripUntrustedCaptureFlags({
      firstName: 'Ada',
      phone: '+123',
      allowDuplicateOverride: true,
      capturedByUserId: 'evil-user',
      captureSource: 'IMPORT',
    });
    expect(safe).toEqual({ firstName: 'Ada', phone: '+123' });
    expect('allowDuplicateOverride' in safe).toBe(false);
    expect('capturedByUserId' in safe).toBe(false);
    expect('captureSource' in safe).toBe(false);
  });
});