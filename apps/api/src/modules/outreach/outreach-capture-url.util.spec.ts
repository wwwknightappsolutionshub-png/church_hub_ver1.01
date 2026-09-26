import {
  buildOutreachCaptureUrl,
  resolveOutreachCaptureBaseUrl,
} from './outreach-capture-url.util';

describe('outreach-capture-url.util', () => {
  it('prefers request origin when it is the public brand domain', () => {
    expect(
      resolveOutreachCaptureBaseUrl(
        'https://church-hub.wazconnect.com',
        'https://church-hub.online',
      ),
    ).toBe('https://church-hub.online');
  });

  it('rewrites legacy wazconnect host to church-hub.online', () => {
    expect(resolveOutreachCaptureBaseUrl('https://church-hub.wazconnect.com')).toBe(
      'https://church-hub.online',
    );
    expect(
      resolveOutreachCaptureBaseUrl(null, 'https://church-hub.wazconnect.com'),
    ).toBe('https://church-hub.online');
  });

  it('builds capture URL from current public origin + code', () => {
    expect(buildOutreachCaptureUrl('https://church-hub.wazconnect.com/', 'abc123')).toBe(
      'https://church-hub.online/outreach/capture?code=abc123',
    );
  });
});
