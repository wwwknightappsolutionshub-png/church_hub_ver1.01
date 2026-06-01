export const DEMO_METRICS = {
  membership: {
    total: 2847,
    byStatus: [
      { status: 'VISITOR', _count: 412 },
      { status: 'NEW_MEMBER', _count: 318 },
      { status: 'ACTIVE_MEMBER', _count: 1893 },
      { status: 'DISCIPLED', _count: 224 },
    ],
  },
  followUp: { completionRate: 0.78, pending: 34, completed: 156 },
  evangelism: { totalContacts: 1248, thisMonth: 89 },
  youth: { activeGroups: 12, eventsThisMonth: 8 },
  business: { verifiedProfiles: 186, listings: 94 },
  bus: { activeRides: 23, completedToday: 41 },
  communications: { sermonCount: 342 },
};

export const DEMO_ACTIVITY = [
  { id: '1', type: 'member', message: 'Sarah Johnson completed onboarding', time: '2 min ago', module: 'Membership' },
  { id: '2', type: 'outreach', message: '12 new contacts captured at City Outreach', time: '18 min ago', module: 'Evangelism' },
  { id: '3', type: 'followup', message: 'Follow-up stage moved to Joined Group — Marcus T.', time: '1 hr ago', module: 'Discipleship' },
  { id: '4', type: 'bus', message: 'Route A completed — 18 passengers dropped off', time: '2 hr ago', module: 'Bus Ministry' },
  { id: '5', type: 'youth', message: 'Youth Night RSVP count reached 64', time: '3 hr ago', module: 'Youth' },
];

export const DEMO_MEMBERS = [
  { id: '1', firstName: 'Grace', lastName: 'Mbeki', email: 'grace.m@email.com', status: 'ACTIVE_MEMBER', roles: ['LEADER', 'ADULT'] },
  { id: '2', firstName: 'David', lastName: 'Okonkwo', email: 'david.o@email.com', status: 'NEW_MEMBER', roles: ['ADULT'] },
  { id: '3', firstName: 'Emily', lastName: 'Chen', email: 'emily.c@email.com', status: 'VISITOR', roles: ['YOUTH'] },
  { id: '4', firstName: 'James', lastName: 'Williams', email: 'j.williams@email.com', status: 'DISCIPLED', roles: ['EVANGELIST', 'LEADER'] },
  { id: '5', firstName: 'Aisha', lastName: 'Patel', email: 'aisha.p@email.com', status: 'ACTIVE_MEMBER', roles: ['DRIVER', 'ADULT'] },
];
