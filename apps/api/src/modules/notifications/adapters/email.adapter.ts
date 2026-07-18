import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
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
