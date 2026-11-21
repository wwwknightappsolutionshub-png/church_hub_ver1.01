import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServiceUnitsService } from './service-units.service';
import { UpdateServiceUnitDto } from './dto/create-service-unit.dto';
import { assertSafeXlsxBuffer } from './service-units-member-import.util';

describe('Service unit tenant / mass-assignment security', () => {
  it('rejects foreign fields on UpdateServiceUnitDto', async () => {
    const errors = await validate(
      plainToInstance(UpdateServiceUnitDto, {
        name: 'Choir',
        churchId: 'other-church',
        departmentCode: 'HACK',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('requireUnitManager refuses unknown unit for this church (cross-tenant)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = Object.create(ServiceUnitsService.prototype);
    service.prisma = {
      serviceUnit: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service.moduleAccess = {
      resolveContext: jest.fn(),
      canManageServiceUnit: jest.fn(),
    };

    await expect(
      (ServiceUnitsService.prototype as unknown as { requireUnitManager: Function }).requireUnitManager.call(
        service,
        'user-1',
        'church-a',
        'unit-from-church-b',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(service.moduleAccess.canManageServiceUnit).not.toHaveBeenCalled();
  });

  it('assertSafeXlsxBuffer rejects empty and oversize buffers', () => {
    expect(assertSafeXlsxBuffer(Buffer.alloc(0))).toMatch(/empty/i);
    expect(assertSafeXlsxBuffer(Buffer.alloc(2 * 1024 * 1024 + 1))).toMatch(/exceeds/i);
  });
});

describe('Forum author spoofing guard', () => {
  it('createPost derives author from session memberId only', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = Object.create(ServiceUnitsService.prototype);
    service.prisma = {
      serviceUnit: {
        findFirst: jest.fn().mockResolvedValue({ id: 'unit-1', churchId: 'c1' }),
      },
      serviceUnitPost: {
        create: jest.fn().mockResolvedValue({ id: 'post-1', authorId: 'member-self' }),
      },
    };
    service.moduleAccess = {
      resolveContext: jest.fn().mockResolvedValue({
        userId: 'u1',
        churchId: 'c1',
        memberId: 'member-self',
        unitMembershipIds: ['unit-1'],
        unitAdminUnitIds: [],
        unitDeputyUnitIds: [],
        unitLeaderUnitIds: [],
        userRoles: [],
        memberRoles: [],
        memberStatus: 'ACTIVE_MEMBER',
      }),
      canViewServiceUnit: jest.fn().mockResolvedValue(true),
      isChurchStaff: jest.fn().mockReturnValue(false),
    };

    await ServiceUnitsService.prototype.createPost.call(service, 'u1', 'c1', 'unit-1', {
      body: 'Hello forum',
    });

    expect(service.prisma.serviceUnitPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorId: 'member-self' }),
      }),
    );
  });

  it('rejects preferred summary author that is not the caller', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = Object.create(ServiceUnitsService.prototype);
    service.prisma = { member: { findFirst: jest.fn() } };
    await expect(
      (ServiceUnitsService.prototype as unknown as { resolveSummaryAuthorId: Function }).resolveSummaryAuthorId.call(
        service,
        'c1',
        'u1',
        'other-member',
        { memberId: 'self-member' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
