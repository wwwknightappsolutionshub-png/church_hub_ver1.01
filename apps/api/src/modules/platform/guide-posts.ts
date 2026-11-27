import type { GuideSeed } from './guide-copy';
import { MORE_GUIDE_POSTS } from './guide-posts-rest';

const trial =
  'If this is the week your team stops losing names in chats and spreadsheets, start a free trial and put one real guest list in the workspace.';

function post(
  seed: Omit<GuideSeed, 'kind' | 'showOnHomepage'> & { showOnHomepage?: boolean },
): GuideSeed {
  return { kind: 'POST', showOnHomepage: true, ...seed };
}

const CORE_GUIDE_POSTS: GuideSeed[] = [
  post({
    slug: 'church-management-software',
    title: 'Church management software that your Monday team will actually open',
    summary:
      'A plain look at church management software for pastors and volunteers who are tired of chasing names through chats, paper, and spreadsheets.',
    seoTitle: 'Church management software for pastors and church teams',
    seoDescription:
      'How church management software helps pastors and volunteers keep membership, guests, and follow-up in one place without losing the human side of church.',
    coverImagePath: '/images/blog/church-management-software.svg',
    coverImageAlt: 'Church management software for pastors keeping membership and guest follow-up together',
    sortOrder: 1,
    faqs: [
      {
        question: 'What should church management software actually do?',
        answer:
          'It should hold your people, the next step for a guest, and the work of your teams, so more than one leader can help. It should not try to replace the visit or the conversation.',
      },
      {
        question: 'We are a small church. Is this only for big churches?',
        answer:
          'No. A church with one Sunday service and a handful of volunteers feels the mess first, because there is no office to catch what falls. The same workspace also serves a church with more than one congregation.',
      },
      {
        question: 'Will our older leaders manage it?',
        answer:
          'They should. The test is whether a person who has kept the register for years can see who is new and what happens next, without learning a new language.',
      },
      {
        question: 'Where do we start?',
        answer:
          'Start with the guest list from last Sunday and the membership names you already trust. You can open a free trial and see that list with your own leaders before you move everything.',
      },
    ],
    paragraphs: [
      'You know the moment. The last song is still in the room, the chairs are going back, and someone hands you a small stack of visitor cards. Or there are no cards, only a promise: "I will WhatsApp you the names." By Tuesday the chat has moved on to a rehearsal, a lift to church, and a joke about the sound desk. The names are still in there. They are just no longer easy to find.',
      'That is the real job of church management software. Not a dashboard that looks busy. A place where the people who greeted, the pastor who will call, and the person who keeps membership are looking at the same names. If the tool does not make Monday simpler, it is only another tab.',
      '## The week the church is actually living',
      'Think about a normal week, not a conference stage. In a UK church the minister may be the one who still knows who was in hospital, while a volunteer keeps the rota. In a US church the guest filled in a card and expects a message before next Sunday. In the UAE the congregation may include people who are in the city for a season, so a slow follow-up is a missed friendship. In many African churches the branch or the cell already has a leader who visits, and the main church needs to know the visit happened. Different rooms. Same leak.',
      'Church management software earns its keep when it respects those rooms. It should let a church record members, notice a first-timer, and give a leader a next step. It should let a pastor keep a private note private. It should let a service team do its work without seeing the whole church roll if that is not their job. The software is a table the team can share, not a spotlight on every private conversation.',
      '## What people are tired of juggling',
      'Most churches we talk with are not short of effort. They are short of one list. Membership is in a spreadsheet because that is what the treasurer\'s laptop could open. Follow-up is in a chat because that is where the young leaders already are. The outreach team has a paper list from Saturday. The youth leader has another group. None of these people are careless. They are busy, and the tools were never introduced to each other.',
      'A pastor in her forties might still be able to hold the church in her head. A welcome leader in his twenties cannot, and should not have to. A volunteer at sixty who has kept the book for years deserves a page that looks like the book, not like an accounting package. Church management software that only speaks to one of those ages will be opened twice and then abandoned.',
      '## What belongs in the workspace',
      'Put the people in first. A member, a guest, a family, the congregation they belong to. Then put the work next to the person. Who is following up? What is the next step? Is this someone the evangelism team met outside the building, or someone who sat in the service? Church_Hub is built around that order: membership, follow-up, discipleship, and evangelism in one workspace, with roles so the usher, the pastor, and the cell leader do not all see the same private things.',
      'You do not have to turn every ministry on in week one. A church that is drowning in guest cards does not need a lecture about ten modules. Start with the names and the next step. Add the rest when the team trusts the list. That is a kinder way to introduce software to people who already serve hard.',
      '## Monday, when the real test happens',
      'Picture Monday. The pastor has twenty minutes before a visit. The follow-up leader is on a lunch break. They both open the same page. They can see who was new, who has no one assigned, and who was promised a call. Nobody is scrolling a chat to reconstruct Sunday. That is the feeling you are buying. If a product cannot give you that feeling in the first week, keep looking.',
      'It also has to work on a phone. A lot of pastoral care happens in a car park, not at a desk. A young leader will not go home and open a laptop for three names. An older leader might prefer the larger screen later. Both should be looking at the same people. Church_Hub is a workspace you can open from the phone you already carry to church.',
      '## What this will not do for you',
      'It will not preach. It will not make a cold church warm. It will not visit the new parents for you. If someone promises that software will grow the church while the team rests, smile and keep your money. The honest promise is smaller and more useful. Fewer names will fall through. More than one person can help. The pastor is not the only memory in the building.',
      'Security belongs in that honest list. A membership list is not a marketing file. A pastoral note is not a chat message. People in your church trust you with illness, marriage, money, and faith. The tool should treat that trust as normal, with roles and a record of who changed what, not as an extra you turn on later.',
      '## A way to begin without a big announcement',
      'You do not need to announce a new era. Take last Sunday\'s guests and the members you are already sure about. Put them in one place. Ask two leaders, not twenty, to use it for a month. One of them should be comfortable with a phone. One of them should be the person who has always kept the list. If both of them can find a person and a next step, you have church management software. If only the keen young leader can, you have a hobby.',
      'Churches in towns and churches in cities can start the same way. A single congregation in a village hall and a church with two services in a city are both trying to remember people. The size changes the number of names. It does not change the duty.',
      '## Two churches, one duty',
      'Sit with a church of eighty people for a moment. The pastor knows most names and is afraid of the ones they are starting to forget. The membership list is a spreadsheet last updated before Easter. A guest from last month is "with sister Grace" and Grace is not sure she agreed. Church management software, for them, is a relief only if it feels like the notebook they already trust, with the names in one order and a clear line for who will call.',
      'Now sit with a church of several hundred, maybe two services, maybe a second site. The senior pastor cannot know every guest. The campus leader or the branch pastor needs their own list without losing the whole church. A follow-up team of ten people needs assignments, not a broadcast message that says "someone should call the new people." The software has to let a leader see their people and let the pastor see that the work is happening, without turning pastoral care into a public feed.',
      'Men and women both carry this. In plenty of churches the person who actually keeps the list is a woman who has done it quietly for years, and the person who feels the shame when a guest is forgotten is the pastor, whoever they are. The tool should not assume a job title or a gender. It should assume a duty. Someone said hello. Someone should still know their name on Thursday.',
      'If you are choosing between tools, ask for a Tuesday test, not a tour. Can a volunteer find last Sunday\'s guest without help? Can the pastor see that someone has taken the call? Can a private note stay off the welcome team\'s screen? Church management software that passes those three questions will still be open next month. The rest becomes a login nobody remembers. Church_Hub is built to pass that Tuesday test for a church of one congregation and for a church with branches or campuses.',
      trial,
    ],
  }),
];

export const GUIDE_POSTS: GuideSeed[] = [...CORE_GUIDE_POSTS, ...MORE_GUIDE_POSTS];
