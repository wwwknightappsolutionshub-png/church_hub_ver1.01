import { Injectable, Logger } from '@nestjs/common';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
  churchId: string;
}

@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger(EmailAdapter.name);

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(`[EMAIL] to=${payload.to} subject=${payload.subject}`);
    return { success: true, messageId: `email_${Date.now()}` };
  }
}
