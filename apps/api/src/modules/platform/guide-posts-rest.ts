import type { GuideSeed } from './guide-copy';

const trial =
  'When you want this in your own church, start a free trial and bring one real list with you. The trial is there so the team can feel the difference before anyone promises a big change.';

const CLOSING: Record<string, string> = {
  'church-membership-software':
    'If you are still unsure, use a single household as the test. Find them on the old list and on the new one. See the adults and the children together. See whether a guest record from last month is the same person who is now asking about membership. Then ask the administrator, not the most technical person in the room, whether they would trust this on a Sunday morning when someone is waiting at the office door. Church membership software that survives that question is ready for the rest of the roll. Church_Hub is meant to survive it, in a church with one service and in a church that gathers in more than one place. You can start a free trial with that one household before you promise the whole congregation a new system.',
  'first-time-guest-follow-up':
    'Try one more picture. It is Wednesday evening. A guest who came on Sunday has told a friend that the church was warm and that nobody has been in touch. That friend is a member, and now the member is embarrassed. First-time guest follow-up exists so that member is not left apologising for the church. A name, a person responsible, and a note of what was said are enough to stop the embarrassment. It does not require a large team. It requires the list to be open to the people who said they would help, including the volunteer who can only look between shifts. Church_Hub keeps that list next to membership so a guest who decides to stay does not have to be created all over again. Start a free trial with the guests you can still name from the last two Sundays and see if Thursday feels different. If the team can point to who is calling and who has already been kind, you have a follow-up ministry. If the names are still in a single memory, you are not finished, and that is a useful thing to learn before you announce anything to the church.',
  'church-discipleship-tracking':
    'There is a quieter fear under this subject. Leaders worry that writing a next step will make faith feel managed. The opposite is what usually happens when nothing is written down. The confident people get the conversations, and the quiet ones wait. Church discipleship tracking, done with a light hand, is how a church notices the quiet ones. A leader can say, we offered the group and they are thinking, and someone else can honour that pace. You do not need a long pathway on day one. You need the promises you have already made, visible to the people who can keep them, and hidden from the people who should not read the tender parts. Church_Hub holds that difference. A free trial with the people you are already walking beside will tell you, within a fortnight, whether the team keeps more of its word. Look for a simple result. Fewer people saying they thought someone else had asked. More people hearing from the church while the last conversation is still warm. That is the whole aim of writing the next step down, in words a person would recognise. It is a promise the team can see, not a score nobody asked for.',
  'church-evangelism-tracking':
    'One last picture from the week after an outing. The team leader is asked on Sunday how it went, and the honest answer is a blur of faces. Church evangelism tracking is what lets that leader name two people and say who is visiting them, without turning the answer into a boast. The rest of the church does not need the details. The team does. If one of those people walks in later, the welcome can mention the conversation instead of starting from nothing. That is a small dignity, and it matters in every city we have in mind, whether the outing was a street, a home, or a hall. Put one real outing into a free trial before the faces blur. If the team can still see the next visit, the list has earned its place. If they cannot, keep the notebook habit until the shared list is clearer than the bag it used to live in.',
};

function post(seed: Omit<GuideSeed, 'kind' | 'showOnHomepage'>): GuideSeed {
  const extra = CLOSING[seed.slug];
  return {
    kind: 'POST',
    showOnHomepage: true,
    ...seed,
    paragraphs: extra ? [...seed.paragraphs, extra] : seed.paragraphs,
  };
}

