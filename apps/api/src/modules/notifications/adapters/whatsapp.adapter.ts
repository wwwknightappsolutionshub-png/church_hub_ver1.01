import { Injectable, Logger } from '@nestjs/common';
import { PlatformWhatsAppService } from '../../platform/platform-whatsapp.service';

export interface WhatsAppPayload {
  to: string;
  body: string;
  churchId: string;
}

export type WhatsAppSendResult = {
  success: boolean;
  messageId: string;
  error?: string;
};

/**
 * Church Hub phone messaging channel — one platform-wide WhatsApp session.
 * Credentials: Platform Integrations UI (DB) with WHATSAPP_* env fallback.
 */
@Injectable()
export class WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);
  private cache: { at: number; creds: Awaited<ReturnType<PlatformWhatsAppService['resolveCredentials']>> } | null =
    null;
  private static readonly CACHE_MS = 15_000;

  constructor(private readonly whatsappConfig: PlatformWhatsAppService) {}

  invalidateCache() {
    this.cache = null;
  }

  private async credentials() {
    const now = Date.now();
    if (this.cache && now - this.cache.at < WhatsAppAdapter.CACHE_MS) {
      return this.cache.creds;
    }
    const creds = await this.whatsappConfig.resolveCredentials();
    this.cache = { at: now, creds };
    return creds;
  }

  /** Normalize to digits only; providers often expect country code without +. */
  private normalizeNumber(raw: string): string {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return trimmed;
    return digits;
  }

  async send(payload: WhatsAppPayload): Promise<WhatsAppSendResult> {
    const creds = await this.credentials();
    if (!creds.enabled || !creds.apiUrl || !creds.apiKey || !creds.sessionId) {
      this.logger.warn(
        `[WhatsApp] not configured — stub log church=${payload.churchId} to=${payload.to}`,
      );
      return {
        success: true,
        messageId: `wa_stub_${Date.now()}`,
        error: 'WhatsApp gateway is not configured. Set it under Platform → Integrations.',
      };
    }

    const number = this.normalizeNumber(payload.to);
    const body = {
      sessionId: creds.sessionId,
      number,
      type: 'text',
      message: payload.body,
      source: 'API',
    };

    try {
      const res = await fetch(creds.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [creds.apiKeyHeader]: creds.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });

      const text = await res.text();
      let parsed: { messageId?: string; id?: string; success?: boolean; error?: string; message?: string } = {};
      try {
        parsed = text ? (JSON.parse(text) as typeof parsed) : {};
      } catch {
        /* non-JSON body */
      }

      const messageId =
        parsed.messageId ||
        parsed.id ||
        `wa_${Date.now()}`;

      if (!res.ok) {
        const err =
          parsed.error ||
          parsed.message ||
          text.slice(0, 200) ||
          `HTTP ${res.status}`;
        this.logger.error(
          `[WhatsApp] send failed church=${payload.churchId} to=${number} status=${res.status} ${err}`,
        );
        await this.whatsappConfig.recordSendResult(false);
        return { success: false, messageId, error: err };
      }

      this.logger.log(
        `[WhatsApp] sent church=${payload.churchId} to=${number} id=${messageId} via=${creds.source}`,
      );
      await this.whatsappConfig.recordSendResult(true);
      return { success: true, messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`[WhatsApp] send error church=${payload.churchId} to=${number}: ${error}`);
      await this.whatsappConfig.recordSendResult(false);
      return { success: false, messageId: `wa_err_${Date.now()}`, error };
    }
  }
}
