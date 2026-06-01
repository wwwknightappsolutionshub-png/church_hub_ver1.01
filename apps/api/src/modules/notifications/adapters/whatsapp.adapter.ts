import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppPayload {
  to: string;
  body: string;
  churchId: string;
}

/**
 * Church_Hub uses WhatsApp as the only phone messaging channel (no SMS).
 * Wire Meta Cloud API / provider here when credentials are configured.
 */
@Injectable()
export class WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);

  async send(payload: WhatsAppPayload): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(
      `[WhatsApp] church=${payload.churchId} to=${payload.to} body=${payload.body.slice(0, 80)}`,
    );
    return { success: true, messageId: `wa_${Date.now()}` };
  }
}
