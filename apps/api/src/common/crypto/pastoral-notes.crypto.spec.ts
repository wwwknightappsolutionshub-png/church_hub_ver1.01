import {
  decryptPastoralNoteContent,
  encryptPastoralNoteContent,
} from './pastoral-notes.crypto';
import { isEncryptedSecret } from './secret-box';

describe('pastoral-notes.crypto', () => {
  const prev = process.env.PASTORAL_NOTES_KEY;

  beforeAll(() => {
    process.env.PASTORAL_NOTES_KEY = 'pastoral-unit-test-key-material-32b';
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.PASTORAL_NOTES_KEY;
    else process.env.PASTORAL_NOTES_KEY = prev;
  });

  it('encrypts writes to v1 envelope', () => {
    const enc = encryptPastoralNoteContent('Confidential pastoral note');
    expect(isEncryptedSecret(enc)).toBe(true);
    expect(enc).not.toContain('Confidential');
  });

  it('dual-reads encrypted and legacy plaintext', () => {
    const enc = encryptPastoralNoteContent('secret-body');
    expect(decryptPastoralNoteContent(enc)).toBe('secret-body');
    expect(decryptPastoralNoteContent('legacy plaintext note')).toBe('legacy plaintext note');
  });
});
