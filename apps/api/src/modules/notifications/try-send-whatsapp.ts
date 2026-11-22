import { Logger } from '@nestjs/common';
import type { SmsAdapter } from './adapters/sms.adapter';

/** Best-effort WhatsApp send — never throws; skips when phone missing. */
export async function trySendWhatsApp(
  sms: SmsAdapter,
  logger: Logger,
  params: {
    to?: string | null;
    body: string;
    churchId?: string | null;
    label: string;
  },
): Promise<boolean> {
  const to = params.to?.trim();
  if (!to) return false;
  try {
    await sms.sendWhatsApp({
      to,
      body: params.body,
      churchId: params.churchId?.trim() || 'platform',
    });
    return true;
  } catch (err) {
    logger.warn(
      `${params.label} WhatsApp failed for ${to}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}
