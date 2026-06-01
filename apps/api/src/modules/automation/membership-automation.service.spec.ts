import { MembershipAutomationService } from './membership-automation.service';

describe('MembershipAutomationService', () => {
  const prisma = {
    churchAutomationSettings: {
      upsert: jest.fn().mockResolvedValue({ churchId: 'c1', weeklyWorkflowsEnabled: true }),
    },
    automationRunLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'log1' }),
    },
    followUpReminder: { count: jest.fn().mockResolvedValue(0) },
    followUp: { count: jest.fn().mockResolvedValue(0) },
    counselingCase: { count: jest.fn().mockResolvedValue(0) },
    carePrayerRequest: { count: jest.fn().mockResolvedValue(0) },
  };
  const commAutomation = { runAbsenteeFollowUp: jest.fn().mockResolvedValue({ enqueued: 0 }) };
  const commQueue = { enqueue: jest.fn() };
  const followUpAutomation = { processOverdueRules: jest.fn() };
  const departments = { generateWeeklyReport: jest.fn() };
  const syncEngine = {
    processPending: jest.fn().mockResolvedValue({ processed: 0, synced: 0, failed: 0 }),
    queueStats: jest.fn().mockResolvedValue({ pending: 0, failed: 0, synced: 0 }),
  };
  const analytics = {
    getDashboard: jest.fn().mockResolvedValue({
      absenteeTrends: [],
      growthTrends: { firstTimerRetention: [] },
      followUpCompleteness: [],
    }),
  };
  const membershipAccess = {
    canViewAutomation: jest.fn().mockResolvedValue(true),
  };

  let service: MembershipAutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MembershipAutomationService(
      prisma as never,
      commAutomation as never,
      commQueue as never,
      followUpAutomation as never,
      departments as never,
      syncEngine as never,
      analytics as never,
      membershipAccess as never,
    );
  });

  it('getSettings upserts defaults', async () => {
    const s = await service.getSettings('c1');
    expect(prisma.churchAutomationSettings.upsert).toHaveBeenCalled();
    expect(s.churchId).toBe('c1');
  });

  it('runWorkflow skips when toggled off', async () => {
    prisma.churchAutomationSettings.upsert.mockResolvedValue({
      churchId: 'c1',
      weeklyWorkflowsEnabled: false,
      absenteeTriggersEnabled: true,
      firstTimerTriggersEnabled: true,
      newConvertTriggersEnabled: true,
      followUpRemindersEnabled: true,
      pastoralAlertsEnabled: true,
      syncEngineEnabled: true,
      recommendationsEnabled: true,
    });
    const result = await service.runWorkflow('c1', 'WEEKLY_WORKFLOW');
    expect(result).toEqual({ skipped: true });
    expect(prisma.automationRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }),
    );
  });

  it('buildRecommendations returns array', async () => {
    const recs = await service.buildRecommendations('c1');
    expect(Array.isArray(recs)).toBe(true);
  });
});
