import { decryptSecret, encryptSecret, maskSecretHint } from './secret-box';

describe('secret-box', () => {
  it('round-trips plaintext', () => {
    const plain = 'test-api-key-abc123';
    const enc = encryptSecret(plain);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('masks hints', () => {
    expect(maskSecretHint('abcdefghijklmnop')).toBe('abcd…mnop');
    expect(maskSecretHint('short')).toBe('••••••••');
  });
});
