import {
  FLEXIBLE_PHONE_HINT,
  OutreachCaptureSchema,
  flexiblePhoneSchema,
  isLikelyUkPostcode,
  looksLikeUkPhone,
  normalizeFlexiblePhone,
  optionalPostalCodeSchema,
  phoneSchema,
} from '@church-hub/shared-types';

describe('flexible outreach contact validation', () => {
  describe('looksLikeUkPhone / normalizeFlexiblePhone', () => {
    it('still normalizes UK mobiles to +44', () => {
      expect(looksLikeUkPhone('07123 456789')).toBe(true);
      expect(normalizeFlexiblePhone('07123 456789')).toBe('+447123456789');
      expect(normalizeFlexiblePhone('+44 7123 456789')).toBe('+447123456789');
    });

    it('does not treat Nigerian national numbers as UK', () => {
      expect(looksLikeUkPhone('0803 123 4567')).toBe(false);
      expect(normalizeFlexiblePhone('0803 123 4567')).toBe('08031234567');
    });

    it('accepts international E.164', () => {
      expect(normalizeFlexiblePhone('+234 801 234 5678')).toBe('+2348012345678');
      expect(normalizeFlexiblePhone('002348012345678')).toBe('+2348012345678');
      expect(normalizeFlexiblePhone('+1 212 555 1234')).toBe('+12125551234');
    });

    it('rejects letters and too-short numbers', () => {
      expect(normalizeFlexiblePhone('call me')).toBeNull();
      expect(normalizeFlexiblePhone('12345')).toBeNull();
    });
  });

  describe('flexiblePhoneSchema vs phoneSchema', () => {
    it('UK numbers pass both', () => {
      expect(phoneSchema.safeParse('07123456789').success).toBe(true);
      expect(flexiblePhoneSchema.safeParse('07123456789').success).toBe(true);
      expect(flexiblePhoneSchema.safeParse('07123456789').data).toBe('+447123456789');
    });

    it('non-UK numbers pass flexible only', () => {
      expect(phoneSchema.safeParse('+2348012345678').success).toBe(false);
      const flex = flexiblePhoneSchema.safeParse('+2348012345678');
      expect(flex.success).toBe(true);
      if (flex.success) expect(flex.data).toBe('+2348012345678');
    });

    it('surfaces flexible hint on invalid phone', () => {
      const bad = flexiblePhoneSchema.safeParse('abc');
      expect(bad.success).toBe(false);
      if (!bad.success) {
        expect(bad.error.issues.some((i) => i.message.includes('letters') || i.message === FLEXIBLE_PHONE_HINT)).toBe(
          true,
        );
      }
    });
  });

  describe('isLikelyUkPostcode / optionalPostalCodeSchema', () => {
    it('detects UK postcodes and ignores all-digit ZIP', () => {
      expect(isLikelyUkPostcode('DA1 1AA')).toBe(true);
      expect(isLikelyUkPostcode('N1')).toBe(true);
      expect(isLikelyUkPostcode('10001')).toBe(false);
      expect(isLikelyUkPostcode('110001')).toBe(false);
    });

    it('accepts UK and international postal codes', () => {
      expect(optionalPostalCodeSchema.safeParse('DA1 1AA').success).toBe(true);
      expect(optionalPostalCodeSchema.safeParse('10001').success).toBe(true);
      expect(optionalPostalCodeSchema.safeParse('').success).toBe(true);
      expect(optionalPostalCodeSchema.safeParse('').data).toBeUndefined();
    });
  });

  describe('OutreachCaptureSchema', () => {
    it('requires structured address for international phone', () => {
      const missing = OutreachCaptureSchema.safeParse({
        firstName: 'Ada',
        phone: '+234 801 234 5678',
        postcode: '100001',
      });
      expect(missing.success).toBe(false);

      const parsed = OutreachCaptureSchema.safeParse({
        firstName: 'Ada',
        phone: '+234 801 234 5678',
        addressStreet: '12 Admiralty Way',
        addressCity: 'Lagos',
        addressCountry: 'Nigeria',
        addressPostal: '100001',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.phone).toBe('+2348012345678');
        expect(parsed.data.addressCity).toBe('Lagos');
      }
    });

    it('still accepts classic UK capture payloads without structured address', () => {
      const parsed = OutreachCaptureSchema.safeParse({
        firstName: 'Ada',
        phone: '07123 456789',
        postcode: 'DA1 1AA',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.phone).toBe('+447123456789');
        expect(parsed.data.postcode).toBe('DA1 1AA');
      }
    });
  });
});
