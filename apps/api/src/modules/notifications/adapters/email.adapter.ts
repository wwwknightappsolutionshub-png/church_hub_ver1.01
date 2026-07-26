import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailPayload {
  to: string;
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  /** Church scope for logging; null for platform-level mail. */
  churchId: string | null;
}

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

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

@Injectable()
export class EmailAdapter implements OnModuleInit {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: Transporter | null = null;
  private smtpHydrated = false;

  onModuleInit(): void {
    this.hydrateSmtpFromEnvFiles();
    const host = process.env.SMTP_HOST?.trim();
    if (host) {
      this.logger.log(`[EMAIL] SMTP ready host=${host} port=${process.env.SMTP_PORT ?? '587'}`);
    } else {
      this.logger.warn(
        '[EMAIL] SMTP_HOST missing — outbound mail will stub until root .env / PM2 env is fixed',
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
      for (const key of SMTP_KEYS) {
        const next = parsed[key]?.trim();
        if (!next) continue;
        const cur = process.env[key]?.trim();
        if (!cur) {
          process.env[key] = next;
        }
      }
    }
  }

  private getTransporter(): Transporter | null {
    this.hydrateSmtpFromEnvFiles();
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;
    if (this.transporter) return this.transporter;

    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId: string }> {
    const church = payload.churchId ?? 'platform';
    const bccNote = payload.bcc?.length ? ` bcc=${payload.bcc.length}` : '';
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.log(
        `[EMAIL:stub] church=${church} to=${payload.to}${bccNote} subject=${payload.subject}`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[EMAIL:stub body]\n${payload.body}`);
      }
      return { success: true, messageId: `email_stub_${Date.now()}` };
    }

    const from = process.env.SMTP_FROM?.trim() || 'noreply@churchhub.local';
    try {
      const info = await transporter.sendMail({
        from,
        to: payload.to,
        bcc: payload.bcc,
        subject: payload.subject,
        text: payload.body,
        html: payload.html ?? undefined,
      });
      const messageId = typeof info.messageId === 'string' ? info.messageId : `email_${Date.now()}`;
      this.logger.log(
        `[EMAIL] church=${church} to=${payload.to}${bccNote} subject=${payload.subject} id=${messageId}`,
      );
      return { success: true, messageId };
    } catch (err) {
      this.logger.error(
        `[EMAIL:fail] church=${church} to=${payload.to} subject=${payload.subject}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
