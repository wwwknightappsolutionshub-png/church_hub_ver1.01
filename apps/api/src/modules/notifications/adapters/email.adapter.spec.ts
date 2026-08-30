import { EmailAdapter } from './email.adapter';

const SMTP_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_AUTH_HOST',
  'SMTP_AUTH_PORT',
  'SMTP_AUTH_USER',
  'SMTP_AUTH_PASS',
  'SMTP_AUTH_FROM',
  'SMTP_ONBOARDING_HOST',
  'SMTP_ONBOARDING_PORT',
  'SMTP_ONBOARDING_USER',
  'SMTP_ONBOARDING_PASS',
  'SMTP_ONBOARDING_FROM',
  'SMTP_REPORTS_HOST',
  'SMTP_REPORTS_PORT',
  'SMTP_REPORTS_USER',
  'SMTP_REPORTS_PASS',
  'SMTP_REPORTS_FROM',
  'SMTP_CONNECT_HOST',
  'SMTP_CONNECT_PORT',
  'SMTP_CONNECT_USER',
  'SMTP_CONNECT_PASS',
  'SMTP_CONNECT_FROM',
] as const;

function clearSmtpEnv(): void {
  for (const key of SMTP_KEYS) {
    delete process.env[key];
  }
}

describe('EmailAdapter', () => {
  afterEach(() => {
    clearSmtpEnv();
  });

  it('detects each quad-SMTP channel independently', () => {
    clearSmtpEnv();
    process.env.SMTP_AUTH_HOST = 'smtp.hostinger.com';
    process.env.SMTP_ONBOARDING_HOST = 'smtp.hostinger.com';
    process.env.SMTP_REPORTS_HOST = 'smtp.hostinger.com';
    process.env.SMTP_CONNECT_HOST = 'smtp.hostinger.com';

    const adapter = new EmailAdapter();
    adapter.onModuleInit();

    expect(adapter.isConfigured('auth')).toBe(true);
    expect(adapter.isConfigured('onboarding')).toBe(true);
    expect(adapter.isConfigured('reports')).toBe(true);
    expect(adapter.isConfigured('connect')).toBe(true);
  });

  it('stubs send when channel env is missing', async () => {
    clearSmtpEnv();
    const adapter = new EmailAdapter();
    adapter.onModuleInit();

    const result = await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
      churchId: null,
      purpose: 'onboarding',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^email_stub_/);
  });
});
