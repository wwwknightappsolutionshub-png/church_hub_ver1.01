import { paragraphsToHtml } from './guide-html';
import { GUIDE_POSTS } from './guide-posts';

export type GuideFaq = { question: string; answer: string };

export type GuideSeed = {
  kind: 'ABOUT' | 'POST';
  slug: string;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  coverImagePath: string;
  coverImageAlt: string;
  paragraphs: string[];
  faqs: GuideFaq[];
  showOnHomepage: boolean;
  sortOrder: number;
};

export function guideBodyHtml(paragraphs: string[]): string {
  return paragraphsToHtml(paragraphs);
}

const trialClose =
  'When the team is ready to try this with real names, start a free trial. You do not need a card to open the workspace and see whether it fits the way your church already cares for people.';

const ABOUT_SEED: GuideSeed[] = [
  {
    kind: 'ABOUT',
    slug: 'about',
    title: 'About Church_Hub',
    summary:
      'Church_Hub is the workspace pastors and church teams use for membership, guest follow-up, discipleship, and evangelism.',
    seoTitle: 'About Church_Hub | Church management software for membership and follow-up',
    seoDescription:
      'Church_Hub helps pastors and church teams in the UK, USA, UAE, and Africa look after membership, first-time guests, discipleship, and evangelism in one place.',
    coverImagePath: '/images/blog/about-church-hub.svg',
    coverImageAlt: 'About Church_Hub, church management software for pastors and church teams',
    showOnHomepage: false,
    sortOrder: 0,
    faqs: [
      {
        question: 'Who is Church_Hub for?',
        answer:
          'Pastors, church administrators, follow-up leaders, and volunteers who look after guests and members. It is used by churches with one Sunday service and by churches with more than one congregation.',
      },
      {
        question: 'Does Church_Hub replace pastoral care?',
        answer:
          'No. It remembers the people and the next step so the phone call, the visit, and the conversation still happen. The care itself stays with your team.',
      },
      {
        question: 'Can a private pastoral note stay private?',
        answer:
          'Yes. Notes that are meant for pastors stay with the people who are allowed to read them. A welcome-team volunteer does not need to see that conversation.',
      },
      {
        question: 'Can we try it before we move our whole register?',
        answer:
          'Yes. You can start a free trial and look around with your own leaders before you decide how much of the old spreadsheet to bring across.',
      },
    ],
    paragraphs: [
      'A pastor can preach with a full heart and still lose people in the admin that follows. The visitor card goes into a bag. The membership list lives in a spreadsheet that only one person understands. The follow-up sits in a chat that has scrolled away by Tuesday. None of that means the church does not care. It means the care has nowhere steady to land.',
      'Church_Hub is that steady place. Church management software, when it is doing its job, is not there to make a church feel like an office. It is there so a greeting team in Birmingham, a campus pastor in Atlanta, a congregation meeting in a Dubai hall, and a branch leader in Accra can answer the same question on a Monday morning. Who was new? Who is being looked after? Who is ready for the next step?',
      'If you are anywhere from your twenties to your sixties, you have probably watched this from more than one seat. You may be the young adult on the welcome desk who wonders why the names never reach the pastor. You may be the minister who still remembers every face and is tired of being the only record. You may be the administrator who keeps the peace between a paper register and three different apps. You may be the member who joined last year and is not sure anyone knows your name yet. Church_Hub is built for that whole room, not for one job title.',
      'A church in the UK often works with a Sunday congregation, a midweek gathering, and a small team of volunteers who also have day jobs. A church in the United States may be thinking about campuses, a membership class, and a guest who filled in a connect card. A church in the UAE may be a room of people who will not all be in the country next year, so remembering them well matters even more. Across Africa, many churches already know the strength of cells, branches, and a follow-up team that visits in the week. Church_Hub does not ask those churches to become the same church. It gives them one workspace for membership, follow-up, discipleship, and evangelism.',
      '## Membership that still feels like people',
      'Membership is the roll that used to live in a book. In Church_Hub a person can move from visitor toward member without the story being rewritten in a new file. Families can be linked. Leaders see the people they are responsible for. They do not see pastoral notes that are not theirs to read. That last part matters. A church is a family, and some conversations stay with the pastor.',
      'Church membership software is useful only when the register and the welcome team are looking at the same person. Too many tools split them. The office has a clean list. The ushers have a different list. The small-group leader has a notebook. Church_Hub is meant to close that gap, so a name written on Sunday is still a name on Wednesday.',
      '## Follow-up that survives the week',
      'Follow-up is where good intentions usually leak. Someone agrees to call the guest. The week gets full. The guest decides the church was friendly once and then silent. Church_Hub keeps that person on a list with a next step, so the work can be shared. A team leader can see who is waiting. The pastor does not have to hold every name in their head.',
      'This is the part visitors feel, even if they never see the screen. A first-timer in London, Dallas, Abu Dhabi, or Kampala is not asking for software. They are asking whether anyone will remember the conversation at the door. The software is only honest if it helps a real person make that call or pay that visit.',
      '## Discipleship and evangelism in the same house',
      'Discipleship is slower than a Sunday count. It is the path from a first visit toward a settled faith and a place to serve. Tracking that path is not about scoring people. It is about not leaving them at the door. Evangelism is the work outside the building: a conversation, a visit, a name written down at an outreach. Those names deserve the same care as the person who walked in on Sunday.',
      'Church_Hub keeps outreach contacts and the follow-up journey together, so a first conversation does not die in a notebook. A team can see who they met, who they still need to see, and who is ready to be introduced to the church family. The point is not a bigger report. The point is that the person you met on Saturday is not forgotten by the time the offering is counted.',
      '## What we will not pretend',
      'Church_Hub will not preach for you. It will not love people on your behalf. It will not replace the cup of tea, the phone call, or the visit to the house. It will stop those acts of care from depending on one person\'s memory and one overflowing chat. If a tool promises to grow your church while you sleep, put it down. Growth is still a work of prayer, preaching, and presence.',
      'We also will not pretend every church has a full-time office. Many of the people who will use this are volunteers. The pages have to make sense after a long day at work, on a phone, between school pickup and the evening meeting. That is why the workspace is organised around the jobs a church already has: members, guests, follow-up, and the teams who serve.',
      'The people who get the most from it are pastors, church administrators, follow-up leaders, and the volunteers who said yes to looking after guests. Some of them are twenty-two and running the welcome team from their phone. Some of them are sixty and have kept the register since before email. Both of them should be able to open the same page and know what to do next.',
      'If you are comparing church management software, church membership software, visitor follow-up, and discipleship tools, start with the question your team already asks on Monday. Can we see the people? Can more than one leader help? Can a private pastoral note stay private? Church_Hub is our answer to those questions.',
      trialClose,
    ],
  },
];

export const GUIDE_SEED: GuideSeed[] = [...ABOUT_SEED, ...GUIDE_POSTS];
