import { parseNameFromEmailLocalPart } from './parse-email-name';

describe('parseNameFromEmailLocalPart', () => {
  it('parses john.doe style addresses', () => {
    expect(parseNameFromEmailLocalPart('john.doe@church.org')).toEqual({
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('returns null when local-part is not structured', () => {
    expect(parseNameFromEmailLocalPart('pastor@church.org')).toBeNull();
    expect(parseNameFromEmailLocalPart('j@church.org')).toBeNull();
  });
});
