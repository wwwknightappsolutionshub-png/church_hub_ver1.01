import { Injectable } from '@nestjs/common';
import { optionalEmailSchema, optionalFlexiblePhoneSchema } from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

export type DuplicateJourneyMatch = {
  followUpId: string;
  contactName: string;
  stage: string;
  outreachContactId: string | null;
  capturedAt: Date | null;
};

@Injectable()
export class OutreachDedupeService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePhone(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    const parsed = optionalFlexiblePhoneSchema.safeParse(raw.trim());
    return parsed.success ? parsed.data : undefined;
  }

  normalizeEmail(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    const parsed = optionalEmailSchema.safeParse(raw.trim());
    return parsed.success ? parsed.data : undefined;
  }

  async findActiveJourneyDuplicates(
    churchId: string,
    phone?: string,
    email?: string,
  ): Promise<DuplicateJourneyMatch[]> {
    const normalizedPhone = this.normalizePhone(phone);
    const normalizedEmail = this.normalizeEmail(email);
    const or: Array<{ contactPhone?: string; contactEmail?: string }> = [];
    if (normalizedPhone) or.push({ contactPhone: normalizedPhone });
    if (normalizedEmail) or.push({ contactEmail: normalizedEmail });
    if (or.length === 0) return [];

    const rows = await this.prisma.followUp.findMany({
      where: { churchId, archivedAt: null, OR: or },
      select: {
        id: true,
        contactName: true,
        stage: true,
        outreachContact: { select: { id: true, capturedAt: true } },
      },
      take: 5,
    });

    return rows.map((r) => ({
      followUpId: r.id,
      contactName: r.contactName,
      stage: r.stage,
      outreachContactId: r.outreachContact?.id ?? null,
      capturedAt: r.outreachContact?.capturedAt ?? null,
    }));
  }
}