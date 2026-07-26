import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCellBranchSchema,
  CreateCellProvinceSchema,
  CreateChurchStaffSchema,
  CreatePlatformChurchSchema,
  LoginCredentialsSchema,
  RefreshTokenSchema,
  RegisterStartSchema,
} from '@church-hub/shared-types';
import { CreateChurchStaffDto } from '../church-staff/dto/church-staff.dto';
import { CreateChurchDto } from '../platform/dto/create-church.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto, RegisterStartDto } from './dto/register.dto';

async function validateDto<T extends object>(Cls: new () => T, payload: unknown) {
  const instance = plainToInstance(Cls, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('B2 auth/staff/platform DTO validation', () => {
  it('rejects invalid login email', async () => {
    const errors = await validateDto(LoginDto, { email: 'not-an-email', password: 'x' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid login', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'admin@demo.church',
      password: 'secret',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects short registration password', async () => {
    const errors = await validateDto(RegisterStartDto, {
      churchName: 'Test Church',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      password: 'short',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects refresh token that is too short', async () => {
    const errors = await validateDto(RefreshTokenDto, { refreshToken: 'short' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects staff create without roles whitelist match', async () => {
    const errors = await validateDto(CreateChurchStaffDto, {
      email: 'staff@demo.church',
      password: 'ChurchHub123!',
      firstName: 'Ann',
      lastName: 'Admin',
      roles: ['NOT_A_ROLE'],
    });
    expect(errors.some((e) => e.property === 'roles')).toBe(true);
  });

  it('accepts valid staff create', async () => {
    const errors = await validateDto(CreateChurchStaffDto, {
      email: 'staff@demo.church',
      password: 'ChurchHub123!',
      firstName: 'Ann',
      lastName: 'Admin',
      roles: ['ADMIN'],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid platform church slug', async () => {
    const errors = await validateDto(CreateChurchDto, {
      name: 'Demo Church',
      slug: 'Bad Slug!!',
      adminEmail: 'admin@demo.church',
    });
    // After transform, invalid chars become hyphens; "Bad Slug!!" → "bad-slug" which is valid.
    // Use a slug that stays invalid after sanitize (empty after strip):
    const emptySlug = await validateDto(CreateChurchDto, {
      name: 'Demo Church',
      slug: '!!!',
      adminEmail: 'admin@demo.church',
    });
    expect(emptySlug.length).toBeGreaterThan(0);
    void errors;
  });

  it('accepts valid platform church create', async () => {
    const errors = await validateDto(CreateChurchDto, {
      name: 'Demo Church',
      slug: 'demo-church',
      adminEmail: 'admin@demo.church',
      pastorEmail: 'pastor@demo.church',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('B2–B4 shared Zod schemas (API contract)', () => {
  it('LoginCredentialsSchema rejects invalid email', () => {
    expect(LoginCredentialsSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(
      false,
    );
  });

  it('RefreshTokenSchema rejects short token', () => {
    expect(RefreshTokenSchema.safeParse({ refreshToken: 'short' }).success).toBe(false);
  });

  it('RegisterStartSchema rejects short password', () => {
    const parsed = RegisterStartSchema.safeParse({
      churchName: 'Test Church',
      firstName: 'Ann',
      lastName: 'Admin',
      email: 'ann@example.com',
      password: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('CreateChurchStaffSchema rejects unknown role', () => {
    const parsed = CreateChurchStaffSchema.safeParse({
      email: 'staff@demo.church',
      password: 'ChurchHub123!',
      firstName: 'Ann',
      lastName: 'Admin',
      roles: ['NOT_A_ROLE'],
    });
    expect(parsed.success).toBe(false);
  });

  it('CreatePlatformChurchSchema rejects empty slug', () => {
    const parsed = CreatePlatformChurchSchema.safeParse({
      name: 'Demo Church',
      slug: '!!!',
      adminEmail: 'admin@demo.church',
    });
    expect(parsed.success).toBe(false);
  });

  it('CreateCellBranchSchema rejects invalid postcode and blank name', () => {
    expect(
      CreateCellBranchSchema.safeParse({ name: '  ', postcode: 'N1 1AA' }).success,
    ).toBe(false);
    expect(
      CreateCellBranchSchema.safeParse({
        name: 'Cell',
        postcode: 'NOTAPOSTCODE',
      }).success,
    ).toBe(false);
  });

  it('CreateCellProvinceSchema rejects invalid coverage postcode', () => {
    expect(
      CreateCellProvinceSchema.safeParse({
        name: 'North',
        leaderUserId: 'user_1',
        postcodes: ['bad'],
      }).success,
    ).toBe(false);
  });
});
