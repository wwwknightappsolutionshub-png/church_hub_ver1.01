import { NotFoundException } from '@nestjs/common';
import { PastoralCareService } from './pastoral-care.service';

describe('PastoralCareService', () => {
  const prisma = {
    pastoralNote: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    userRole: { findMany: jest.fn() },
    counselingCase: { findFirst: jest.fn(), count: jest.fn() },
    carePrayerRequest: { findFirst: jest.fn(), count: jest.fn() },
  };

  const service = new PastoralCareService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('listNotes hides confidential notes from non-staff unless author', async () => {
    prisma.pastoralNote.findMany.mockResolvedValue([
      { id: 'n1', isConfidential: true, authorId: 'other', content: 'secret' },
      { id: 'n2', isConfidential: false, authorId: 'other', content: 'public' },
    ]);
    prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'MEMBER' } }]);

    const notes = await service.listNotes('church-1', 'user-1', {});
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('n2');
  });

  it('listNotes returns all notes for staff', async () => {
    prisma.pastoralNote.findMany.mockResolvedValue([
      { id: 'n1', isConfidential: true, authorId: 'other', content: 'secret' },
    ]);
    prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'PASTOR' } }]);

    const notes = await service.listNotes('church-1', 'user-1', {});
    expect(notes).toHaveLength(1);
  });

  it('addNote requires memberId or followUpId', async () => {
    await expect(
      service.addNote('church-1', 'user-1', { content: 'test' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
