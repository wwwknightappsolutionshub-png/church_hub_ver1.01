import { BadRequestException } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';

describe('FollowUpService archive flow', () => {
  const followUpRow = {
    id: 'fu-1',
    churchId: 'ch-1',
    memberId: null,
    stage: 'NEW_LEAD' as const,
    archivedAt: null as Date | null,
    contactName: 'Test Lead',
    contactEmail: 'lead@example.com',
  };

  const prisma: Record<string, unknown> = {
    followUp: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    pastoralNote: { create: jest.fn() },
    followUpReminder: { updateMany: jest.fn(), create: jest.fn() },
    user: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));

  const followUpMock = prisma.followUp as {
    findFirst: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  const pastoralNoteMock = prisma.pastoralNote as { create: jest.Mock };
  const reminderMock = prisma.followUpReminder as { updateMany: jest.Mock; create: jest.Mock };
  const userMock = prisma.user as { findFirst: jest.Mock; findMany: jest.Mock };

  const notifications = { scheduleFollowUpReminder: jest.fn() };
  const sms = { sendWhatsApp: jest.fn() };
  const email = { send: jest.fn() };
  const teamNotify = {
    notifyTeamOnArchiveRequest: jest.fn(),
    notifyTeamOnNewLead: jest.fn(),
    resolveAssigneeForCapture: jest.fn(),
    getEvangelistDisplayName: jest.fn(),
  };
  const automation = { onFollowUpEvent: jest.fn(), processOverdueRules: jest.fn() };

  const service = new FollowUpService(
    prisma as never,
    notifications as never,
    sms as never,
    email as never,
    teamNotify as never,
    automation as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    followUpMock.findFirst.mockResolvedValue({ ...followUpRow });
    followUpMock.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...followUpRow,
      ...data,
      archivedBy: { id: 'u-1', firstName: 'Ada', lastName: 'Admin' },
      archiveRequestedBy: null,
      assignedTo: null,
      member: null,
      reminders: [],
    }));
    pastoralNoteMock.create.mockResolvedValue({});
    reminderMock.updateMany.mockResolvedValue({ count: 0 });
    userMock.findFirst.mockResolvedValue({ firstName: 'Sam', lastName: 'Member' });
  });

  it('rejects archive for Joined Group contacts', async () => {
    followUpMock.findFirst.mockResolvedValue({ ...followUpRow, stage: 'JOINED_GROUP' });
    await expect(service.archive('ch-1', 'fu-1', 'u-1', 'Leaving journey')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects archive request for Joined Group contacts', async () => {
    followUpMock.findFirst.mockResolvedValue({ ...followUpRow, stage: 'JOINED_GROUP' });
    await expect(
      service.requestArchive('ch-1', 'fu-1', 'u-2', 'Asked not to be contacted'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archives a lead and writes an ARCHIVE note', async () => {
    const result = await service.archive('ch-1', 'fu-1', 'u-1', 'Does not want follow-up');
    expect(result.archivedAt).toBeTruthy();
    expect(pastoralNoteMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'ARCHIVE' }),
      }),
    );
  });

  it('rejects archive without a reason', async () => {
    await expect(service.archive('ch-1', 'fu-1', 'u-1', 'ab')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requests archive and notifies leaders', async () => {
    await service.requestArchive('ch-1', 'fu-1', 'u-2', 'Asked not to be contacted');
    expect(teamNotify.notifyTeamOnArchiveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        followUpId: 'fu-1',
        contactName: 'Test Lead',
        reason: 'Asked not to be contacted',
      }),
    );
    expect(pastoralNoteMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'ARCHIVE_REQUEST' }),
      }),
    );
  });

  it('recontacts archived lead by email only', async () => {
    followUpMock.findFirst.mockResolvedValue({
      ...followUpRow,
      archivedAt: new Date(),
    });
    await service.recontactArchived('ch-1', 'fu-1', 'u-1', {
      subject: 'Hello again',
      body: 'Hope you are well',
    });
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'lead@example.com', subject: 'Hello again' }),
    );
    expect(pastoralNoteMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'RECONTACT' }),
      }),
    );
  });

  it('blocks recontact when lead is still active', async () => {
    await expect(
      service.recontactArchived('ch-1', 'fu-1', 'u-1', {
        subject: 'Hi',
        body: 'Body',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
