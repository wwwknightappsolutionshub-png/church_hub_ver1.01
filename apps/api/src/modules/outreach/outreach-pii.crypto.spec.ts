import { decryptOutreachPii, encryptOutreachContactFields, encryptOutreachPii } from './outreach-pii.crypto';

describe('outreach-pii.crypto', () => {
  const prev = process.env.OUTREACH_PII_KEY;

  beforeAll(() => {
    process.env.OUTREACH_PII_KEY = 'test-outreach-pii-key-for-unit-tests';
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.OUTREACH_PII_KEY;
    else process.env.OUTREACH_PII_KEY = prev;
  });

  it('encrypts and decrypts phone round-trip', () => {
    const enc = encryptOutreachPii('+2348012345678');
    expect(enc).toBeTruthy();
    expect(enc!.startsWith('v1:')).toBe(true);
    expect(enc).not.toContain('234801');
    expect(decryptOutreachPii(enc)).toBe('+2348012345678');
  });

  it('leaves legacy plaintext readable', () => {
    expect(decryptOutreachPii('+447123456789')).toBe('+447123456789');
  });

  it('encrypts contact field bag', () => {
    const enc = encryptOutreachContactFields({
      phone: '07123456789',
      email: 'a@b.co',
      addressStreet: '12 High St',
      addressCity: 'Lagos',
      addressCountry: 'NG',
    });
    expect(enc.phone?.startsWith('v1:')).toBe(true);
    expect(enc.email?.startsWith('v1:')).toBe(true);
    expect(enc.addressStreet?.startsWith('v1:')).toBe(true);
    expect(decryptOutreachPii(enc.phone)).toBe('07123456789');
  });
});
