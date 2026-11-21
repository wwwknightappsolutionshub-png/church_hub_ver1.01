import { BadRequestException } from '@nestjs/common';
import {
  FLEXIBLE_PHONE_HINT,
  UK_PHONE_HINT,
  normalizeFlexiblePhone,
  optionalFlexiblePhoneSchema,
  optionalPhoneSchema,
} from '@church-hub/shared-types';

/** Normalize optional flexible phone or throw (for non-DTO service paths). */
export function parseOptionalFlexiblePhoneOrThrow(
  value: unknown,
  fieldLabel = 'Phone number',
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldLabel} is invalid`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = optionalFlexiblePhoneSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new BadRequestException(
      parsed.error.issues[0]?.message ?? `${fieldLabel}: ${FLEXIBLE_PHONE_HINT}`,
    );
  }
  return parsed.data;
}

/** Normalize optional UK phone or throw. */
export function parseOptionalUkPhoneOrThrow(
  value: unknown,
  fieldLabel = 'Phone number',
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldLabel} is invalid`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = optionalPhoneSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new BadRequestException(
      parsed.error.issues[0]?.message ?? `${fieldLabel}: ${UK_PHONE_HINT}`,
    );
  }
  return parsed.data;
}

/** Soft normalize for CSV/XLSX import — drops invalid phones instead of failing the row. */
export function sanitizeImportedPhone(value: unknown): string | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  return normalizeFlexiblePhone(raw) ?? undefined;
}
