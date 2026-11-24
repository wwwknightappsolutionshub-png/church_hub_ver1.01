import { decryptSecret, encryptSecret, maskSecretHint } from './secret-box';

const KEY = 'unit-test-secret-box-key-material-32';

describe('secret-box', () => {
  it('round-trips plaintext', () => {
    const plain = 'test-api-key-abc123';
    const enc = encryptSecret(plain, KEY);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(decryptSecret(enc, KEY)).toBe(plain);
  });

  it('fails fast without key material', () => {
    const prevJwt = process.env.JWT_ACCESS_SECRET;
    const prevInt = process.env.INTEGRATION_SECRETS_KEY;
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.INTEGRATION_SECRETS_KEY;
    try {
      expect(() => encryptSecret('x')).toThrow(/Encryption key missing/);
    } finally {
      if (prevJwt) process.env.JWT_ACCESS_SECRET = prevJwt;
      if (prevInt) process.env.INTEGRATION_SECRETS_KEY = prevInt;
    }
  });

  it('masks hints', () => {
    expect(maskSecretHint('abcdefghijklmnop')).toBe('abcd…mnop');
    expect(maskSecretHint('short')).toBe('••••••••');
  });
});
