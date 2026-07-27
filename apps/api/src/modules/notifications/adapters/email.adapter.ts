import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Auth = magic/reset/OTP; reports = digests and report mail. */
export type EmailPurpose = 'auth' | 'reports';

export interface EmailPayload {
  to: string;
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  /** Church scope for logging; null for platform-level mail. */
  churchId: string | null;
  /** Defaults to auth (transactional). Use reports for digests. */
  purpose?: EmailPurpose;
}

const LEGACY_SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;
const AUTH_SMTP_KEYS = [
  'SMTP_AUTH_HOST',
  'SMTP_AUTH_PORT',
  'SMTP_AUTH_USER',
  'SMTP_AUTH_PASS',
  'SMTP_AUTH_FROM',
] as const;
const REPORTS_SMTP_KEYS = [
  'SMTP_REPORTS_HOST',
  'SMTP_REPORTS_PORT',
  'SMTP_REPORTS_USER',
  'SMTP_REPORTS_PASS',
  'SMTP_REPORTS_FROM',
] as const;

const ALL_SMTP_KEYS = [...LEGACY_SMTP_KEYS, ...AUTH_SMTP_KEYS, ...REPORTS_SMTP_KEYS] as const;

type SmtpChannelConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  label: string;
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
  private authTransporter: Transporter | null = null;
  private reportsTransporter: Transporter | null = null;
  private smtpHydrated = false;

  onModuleInit(): void {
    this.hydrateSmtpFromEnvFiles();
    const auth = this.resolveChannelConfig('auth');
    const reports = this.resolveChannelConfig('reports');
    if (auth) {
      this.logger.log(
        `[EMAIL] AUTH SMTP ready host=${auth.host} port=${auth.port} from=${auth.from}`,
      );
    } else {
      this.logger.warn(
        '[EMAIL] AUTH SMTP missing — magic/reset/OTP will stub until SMTP_AUTH_* or SMTP_* is set',
      );
    }
    if (reports) {
      this.logger.log(
        `[EMAIL] REPORTS SMTP ready host=${reports.host} port=${reports.port} from=${reports.from}`,
      );
    } else {
      this.logger.warn(
        '[EMAIL] REPORTS SMTP missing — digests will stub until SMTP_REPORTS_* or SMTP_* is set',
      );
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

    if (purpose === 'auth') {
      const host = envTrim('SMTP_AUTH_HOST') || envTrim('SMTP_HOST');
      if (!host) return null;
      const port = parseInt(envTrim('SMTP_AUTH_PORT') || envTrim('SMTP_PORT') || '587', 10);
      return {
        host,
        port,
        user: envTrim('SMTP_AUTH_USER') || envTrim('SMTP_USER'),
        pass: envTrim('SMTP_AUTH_PASS') || envTrim('SMTP_PASS'),
        from:
          envTrim('SMTP_AUTH_FROM') ||
          envTrim('SMTP_FROM') ||
          'noreply@churchhub.local',
        label: 'auth',
      };
    }

    const host = envTrim('SMTP_REPORTS_HOST') || envTrim('SMTP_HOST');
    if (!host) return null;
    const port = parseInt(envTrim('SMTP_REPORTS_PORT') || envTrim('SMTP_PORT') || '587', 10);
    return {
      host,
      port,
      user: envTrim('SMTP_REPORTS_USER') || envTrim('SMTP_USER'),
      pass: envTrim('SMTP_REPORTS_PASS') || envTrim('SMTP_PASS'),
      from:
        envTrim('SMTP_REPORTS_FROM') ||
        envTrim('SMTP_FROM') ||
        'reports@churchhub.local',
      label: 'reports',
    };
  }

  private getTransporter(purpose: EmailPurpose): { transporter: Transporter; from: string } | null {
    const cfg = this.resolveChannelConfig(purpose);
    if (!cfg) return null;

    if (purpose === 'auth') {
      if (!this.authTransporter) {
        this.authTransporter = nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.port === 465,
          auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
        });
      }
      return { transporter: this.authTransporter, from: cfg.from };
    }

    if (!this.reportsTransporter) {
      this.reportsTransporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      });
    }
    return { transporter: this.reportsTransporter, from: cfg.from };
  }

  /** True when the given purpose channel (or legacy SMTP_*) is configured. */
  isConfigured(purpose: EmailPurpose = 'auth'): boolean {
    return this.resolveChannelConfig(purpose) != null;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId: string }> {
    const purpose: EmailPurpose = payload.purpose ?? 'auth';
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
