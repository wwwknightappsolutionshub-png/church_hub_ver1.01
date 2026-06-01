import { FollowUpAutomationService } from './follow-up-automation.service';

describe('FollowUpAutomationService', () => {
  it('seeds default rules when church has none', async () => {
    const prisma = {
      followUpAutomationRule: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
        findMany: jest.fn().mockResolvedValue([{ id: 'r1', name: 'Test' }]),
      },
    };
    const notifications = { scheduleFollowUpReminder: jest.fn() };
    const service = new FollowUpAutomationService(prisma as never, notifications as never);
    const rules = await service.listRules('church-1');
    expect(prisma.followUpAutomationRule.createMany).toHaveBeenCalled();
    expect(rules).toHaveLength(1);
  });
});
