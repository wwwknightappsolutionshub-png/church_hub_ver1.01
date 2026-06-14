import { Injectable, Logger } from '@nestjs/common';

export interface EmailPayload {
  to: string;
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  churchId: string;
}

@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger(EmailAdapter.name);

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId: string }> {
    const bccNote = payload.bcc?.length ? ` bcc=${payload.bcc.length}` : '';
    this.logger.log(`[EMAIL] to=${payload.to}${bccNote} subject=${payload.subject}`);
    return { success: true, messageId: `email_${Date.now()}` };
  }
}
