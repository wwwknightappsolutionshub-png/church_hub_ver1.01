import { Injectable } from '@nestjs/common';
import { WhatsAppAdapter, WhatsAppPayload } from './whatsapp.adapter';

/** @deprecated Use WhatsAppAdapter — Church_Hub is WhatsApp-only for phone messaging. */
export type SmsPayload = WhatsAppPayload;

/**
 * Back-compat alias: all phone sends route to WhatsApp.
 */
@Injectable()
export class SmsAdapter {
  constructor(private readonly whatsApp: WhatsAppAdapter) {}

  async send(payload: SmsPayload) {
    return this.whatsApp.send(payload);
  }

  async sendWhatsApp(payload: SmsPayload) {
    return this.whatsApp.send(payload);
  }
}
