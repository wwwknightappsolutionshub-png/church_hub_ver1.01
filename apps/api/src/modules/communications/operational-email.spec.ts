import {
  brandPlainUpdate,
  emailDeliveryParts,
  expandsToServiceUnit,
  mailDataTable,
  mailLinkCell,
} from './operational-email';

describe('operational email', () => {
  it('builds a branded shell and escapes the church name and field values', () => {
    const html = brandPlainUpdate({
      churchName: 'Grace <Chapel>',
      eyebrow: 'RTP request',
      headline: 'Choir — Name',
      plain: ['Service Unit: Choir', 'Submitted by: Opeyemi <script>'].join('\n'),
    });
    expect(html).toContain('Grace Chapel');
    expect(html).not.toContain('<Chapel>');
    expect(html).toContain('Service Unit');
    expect(html).toContain('Opeyemi &lt;script&gt;');
    expect(html).toContain('#1e3a5f');
  });

  it('keeps the plain body for in-app and WhatsApp when emailHtml is set', () => {
    const parts = emailDeliveryParts('Short summary', { emailHtml: '<p>Table</p>' });
    expect(parts.text).toBe('Short summary');
    expect(parts.html).toBe('<p>Table</p>');
  });

  it('rejects non-http links in purchase item cells', () => {
    expect(mailLinkCell('javascript:alert(1)')).not.toContain('href');
    expect(mailLinkCell('https://shop.example/item')).toContain('href="https://shop.example/item"');
  });

  it('escapes purchase descriptions so they cannot become HTML', () => {
    const html = mailDataTable(['Item'], [['<script>alert(1)</script>']]);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('does not copy a personal message to the whole unit', () => {
    expect(
      expandsToServiceUnit({
        serviceUnitId: 'unit-1',
        targetMemberId: 'member-1',
        targetUserId: null,
      }),
    ).toBe(false);
    expect(
      expandsToServiceUnit({ serviceUnitId: 'unit-1', targetMemberId: null, targetUserId: null }),
    ).toBe(true);
  });

  it('keeps confidential detail off email and WhatsApp when an external summary is set', () => {
    const parts = emailDeliveryParts('Member: Jane. Diagnosis notes.', {
      externalBody: 'A medical incident was recorded. Open Church Hub.',
      emailHtml: '<p>A medical incident was recorded.</p>',
    });
    expect(parts.text).toBe('A medical incident was recorded. Open Church Hub.');
    expect(parts.html).not.toContain('Jane');
  });

  it('drops email HTML that contains a script', () => {
    const parts = emailDeliveryParts('Safe summary', { emailHtml: '<script>alert(1)</script>' });
    expect(parts.html).toBeUndefined();
    expect(parts.text).toBe('Safe summary');
  });
});
