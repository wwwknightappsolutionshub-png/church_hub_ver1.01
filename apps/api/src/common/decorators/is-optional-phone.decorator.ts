import { Transform } from 'class-transformer';
import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import {
  FLEXIBLE_PHONE_HINT,
  UK_PHONE_HINT,
  normalizeFlexiblePhone,
  normalizeUkPhoneToE164,
} from '@church-hub/shared-types';

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/** Empty / whitespace → undefined; keep null when clients clear a field. */
function emptyToUndefinedOrNull(value: unknown): unknown {
  if (value === null) return null;
  return emptyToUndefined(value);
}

@ValidatorConstraint({ name: 'isOptionalFlexiblePhone', async: false })
export class IsOptionalFlexiblePhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value == null || value === '') return true;
    if (typeof value !== 'string') return false;
    return normalizeFlexiblePhone(value) != null;
  }

  defaultMessage() {
    return FLEXIBLE_PHONE_HINT;
  }
}

@ValidatorConstraint({ name: 'isOptionalUkPhone', async: false })
export class IsOptionalUkPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value == null || value === '') return true;
    if (typeof value !== 'string') return false;
    return normalizeUkPhoneToE164(value) != null;
  }

  defaultMessage() {
    return UK_PHONE_HINT;
  }
}

/**
 * Optional multi-country phone for person/contact DTOs.
 * Normalizes valid values; rejects letters and non-dialable junk.
 */
export function IsOptionalFlexiblePhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Transform(({ value }) => {
      const prepared = emptyToUndefinedOrNull(value);
      if (prepared == null) return prepared;
      if (typeof prepared !== 'string') return prepared;
      return normalizeFlexiblePhone(prepared) ?? prepared;
    })(object, propertyName);
    registerDecorator({
      name: 'isOptionalFlexiblePhone',
      target: object.constructor,
      propertyName,
      options: { message: FLEXIBLE_PHONE_HINT, ...validationOptions },
      validator: IsOptionalFlexiblePhoneConstraint,
    });
  };
}

/** Optional UK phone (membership / landing). */
export function IsOptionalUkPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Transform(({ value }) => {
      const prepared = emptyToUndefinedOrNull(value);
      if (prepared == null) return prepared;
      if (typeof prepared !== 'string') return prepared;
      return normalizeUkPhoneToE164(prepared) ?? prepared;
    })(object, propertyName);
    registerDecorator({
      name: 'isOptionalUkPhone',
      target: object.constructor,
      propertyName,
      options: { message: UK_PHONE_HINT, ...validationOptions },
      validator: IsOptionalUkPhoneConstraint,
    });
  };
}
