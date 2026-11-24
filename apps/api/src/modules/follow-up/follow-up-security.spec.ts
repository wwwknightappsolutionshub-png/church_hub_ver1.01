import { BadRequestException } from '@nestjs/common';
import { UpdateFollowUpSchema } from '@church-hub/shared-types';
import { FollowUpService } from './follow-up.service';

describe('Establishment security hardenings', () => {
  describe('UpdateFollowUpSchema allow-list', () => {
    it('accepts assignment + due date fields used by the UI', () => {
      const parsed = UpdateFollowUpSchema.safeParse({
        assignedToId: 'a031e366-2e30-48f4-871e-f40aa2a59067',
        dueAt: '2026-11-22',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects stage mass-assignment (must use PATCH …/stage)', () => {
      const parsed = UpdateFollowUpSchema.safeParse({
        stage: 'JOINED_GROUP',
        assignedToId: 'a031e366-2e30-48f4-871e-f40aa2a59067',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects churchId / archivedAt / memberId injection', () => {
      for (const payload of [
        { churchId: 'other-church' },
        { archivedAt: null },
        { archivedById: 'a031e366-2e30-48f4-871e-f40aa2a59067' },
        { memberId: 'a031e366-2e30-48f4-871e-f40aa2a59067' },
        { completedAt: new Date().toISOString() },
      ]) {
        expect(UpdateFollowUpSchema.safeParse(payload).success).toBe(false);
      }
    });
  });

  describe('FollowUpService.update + assignee tenant check', () => {
    const existing = {
      id: 'fu-1',
      churchId: 'ch-1',
      assignedToId: 'u-worker',
      wsfCellBranchId: null,
      contactName: 'Lead',
      pastoralNotes: [],
      assignedTo: null,
      member: null,
      reminders: [],
      archivedBy: null,
      archiveRequestedBy: null,
      wsfCellBranch: null,
    };

    const prisma = {
      followUp: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn() },
      cellBranch: { findFirst: jest.fn() },
      userRole: { findMany: jest.fn() },
    };

    const moduleAccess = {
      getEstablishmentAccessForUser: jest.fn(),
      canViewEstablishmentRecord: jest.fn().mockReturnValue(true),
      canMutateEstablishmentRecord: jest.fn().mockReturnValue(true),
      buildEstablishmentListScope: jest.fn(),
    };

    const teamNotify = { notifyAssigneeOnAssignment: jest.fn() };

    const pipelineResolve = {
      resolveForChurch: jest.fn().mockResolvedValue({
        source: 'template',
        templateKey: 'winners_default',
        stages: [
          {
            key: 'NEW_LEAD',
            isEntry: true,
            blocksArchive: false,
            graduatesSla: false,
            isEnabled: true,
          },
          {
            key: 'JOINED_GROUP',
            isEntry: false,
            blocksArchive: true,
            graduatesSla: true,
            isEnabled: true,
          },
        ],
      }),
    };

    const service = new FollowUpService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      teamNotify as never,
      { onFollowUpEvent: jest.fn() } as never,
      moduleAccess as never,
      pipelineResolve as never,
      { append: jest.fn() } as never,
    );

    beforeEach(() => {
      jest.clearAllMocks();
      prisma.followUp.findFirst.mockResolvedValue(existing);
      prisma.followUp.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...existing,
        ...data,
      }));
      moduleAccess.getEstablishmentAccessForUser.mockResolvedValue({
        mode: 'manager',
        canCreate: true,
        canAssign: true,
        canAssignWsf: true,
        canMutate: true,
        canViewUnassigned: true,
        canArchive: true,
        wsfBranchIds: [],
      });
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'ADMIN' } }]);
    });

    it('rejects cross-church assignee ids', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.update(
          'ch-1',
          'fu-1',
          { assignedToId: 'a031e366-2e30-48f4-871e-f40aa2a59099' },
          'u-admin',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.followUp.update).not.toHaveBeenCalled();
    });

    it('does not write rejected stage field even if somehow present after parse bypass', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'a031e366-2e30-48f4-871e-f40aa2a59067' });
      await expect(
        service.update(
          'ch-1',
          'fu-1',
          {
            assignedToId: 'a031e366-2e30-48f4-871e-f40aa2a59067',
            stage: 'JOINED_GROUP',
          },
          'u-admin',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getOne confidential pastoral notes', () => {
    const prisma = {
      followUp: { findFirst: jest.fn() },
      userRole: { findMany: jest.fn() },
    };
    const moduleAccess = {
      getEstablishmentAccessForUser: jest.fn().mockResolvedValue({
        mode: 'worker',
        canCreate: false,
        canAssign: false,
        canAssignWsf: false,
        canMutate: true,
        canViewUnassigned: false,
        canArchive: false,
        wsfBranchIds: [],
      }),
      canViewEstablishmentRecord: jest.fn().mockReturnValue(true),
    };
    const pipelineResolve = {
      resolveForChurch: jest.fn().mockResolvedValue({
        source: 'template',
        templateKey: 'winners_default',
        stages: [],
      }),
    };
    const service = new FollowUpService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      moduleAccess as never,
      pipelineResolve as never,
      { append: jest.fn() } as never,
    );

    it('hides confidential notes from non-staff viewers', async () => {
      prisma.followUp.findFirst.mockResolvedValue({
        id: 'fu-1',
        churchId: 'ch-1',
        assignedToId: 'u-worker',
        wsfCellBranchId: null,
        pastoralNotes: [
          {
            id: 'n1',
            isConfidential: true,
            authorId: 'pastor-1',
            content: 'secret',
            author: { id: 'pastor-1', firstName: 'P', lastName: 'A' },
          },
          {
            id: 'n2',
            isConfidential: false,
            authorId: 'pastor-1',
            content: 'public',
            author: { id: 'pastor-1', firstName: 'P', lastName: 'A' },
          },
          {
            id: 'n3',
            isConfidential: true,
            authorId: 'u-worker',
            content: 'own confidential',
            author: { id: 'u-worker', firstName: 'W', lastName: 'K' },
          },
        ],
      });
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'MEMBER' } }]);

      const row = await service.getOne('ch-1', 'fu-1', 'u-worker');
      expect(row.pastoralNotes.map((n: { id: string }) => n.id)).toEqual(['n2', 'n3']);
    });
  });
});