export const MORE_GUIDE_POSTS: GuideSeed[] = [
  post({
    slug: 'church-membership-software',
    title: 'Church membership software that still sounds like a church',
    summary:
      'How a membership list can stay human, from the first visit to a settled member, without living in a private spreadsheet.',
    seoTitle: 'Church membership software for pastors and church administrators',
    seoDescription:
      'Church membership software that helps churches keep a clear roll, link families, and move a visitor toward membership without losing the story.',
    coverImagePath: '/images/blog/church-membership-software.svg',
    coverImageAlt: 'Church membership software showing a shared membership roll for a church team',
    sortOrder: 2,
    faqs: [
      {
        question: 'What is the difference between a guest and a member in the software?',
        answer:
          'A guest is someone you are still getting to know. A member is someone the church has recognised. The useful part is that both can live on one record, so you do not start a new file when they say yes.',
      },
      {
        question: 'Can families stay together on the roll?',
        answer:
          'Yes. A household can be linked so you are not treating a parent and a child as strangers who happen to share an address.',
      },
      {
        question: 'Who should be allowed to edit the membership list?',
        answer:
          'The people you already trust with the roll. A pastor and an administrator, and the leaders who need to see their own people. Not every volunteer needs the whole list.',
      },
      {
        question: 'Do we have to import everyone on day one?',
        answer:
          'No. Start with the people you are sure about, and the guests from recent Sundays. A free trial lets you see the shape of the list before you move the old book across.',
      },
    ],
    paragraphs: [
      'Every church has a membership story, even if the book is tired. Somewhere there is a list of people who belong. It might be a ledger in a cupboard, a spreadsheet with three colours, or a stack of forms from a membership class. The list is not the church. It is the church trying not to forget who it has promised to walk with.',
      'Church membership software is that list when more than one person needs it. The pastor needs it before a visit. The administrator needs it when someone asks for a letter. The small-group leader needs the people in their care, not the entire city. If the software cannot tell those needs apart, it is a louder spreadsheet.',
      '## From the door to a name the church keeps',
      'A first-timer is not a member, and they should not be pushed into a box to tidy your numbers. They are a guest. Church membership software should let you write them down as a guest and still keep the notes of how you met. Later, if they join a class, get baptised, or are received into membership in the way your church practises, the same person continues. You do not invent them again in a new system and hope the old notes come too.',
      'That path looks familiar in a lot of places. A church in the UK may talk about the electoral roll or a members\' meeting. A church in the US may talk about membership class and a Sunday when people are received. A church in the UAE may be careful, because people move, and belonging is still real even when a visa is not forever. Across Africa, membership often sits next to a cell, a workers\' meeting, or a branch. The words change. The care is to know who has been welcomed and who is still at the door.',
      '## Families are not separate files',
      'A mother and a teenage son can look like two records and one household. If your software cannot link them, the youth leader and the pastor will each hold half a story. Church_Hub lets a church link a family so the people who should see the household can see it. That matters when someone is in hospital and you need to know who else sits in that house. It matters when a child comes to church with an aunt and you do not want to guess.',
      'It also matters that not every field is for every eye. An address is not gossip. A phone number is not a group chat. Membership software should let the church keep contact details for the people who do the caring, and keep a pastoral conversation with the pastor. Church_Hub is built with that line in mind. The roll is shared. The private note is not a public column.',
      '## The person who has always kept the book',
      'In many churches the membership list has a guardian. Sometimes that person is sixty and has done it faithfully. Sometimes that person is thirty and inherited a mess. Both of them are afraid of the same thing: a new tool that makes them feel slow, and a loss of the names they protected. Church membership software should feel like a clearer book. Search for a person. See whether they are a visitor or a member. See who is walking with them. Leave the rest alone until you need it.',
      'If the only people who enjoy the software are the ones who like new apps, you have not finished. Sit with the guardian of the old list. Ask them to find three people they know well. If they can do it without you hovering, the church can trust it. If they cannot, the problem is the tool, not their age.',
      '## What a clean roll is for',
      'A clean roll is not for showing off a number. It is so you do not call a member a visitor, and you do not ignore a visitor because you thought they had joined. It is so a letter goes to the right house. It is so a leader of a department knows who serves with them. Church_Hub keeps membership next to follow-up and discipleship, because a name on a roll still needs a next step. Belonging is not a status you set and forget.',
      'Be honest about duplicates. Churches collect the same person twice when a guest fills a card and later joins with a slightly different spelling. Good membership software should help you notice that, not punish you for it. The aim is one person, one story, even if the story started on a Saturday outreach and continued on a Sunday seat.',
      '## A small start that respects the old book',
      'Do not announce that the spreadsheet is dead. Copy the people you are sure of. Leave a note of who still needs a conversation. Ask the administrator and one pastor to use the new roll for a fortnight alongside the old one. You are looking for mistakes, not for a victory speech. When both of them trust a search more than a scroll through columns, you can let the old file rest.',
      'Men and women will both be in that test, because both keep churches going. Do not design the rollout around the loudest person in the staff meeting. Design it around the person who will still be updating the list in June.',
      'Church membership software is working when a new member does not have to tell their story three times, and a guest does not vanish because nobody knew which list they were on. That is a modest promise. It is also the one people feel.',
      'When you compare church membership software, ignore the longest feature list. Ask whether a guest can become a member without a second file, whether a family stays linked, and whether the person who kept the old book can still find people. Those three answers matter in a parish, a campus church, a congregation of many nations, and a church with branches. Church_Hub is arranged around them, next to follow-up, so the roll is not a dead archive.',
      '## A Sunday when the roll is wrong',
      'Imagine the membership class has finished and three people are ready to be received. The administrator looks for them and finds two spellings of one name, a missing phone number, and a guest record that nobody linked to the class. Nobody meant to be careless. The class list lived in a document, the guest card lived in a bag, and the roll lived in a file from last year. Church membership software is the decision to stop that split. The person who attended the class is the person who visited in March. Their family is already there. The pastor is not handed a surprise on the morning they are welcomed.',
      'That scene happens in a town church and in a church that runs two services. It happens when half the congregation travels for work, which is common in the UAE, and when a branch sends names to the main church, which is common across Africa. The fix is not a stricter form. The fix is one person, one story, and a leader who can see it without phoning the only person who knew the password to the spreadsheet.',
      'Give the old guardian of the list a week with the new roll beside the old one. Ask them what they do not trust yet. Fix that, rather than defending the software. When they stop opening the spreadsheet first, the church has moved. Until then, you are still in a trial, which is exactly what a free trial is for.',
      trial,
    ],
  }),
  post({
    slug: 'first-time-guest-follow-up',
    title: 'First-time guest follow-up that still happens on a Thursday',
    summary:
      'A practical way to remember first-timers after Sunday, and to share the calls and visits so one person is not carrying every name.',
    seoTitle: 'First-time guest follow-up for churches',
    seoDescription:
      'How churches can follow up first-time guests after Sunday, share the visits and calls, and keep a newcomer from being forgotten by Thursday.',
    coverImagePath: '/images/blog/first-time-guest-follow-up.svg',
    coverImageAlt: 'First-time guest follow-up from a Sunday welcome to a midweek call or visit',
    sortOrder: 3,
    faqs: [
      {
        question: 'How soon should a church follow up a first-time guest?',
        answer:
          'While Sunday is still fresh. A message or a call in the first few days feels like care. A message three weeks later feels like a mail shot.',
      },
      {
        question: 'Who should make the contact?',
        answer:
          'Someone the church trusts, and not always the pastor. A shared list means a welcome leader or a follow-up team can take a name while the pastor takes the ones that need a longer conversation.',
      },
      {
        question: 'What if the guest does not want a call?',
        answer:
          'Respect that. A follow-up list should record a kind contact, not a chase. Write down what was agreed and leave them in peace.',
      },
      {
        question: 'Can we try this with last Sunday only?',
        answer:
          'Yes. Put last Sunday\'s guests into a free trial, assign two of them, and see if the team still knows those names on Thursday.',
      },
    ],
    paragraphs: [
      'A first-timer can tell you, a month later, exactly how the church felt. They remember if someone looked up from the door. They remember if anyone used their name. They also remember the silence that followed. Friendly on Sunday. Invisible by Thursday. That silence is rarely cruelty. It is a list that never left the building.',
      'Visitor and first-timer follow-up is the unglamorous work that makes a welcome true. Church_Hub keeps that work on a list with a person attached, so "someone should call them" becomes a name, a leader, and a next step. The guest does not need to know which screen you used. They need to know the church meant what it said at the door.',
      '## What Sunday actually produces',
      'Some churches still use a card. Some use a phone. Some ask the ushers to remember. In a UK parish a new face at coffee might be the whole introduction. In a US church a connect card is the start of an expected message. In the UAE a guest may be new to the country as well as the church, and a single kind contact matters more than a programme. In many African churches a first-timer is visited, and the cell or the follow-up team is already part of the culture. The method can follow the church. The failure is the same when the name has nowhere to live.',
      'Write the name down the same day if you can. Who greeted them. Whether they came with a friend. Whether they asked for a call or only left a number because the card had a line for it. Those small facts stop a later call from feeling like a stranger reading a database. First-time guest follow-up is personal, or it is noise.',
      '## Share the names or they will sit with one tired person',
      'The pastor cannot call everyone. In a small church they often try, and then feel guilty. In a larger church they never could. A follow-up team exists so care can be shared without becoming vague. Church_Hub lets you see who is waiting and who has been asked to take the next step. A leader on a lunch break can take two names. The pastor can take the one that needs more than a hello.',
      'This is where age shows up in a good way. A volunteer at twenty-five may send the first kind message quickly. A leader at fifty-five may be the one who visits the house and stays for tea. The list should let both of them serve. It should not force every contact into one style. Record what happened so the next person does not repeat the same question or, worse, never appears at all.',
      '## Thursday is the honest test',
      'Do not measure follow-up by the speech you gave to the welcome team. Measure it on Thursday. Can you say, without opening three chats, who was new and who has heard from the church? If the answer is no, the guest has already decided you were polite and finished. First-timer follow-up that depends on memory will always prefer the people who are easy to remember. The quiet guest is the one the list is for.',
      'Be gentle in the contact itself. A short message that uses their name and mentions Sunday is enough for many people. A call is better when they asked for one. A visit belongs to the churches and the cultures that already visit, and it should be wanted. The software does not choose the manner. Your church does. The software stops the choice from being "nobody, because we lost the card."',
      '## When a guest is also an outreach contact',
      'Sometimes the person in the seat on Sunday is the person your team met on Saturday. If those are two records, you will greet them like a stranger twice. Church_Hub keeps outreach and guest follow-up in one house so a name can continue. You are not collecting contacts. You are continuing a conversation the church already started.',
      'And sometimes a guest will not come back. That is allowed. Record a kind ending. Do not keep poking a person who has said no. A good follow-up list has room for "we reached them, and they are fine where they are." Care includes knowing when to stop.',
      '## Start with one Sunday, not a new department',
      'Take the guests you still remember from last week. Put them in the workspace. Give each one a person. Look again on Thursday with the leader who always says they will help and the leader who actually does. If the second leader can see the names without asking you, first-time guest follow-up has a home. If the list only lives on your phone, you are still the system.',
      'Women and men both stand at doors and both make the calls. Do not write the follow-up ministry as if it belongs to one of them. Write the next step clearly enough that whoever you trust can take it.',
      'First-time guest follow-up fails in private, which is why it is easy to ignore. Nobody sees the guest who did not return. A shared list makes the gap visible to the team while there is still time to be kind. That is as true for a church of fifty as for a church with two morning services. Church_Hub keeps the guest, the person responsible, and the next step together so Thursday does not depend on who happened to remember.',
      '## The guest who came with a friend',
      'Some of the warmest visits are the ones a member brought. The member already knows the story, and the church can still drop it if nobody writes down that the introduction happened. A good follow-up says, "Ada mentioned you might come, and we are glad you did," not "we see you are a new contact." The difference is a sentence on the list. First-time guest follow-up should leave room for that sentence, whether the church is in Leeds, Houston, Dubai, or Nairobi.',
      'Think about the volunteer who is twenty-eight and the steward who is sixty-two. One of them will notice a new face quickly. The other will know which family they should meet. If only one of them can see the name, the guest gets half a welcome. Put the name where both can act, and write who is doing what so they do not both call on the same evening or, worse, each assume the other did.',
      'After a month, look back at the guests who did not return. Do it without blame. Ask whether anyone made contact while the Sunday was still warm. If the answer is often no, the list is not being used. If the answer is yes, and some people still did not return, that is ordinary. You kept your word. The rest is not yours to force.',
      trial,
    ],
  }),
  post({
    slug: 'church-discipleship-tracking',
    title: 'Church discipleship tracking without turning people into scores',
    summary:
      'How to keep a simple path from first visit toward a settled faith, so people are not left at the door after a warm Sunday.',
    seoTitle: 'Church discipleship tracking for pastors and group leaders',
    seoDescription:
      'Church discipleship tracking that helps pastors and leaders see the next step for a person, from a first visit toward membership and service, without scoring faith.',
    coverImagePath: '/images/blog/church-discipleship-tracking.svg',
    coverImageAlt: 'Church discipleship tracking as a simple path from a first visit toward a settled faith',
    sortOrder: 4,
    faqs: [
      {
        question: 'Is discipleship tracking the same as scoring people?',
        answer:
          'It should not be. You are remembering a next step, such as a conversation, a class, or a group, not giving someone a mark for faith.',
      },
      {
        question: 'Who needs to see the discipleship path?',
        answer:
          'The pastor and the leaders who are actually walking with that person. A private struggle does not belong on a team dashboard.',
      },
      {
        question: 'What counts as a next step?',
        answer:
          'Something a person can recognise. A coffee, a membership conversation, a cell or small group, a class your church already runs. Not a vague label.',
      },
      {
        question: 'Can we start with a few people?',
        answer:
          'Yes. Put a handful of people you are already discipling into a free trial and write the real next step beside each name.',
      },
    ],
    paragraphs: [
      'Discipleship is slow, and that is a kindness. A person does not become settled in a church because a form was filed. They become settled because someone walked with them. The trouble is that "someone" is often the pastor, and the pastor is also preaching, visiting the sick, and answering the message that arrived at midnight. Church discipleship tracking exists so the walk is visible to the people who are doing the walking, and so a person is not left after the first warm Sunday.',
      'If the word tracking makes you uneasy, good. Faith is not a sport. Church_Hub is not there to score anyone. It is there to answer a plain question. What did we say we would do next for this person, and did we do it? A class. A conversation. An introduction to a cell or a small group. A step toward membership in the way your church understands membership. Those are human steps. Writing them down is how a team keeps its word.',
      '## The path most churches already believe in',
      'Most churches, whatever they print in the bulletin, already have a path. A guest comes. Someone talks with them. They are invited to stay, to learn, to serve. In the UK that path might run through a home group and a conversation with the minister. In the US it might run through a class and a weekend when the church receives new members. In the UAE a person may be hungry for faith and also passing through, so the next step has to be real even if their stay is short. Across Africa the cell, the workers\' meeting, and the branch often carry discipleship that a Sunday service cannot carry alone.',
      'Church discipleship tracking should follow the path you already preach, not invent a new one because a software company likes stages. In Church_Hub the follow-up journey is there so a leader can see where a person is and what was agreed. You name the steps in the language of your church. The point is memory, not a template from another country.',
      '## Who is allowed to look',
      'A discipleship note can be tender. Someone is doubting. Someone is new to prayer. Someone is not ready for a public class. That does not belong in a list every volunteer can scroll. The pastor and the leader who is actually walking with the person need it. The welcome team needs to know the guest was cared for, not the content of a private talk. Church_Hub keeps that distinction. Pastoral notes stay with the people who should read them.',
      'This protects the person, and it protects the volunteer. A twenty-year-old on the door should not be handed someone\'s marriage. A leader at sixty who has earned trust should not have to keep that story only in their head because the system is too open. Tracking that respects confidence will be used. Tracking that gossips will be avoided, and then you are back to memory.',
      '## A next step you could say out loud',
      'If you cannot say the next step to the person without embarrassment, it is the wrong step. "Move them to stage three" is not care. "We said we would introduce you to the Tuesday group" is care. Write the second kind. Church discipleship tracking is simply the place those sentences live so they survive a busy month.',
      'Review it the way you already review people, in a short leaders\' conversation, not in a performance meeting. Who is stuck because we forgot? Who is ready for membership, baptism, or service, in the language your church uses? Who needs to be left quietly with God and a friend, rather than pushed? The list serves that conversation. It does not replace it.',
      '## Young leaders and older pastors on the same path',
      'A youth leader may be discipling people the senior pastor barely knows. That is healthy. The software should let that leader see their people and let the pastor know the church is not dropping them. It should not force every disciple into the pastor\'s personal queue. Shared visibility, personal responsibility. That is the balance for a church with one minister and for a church with a staff.',
      'Women and men disciple. Do not picture this work as a single office. Picture the person who already stays behind to talk, whatever their age or gender, and give them a way to remember the promise they made.',
      '## Begin with the people you are already walking with',
      'Do not build a perfect pipeline on an empty Sunday. Write down ten people your leaders are already caring for. Put the real next step beside each one. Look at the list in two weeks and see which promises were kept. That experiment will teach you more than a seminar. A free trial is enough room for those ten names.',
      'Discipleship tracking is faithful when a person can feel that the church did not forget the conversation. They will never thank you for a stage name. They will thank you because someone came back.',
      'Church discipleship tracking in Church_Hub sits beside membership and evangelism so a person is not copied into a new list every time they grow. The leader who walks with them can see the next step. The pastor can see that the person is not lost. A private note stays with the people who should hold it. That is enough structure for a home group, a cell, a class, or a quiet conversation after the service.',
      '## A person, not a pipeline',
      'Sit with one real story. Someone has been coming for six weeks. They stay for coffee. They have not joined a group. A leader said they would ask them to the Tuesday meeting and then the leader travelled for work. Nobody else knew the promise had been made. Church discipleship tracking is how the second leader sees that promise and picks it up with care, instead of starting with "so how long have you been coming?" as if the church had not already noticed them.',
      'This is gentle work, and it belongs to women and men, to a youth leader and to a pastor nearer retirement. The screen should not embarrass either of them. A short next step is enough. The long story, if it is private, stays in the pastoral note. You can review ten people in a leaders\' meeting without turning the meeting into an exam. Who did we forget? Who is ready for the next conversation your church already offers? Who needs quiet rather than a programme?',
      'If a tool asks you to score faith, close it. If it helps a busy team remember a promise, keep it. Church_Hub is for the second kind. A free trial can hold the ten people you are already walking with, which is a truer test than a demonstration with sample names.',
      trial,
    ],
  }),
  post({
    slug: 'church-evangelism-tracking',
    title: 'Church evangelism tracking for the names you meet outside the building',
    summary:
      'How outreach teams can remember the people they meet, share the next visit, and connect that person to the church without losing the name in a notebook.',
    seoTitle: 'Church evangelism tracking and outreach follow-up',
    seoDescription:
      'Church evangelism tracking that helps outreach teams remember people they meet, plan the next visit, and connect them to the church family.',
    coverImagePath: '/images/blog/church-evangelism-tracking.svg',
    coverImageAlt: 'Church evangelism tracking for outreach teams remembering people they meet',
    sortOrder: 5,
    faqs: [
      {
        question: 'Why track evangelism at all?',
        answer:
          'Because a name in a notebook from Saturday is easy to lose by the next outing. Tracking is how the team remembers who they promised to see again.',
      },
      {
        question: 'Is this the same as a guest list?',
        answer:
          'Not always. Some people you meet will never come on Sunday, and they still deserved a kind follow-up. If they do come, the same person should not become a brand-new stranger in the church system.',
      },
      {
        question: 'Who can see outreach contacts?',
        answer:
          'The team that is doing the work, and the pastors who oversee it. A contact is a person, not a public scoreboard.',
      },
      {
        question: 'How do we start?',
        answer:
          'Take the last outreach, put those names into a free trial, and write the next visit beside each one before the notebook goes missing.',
      },
    ],
    paragraphs: [
      'Evangelism is a conversation, and then it is a test of memory. You meet someone at a stall, on a street, at a door, or after a meeting in a home. You pray with them or you simply listen. You write a name on a paper that felt important in the moment. A week later the paper is in a jacket, and the team is planning the next outing as if the last people were finished. They were not finished. You said you would care.',
      'Church evangelism tracking is how a team keeps that promise. It is not a tally of souls for a report that makes the church feel successful. It is a list of people, with a next step a human being can keep. Church_Hub holds outreach contacts in the same workspace as membership and follow-up, so a person you met outside can be welcomed inside without being typed in as a stranger.',
      '## The outing is the easy part',
      'The outing has songs, or leaflets, or a team that feels brave together. The follow-up is quieter. Someone has to go back, or send a message, or introduce the person to a church service if they asked for that. In a UK town that next step might be a coffee. In a US city it might be a Sunday guest. In the UAE it might be a careful friendship in a place where church life is already a gathered community from many nations. Across Africa an outreach team may already expect to visit, and the cell may be the real home for the person you met. Tracking should serve that visit. It should not replace it with a chart.',
      'Write down enough to be kind later. The name they gave you. Where you met. What they actually said they wanted. Who on the team they trusted. A note that says "interested" is not enough for the person who was not there. Church evangelism tracking works when the next volunteer can continue a conversation, not start an interview.',
      '## Share the harvest or one person will burn out',
      'Outreach teams often depend on one faithful leader. They are at the planning meeting, the outing, and then the visits. They are tired, and the names still sit with them because nobody else can see the list. A shared list means a teammate can take two visits. The pastor can see that the work is real without turning people into points. Church_Hub is meant for that sharing, with roles so the whole church is not browsing private conversations from the street.',
      'Young adults will often be the ones on the outing. Older members will often be the ones who know how to sit in a house and talk without rushing. Evangelism tracking should give both a place. The twenty-two-year-old should be able to add a name from their phone before they forget the spelling. The fifty-year-old should be able to see which visit is theirs. Men and women are both on these teams. The list does not need a hero. It needs a next step.',
      '## When the person comes to church',
      'This is where evangelism and guest follow-up should shake hands. If your Saturday contact sits down on Sunday, the welcome team should not greet them as a blank card. The story can continue. Church_Hub keeps the outreach contact and the church follow-up together for that reason. You are not collecting leads. You are trying not to make a person introduce themselves twice.',
      'Some people will never come to a service, and you should still keep your word. A visit, a prayer, a message they welcomed. Record a gentle ending when the friendship is not yours to push. Evangelism is not a chase. Tracking that only knows how to push will train your team to be noisy. Tracking that knows how to stop will train them to be trusted.',
      '## Reports are for the team, not for pride',
      'A pastor may ask what the outreach has been doing. That is fair. A short picture of who was met and who still needs a visit is enough. A public scoreboard of decisions is not. People are not trophies, and numbers without names teach a team to hurry. Church evangelism tracking in Church_Hub is there so the leaders can tell the truth about the work, including the visits that have not happened yet.',
      'If your team is small, do not copy the paperwork of a team of fifty. One outing, one list, one review the following week. Who did we meet? Who did we say we would see? Who saw them? That meeting can happen in a kitchen. The software should make the kitchen conversation shorter, not cancel it.',
      '## Start with the last outing, while the names are still warm',
      'Open the notebook from the last time you went out. Put those people in the workspace before the ink gets lonely. Assign the visits you already intended. Look at the list with the leader who was there and one person who was not, and see if the second person understands what to do. If they do, you have evangelism tracking. If they do not, the notes were only ever for the person who wrote them.',
      'A free trial is a fair place to do that once, with real names your team still cares about. If the list helps you keep a promise, keep using it. If it only helps you count, leave it.',
      'Church evangelism tracking is worth it when the person you met can be found by a teammate who was not standing next to you. Write the next visit in plain words. Keep the note with the team that is responsible. If they later sit in a service, let the same story continue into guest follow-up instead of starting again. Church_Hub is built for that continuation, in a town, a city, a hall of many nationalities, or a church with branches.',
      'The team comes back from an outing tired and glad. Someone has a page of names. If that page stays in one bag, the visits depend on one memory. Move the page to a place the team shares before the week gets away. A teammate who could not come can still take a visit. The pastor can ask, without a performance, who has been seen and who is still waiting.',
      'Write what the person actually hoped for. A prayer. A follow-up visit. An invitation they accepted. Leave out the drama. People in the UK, the USA, the UAE, and across Africa will not sound the same, and the note should sound like the conversation you had. The next person to read it should be able to continue without inventing a story.',
      'When a name from the outing appears in church, do not make them begin again at the welcome desk as if the meeting never happened. That continuity is the point of keeping evangelism and guest follow-up in one workspace. A free trial is a fair way to try it with one real outing, while the names are still people you can picture.',
      trial,
    ],
  }),
];
