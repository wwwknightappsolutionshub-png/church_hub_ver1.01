import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * auth       — churchnoreply@… password reset, OTP, magic link, 2FA
 * onboarding — onboarding@…    welcome / first-touch mail
 * reports    — reports@…       weekly digests and department reports
 * connect    — connect@…       admin broadcasts and external correspondence
 */
export type EmailPurpose = 'auth' | 'onboarding' | 'reports' | 'connect';

export interface EmailPayload {
  to: string;
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  /** Church scope for logging; null for platform-level mail. */
  churchId: string | null;
  /** Defaults to connect (admin/external). Use auth, onboarding, or reports when appropriate. */
  purpose?: EmailPurpose;
}

const LEGACY_SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

const CHANNEL_ENV_PREFIX: Record<EmailPurpose, string> = {
  auth: 'SMTP_AUTH',
  onboarding: 'SMTP_ONBOARDING',
  reports: 'SMTP_REPORTS',
  connect: 'SMTP_CONNECT',
};

const CHANNEL_DEFAULT_FROM: Record<EmailPurpose, string> = {
  auth: 'churchnoreply@church-hub.online',
  onboarding: 'onboarding@church-hub.online',
  reports: 'reports@church-hub.online',
  connect: 'connect@church-hub.online',
};

const CHANNEL_STUB_HINT: Record<EmailPurpose, string> = {
  auth: 'magic/reset/OTP',
  onboarding: 'welcome/onboarding',
  reports: 'digests/reports',
  connect: 'admin/external mail',
};

function channelSmtpKeys(prefix: string): readonly string[] {
  return [
    `${prefix}_HOST`,
    `${prefix}_PORT`,
    `${prefix}_USER`,
    `${prefix}_PASS`,
    `${prefix}_FROM`,
  ];
}

const ALL_SMTP_KEYS = [
  ...LEGACY_SMTP_KEYS,
  ...Object.values(CHANNEL_ENV_PREFIX).flatMap((prefix) => channelSmtpKeys(prefix)),
] as const;

type SmtpChannelConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  label: EmailPurpose;
};

/** Minimal .env line parser (no dotenv dependency in this adapter). */
function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function envTrim(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

@Injectable()
export class EmailAdapter implements OnModuleInit {
  private readonly logger = new Logger(EmailAdapter.name);
  private readonly transporters = new Map<EmailPurpose, Transporter>();
  private smtpHydrated = false;

  onModuleInit(): void {
    this.hydrateSmtpFromEnvFiles();
    for (const purpose of Object.keys(CHANNEL_ENV_PREFIX) as EmailPurpose[]) {
      const cfg = this.resolveChannelConfig(purpose);
      if (cfg) {
        this.logger.log(
          `[EMAIL] ${purpose.toUpperCase()} SMTP ready host=${cfg.host} port=${cfg.port} from=${cfg.from}`,
        );
      } else {
        this.logger.warn(
          `[EMAIL] ${purpose.toUpperCase()} SMTP missing — ${CHANNEL_STUB_HINT[purpose]} will stub until ${CHANNEL_ENV_PREFIX[purpose]}_* is set`,
        );
      }
    }
  }

  /**
   * PM2 may show SMTP in `pm2 env` while the live process still lacks it after reload.
   * Nest ConfigModule also loads apps/api/.env first; empty SMTP_HOST= there blocks root .env.
   * Fill only blank SMTP_* from cwd-relative .env files (root last-wins for non-empty).
   */
  private hydrateSmtpFromEnvFiles(): void {
    if (this.smtpHydrated) return;
    this.smtpHydrated = true;

    const candidates = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '../.env'),
      path.join(process.cwd(), '../../.env'),
    ];

    for (const file of candidates) {
      const parsed = parseEnvFile(file);
      for (const key of ALL_SMTP_KEYS) {
        const next = parsed[key]?.trim();
        if (!next) continue;
        const cur = process.env[key]?.trim();
        if (!cur) {
          process.env[key] = next;
        }
      }
    }
  }

  private resolveChannelConfig(purpose: EmailPurpose): SmtpChannelConfig | null {
    this.hydrateSmtpFromEnvFiles();

    const prefix = CHANNEL_ENV_PREFIX[purpose];
    const host = envTrim(`${prefix}_HOST`) || (purpose === 'auth' ? envTrim('SMTP_HOST') : undefined);
    if (!host) return null;

    const port = parseInt(
      envTrim(`${prefix}_PORT`) || (purpose === 'auth' ? envTrim('SMTP_PORT') : undefined) || '587',
      10,
    );

    return {
      host,
      port,
      user: envTrim(`${prefix}_USER`) || (purpose === 'auth' ? envTrim('SMTP_USER') : undefined),
      pass: envTrim(`${prefix}_PASS`) || (purpose === 'auth' ? envTrim('SMTP_PASS') : undefined),
      from:
        envTrim(`${prefix}_FROM`) ||
        (purpose === 'auth' ? envTrim('SMTP_FROM') : undefined) ||
        CHANNEL_DEFAULT_FROM[purpose],
      label: purpose,
    };
  }

  private getTransporter(purpose: EmailPurpose): { transporter: Transporter; from: string } | null {
    const cfg = this.resolveChannelConfig(purpose);
    if (!cfg) return null;

    let transporter = this.transporters.get(purpose);
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      });
      this.transporters.set(purpose, transporter);
    }

    return { transporter, from: cfg.from };
  }

  /** True when the given purpose channel is configured. */
  isConfigured(purpose: EmailPurpose = 'connect'): boolean {
    return this.resolveChannelConfig(purpose) != null;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId: string }> {
    const purpose: EmailPurpose = payload.purpose ?? 'connect';
    const church = payload.churchId ?? 'platform';
    const bccNote = payload.bcc?.length ? ` bcc=${payload.bcc.length}` : '';
    const channel = this.getTransporter(purpose);

    if (!channel) {
      this.logger.log(
        `[EMAIL:stub:${purpose}] church=${church} to=${payload.to}${bccNote} subject=${payload.subject}`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[EMAIL:stub body]\n${payload.body}`);
      }
      return { success: true, messageId: `email_stub_${Date.now()}` };
    }

    try {
      const info = await channel.transporter.sendMail({
        from: channel.from,
        to: payload.to,
        bcc: payload.bcc,
        subject: payload.subject,
        text: payload.body,
        html: payload.html ?? undefined,
      });
      const messageId = typeof info.messageId === 'string' ? info.messageId : `email_${Date.now()}`;
      this.logger.log(
        `[EMAIL:${purpose}] church=${church} to=${payload.to}${bccNote} from=${channel.from} subject=${payload.subject} id=${messageId}`,
      );
      return { success: true, messageId };
    } catch (err) {
      this.logger.error(
        `[EMAIL:fail:${purpose}] church=${church} to=${payload.to} subject=${payload.subject}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
