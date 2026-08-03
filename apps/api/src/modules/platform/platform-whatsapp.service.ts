import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { decryptSecret, encryptSecret, maskSecretHint } from '../../common/crypto/secret-box';

export const PLATFORM_WHATSAPP_CONFIG_ID = 'global';

export type WhatsAppRuntimeCredentials = {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  sessionId: string;
  apiKeyHeader: string;
  source: 'database' | 'env' | 'none';
};

export type PlatformWhatsAppPublicConfig = {
  enabled: boolean;
  apiUrl: string | null;
  sessionId: string | null;
  apiKeyHeader: string;
  apiKeyConfigured: boolean;
  apiKeyHint: string | null;
  envFallbackAvailable: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastSendAt: string | null;
  lastSendOk: boolean | null;
  updatedAt: string | null;
  updatedBy: { id: string; email: string; firstName: string; lastName: string } | null;
};

@Injectable()
export class PlatformWhatsAppService {
  private readonly logger = new Logger(PlatformWhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  private envFallbackAvailable(): boolean {
    return Boolean(
      process.env.WHATSAPP_API_URL?.trim() &&
        process.env.WHATSAPP_API_KEY?.trim() &&
        process.env.WHATSAPP_SESSION_ID?.trim(),
    );
  }

  async ensureRow() {
    return this.prisma.platformWhatsAppConfig.upsert({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      create: {
        id: PLATFORM_WHATSAPP_CONFIG_ID,
        enabled: false,
        apiKeyHeader: 'x-api-key',
      },
      update: {},
      include: {
        updatedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getPublicConfig(): Promise<PlatformWhatsAppPublicConfig> {
    const row = await this.ensureRow();
    let apiKeyHint: string | null = null;
    if (row.apiKeyEncrypted) {
      try {
        apiKeyHint = maskSecretHint(decryptSecret(row.apiKeyEncrypted));
      } catch {
        apiKeyHint = '••••••••';
      }
    }

    return {
      enabled: row.enabled,
      apiUrl: row.apiUrl,
      sessionId: row.sessionId,
      apiKeyHeader: row.apiKeyHeader || 'x-api-key',
      apiKeyConfigured: Boolean(row.apiKeyEncrypted),
      apiKeyHint,
      envFallbackAvailable: this.envFallbackAvailable(),
      lastTestAt: row.lastTestAt?.toISOString() ?? null,
      lastTestOk: row.lastTestOk,
      lastTestMessage: row.lastTestMessage,
      lastSendAt: row.lastSendAt?.toISOString() ?? null,
      lastSendOk: row.lastSendOk,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      updatedBy: row.updatedBy,
    };
  }

  /**
   * Resolve credentials for sending. DB config wins when enabled + complete;
   * otherwise falls back to WHATSAPP_* env vars.
   */
  async resolveCredentials(): Promise<WhatsAppRuntimeCredentials> {
    const row = await this.ensureRow();
    if (row.enabled && row.apiUrl?.trim() && row.sessionId?.trim() && row.apiKeyEncrypted) {
      try {
        const apiKey = decryptSecret(row.apiKeyEncrypted);
        if (apiKey.trim()) {
          return {
            enabled: true,
            apiUrl: row.apiUrl.trim(),
            apiKey: apiKey.trim(),
            sessionId: row.sessionId.trim(),
            apiKeyHeader: (row.apiKeyHeader || 'x-api-key').trim(),
            source: 'database',
          };
        }
      } catch (err) {
        this.logger.warn(`Failed to decrypt WhatsApp API key: ${(err as Error).message}`);
      }
    }

    const apiUrl = process.env.WHATSAPP_API_URL?.trim();
    const apiKey = process.env.WHATSAPP_API_KEY?.trim();
    const sessionId = process.env.WHATSAPP_SESSION_ID?.trim();
    const apiKeyHeader = process.env.WHATSAPP_API_KEY_HEADER?.trim() || 'x-api-key';
    if (apiUrl && apiKey && sessionId) {
      return {
        enabled: true,
        apiUrl,
        apiKey,
        sessionId,
        apiKeyHeader,
        source: 'env',
      };
    }

    return {
      enabled: false,
      apiUrl: '',
      apiKey: '',
      sessionId: '',
      apiKeyHeader: 'x-api-key',
      source: 'none',
    };
  }

  async updateConfig(
    actorUserId: string,
    input: {
      enabled?: boolean;
      apiUrl?: string | null;
      sessionId?: string | null;
      apiKeyHeader?: string | null;
      /** Pass a new key to rotate; omit/empty to keep existing. */
      apiKey?: string | null;
      clearApiKey?: boolean;
    },
  ): Promise<PlatformWhatsAppPublicConfig> {
    await this.ensureRow();
    const data: {
      enabled?: boolean;
      apiUrl?: string | null;
      sessionId?: string | null;
      apiKeyHeader?: string;
      apiKeyEncrypted?: string | null;
      updatedByUserId: string;
    } = { updatedByUserId: actorUserId };

    if (typeof input.enabled === 'boolean') data.enabled = input.enabled;
    if (input.apiUrl !== undefined) {
      const v = input.apiUrl?.trim() || null;
      if (v && !/^https?:\/\//i.test(v)) {
        throw new BadRequestException('API URL must start with http:// or https://');
      }
      data.apiUrl = v;
    }
    if (input.sessionId !== undefined) {
      data.sessionId = input.sessionId?.trim() || null;
    }
    if (input.apiKeyHeader !== undefined) {
      data.apiKeyHeader = input.apiKeyHeader?.trim() || 'x-api-key';
    }
    if (input.clearApiKey === true) {
      data.apiKeyEncrypted = null;
    } else if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
      data.apiKeyEncrypted = encryptSecret(input.apiKey.trim());
    }

    await this.prisma.platformWhatsAppConfig.update({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      data,
    });

    return this.getPublicConfig();
  }

  async recordSendResult(ok: boolean) {
    try {
      await this.prisma.platformWhatsAppConfig.update({
        where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
        data: { lastSendAt: new Date(), lastSendOk: ok },
      });
    } catch {
      /* singleton may not exist yet in fresh DB */
    }
  }

  async recordTestResult(ok: boolean, message: string) {
    await this.prisma.platformWhatsAppConfig.update({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      data: {
        lastTestAt: new Date(),
        lastTestOk: ok,
        lastTestMessage: message.slice(0, 500),
      },
    });
  }
}
