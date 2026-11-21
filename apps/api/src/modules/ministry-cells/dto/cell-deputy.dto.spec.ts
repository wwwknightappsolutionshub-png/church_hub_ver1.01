import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignCellDeputyDto } from './cell-deputy.dto';

describe('AssignCellDeputyDto', () => {
  async function run(raw: Record<string, unknown>) {
    return validate(plainToInstance(AssignCellDeputyDto, raw), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('accepts ASSISTANT with userId', async () => {
    const errors = await run({
      role: 'ASSISTANT',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid role', async () => {
    const errors = await run({
      role: 'UNIT_ADMIN',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects mass-assignment extras', async () => {
    const errors = await run({
      role: 'SECRETARY',
      userId: '11111111-1111-4111-8111-111111111111',
      churchId: 'other',
      isPrimary: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
