import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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
