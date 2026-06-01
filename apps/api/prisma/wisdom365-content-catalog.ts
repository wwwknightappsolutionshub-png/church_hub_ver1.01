/**
 * Curated scripture pool (World English Bible — public domain).
 * SaaS admins can edit published entries via the platform console.
 */
export interface Wisdom365PassageSeed {
  reference: string;
  passage: string;
  theme: string;
}

export const WISDOM365_THEMES = [
  'Trust',
  'Integrity',
  'Peace',
  'Generosity',
  'Discipline',
  'Courage',
  'Humility',
  'Hope',
  'Wisdom',
  'Love',
] as const;

export const WISDOM365_PASSAGE_POOL: Wisdom365PassageSeed[] = [
  {
    reference: 'Proverbs 3:5-6',
    theme: 'Trust',
    passage:
      'Trust in Yahweh with all your heart, and don\'t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
  },
  {
    reference: 'James 1:5',
    theme: 'Wisdom',
    passage:
      'But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach; and it will be given to him.',
  },
  {
    reference: 'Psalm 119:105',
    theme: 'Wisdom',
    passage: 'Your word is a lamp to my feet, and a light for my path.',
  },
  {
    reference: 'Micah 6:8',
    theme: 'Integrity',
    passage:
      'He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?',
  },
  {
    reference: 'Colossians 3:23',
    theme: 'Discipline',
    passage:
      'Whatever you do, work heartily, as for the Lord and not for men.',
  },
  {
    reference: 'Philippians 4:6-7',
    theme: 'Peace',
    passage:
      'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
  },
  {
    reference: 'Romans 12:2',
    theme: 'Wisdom',
    passage:
      'Don\'t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God.',
  },
  {
    reference: 'Proverbs 16:3',
    theme: 'Trust',
    passage: 'Commit your deeds to Yahweh, and your plans shall succeed.',
  },
  {
    reference: 'Matthew 6:33',
    theme: 'Trust',
    passage:
      'But seek first God\'s Kingdom and his righteousness; and all these things will be given to you as well.',
  },
  {
    reference: 'Galatians 6:9',
    theme: 'Hope',
    passage:
      'Let\'s not be weary in doing good, for we will reap in due season if we don\'t give up.',
  },
  {
    reference: '1 Corinthians 10:31',
    theme: 'Integrity',
    passage:
      'Whether therefore you eat, or drink, or whatever you do, do all to the glory of God.',
  },
  {
    reference: 'Proverbs 11:25',
    theme: 'Generosity',
    passage:
      'The liberal soul shall be made fat. He who waters shall be watered also himself.',
  },
  {
    reference: 'Joshua 1:9',
    theme: 'Courage',
    passage:
      'Haven\'t I commanded you? Be strong and courageous. Don\'t be afraid. Don\'t be dismayed, for Yahweh your God is with you wherever you go.',
  },
  {
    reference: '1 Peter 5:6',
    theme: 'Humility',
    passage:
      'Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time.',
  },
  {
    reference: 'Romans 15:13',
    theme: 'Hope',
    passage:
      'Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.',
  },
  {
    reference: 'Proverbs 4:23',
    theme: 'Discipline',
    passage: 'Keep your heart with all diligence, for out of it is the wellspring of life.',
  },
  {
    reference: 'Ephesians 4:32',
    theme: 'Love',
    passage:
      'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
  },
  {
    reference: 'Hebrews 10:24',
    theme: 'Love',
    passage:
      'Let us consider how to provoke one another to love and good works.',
  },
  {
    reference: 'Proverbs 22:1',
    theme: 'Integrity',
    passage:
      'A good name is more desirable than great riches, and loving favor is better than silver and gold.',
  },
  {
    reference: 'Isaiah 41:10',
    theme: 'Courage',
    passage:
      'Don\'t you be afraid, for I am with you. Don\'t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.',
  },
  {
    reference: '2 Timothy 1:7',
    theme: 'Courage',
    passage:
      'For God didn\'t give us a spirit of fear, but of power, love, and self-control.',
  },
  {
    reference: 'Psalm 46:10',
    theme: 'Peace',
    passage: 'Be still, and know that I am God.',
  },
  {
    reference: 'Luke 6:38',
    theme: 'Generosity',
    passage:
      'Give, and it will be given to you: good measure, pressed down, shaken together, and running over, will be given to you.',
  },
  {
    reference: 'Proverbs 15:1',
    theme: 'Peace',
    passage: 'A gentle answer turns away wrath, but a harsh word stirs up anger.',
  },
  {
    reference: '1 John 4:19',
    theme: 'Love',
    passage: 'We love him, because he first loved us.',
  },
  {
    reference: 'Ecclesiastes 3:1',
    theme: 'Wisdom',
    passage: 'For everything there is a season, and a time for every purpose under heaven.',
  },
  {
    reference: 'Matthew 5:9',
    theme: 'Peace',
    passage: 'Blessed are the peacemakers, for they shall be called children of God.',
  },
  {
    reference: 'Proverbs 27:17',
    theme: 'Love',
    passage: 'Iron sharpens iron; so a man sharpens his friend\'s countenance.',
  },
  {
    reference: 'Deuteronomy 31:6',
    theme: 'Courage',
    passage:
      'Be strong and courageous. Don\'t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.',
  },
  {
    reference: 'Psalm 37:5',
    theme: 'Trust',
    passage: 'Commit your way to Yahweh. Trust also in him, and he will do this.',
  },
  {
    reference: 'Colossians 3:12',
    theme: 'Humility',
    passage:
      'Put on therefore, as God\'s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance.',
  },
  {
    reference: 'Proverbs 31:10',
    theme: 'Love',
    passage: 'Who can find a worthy woman? For her price is far above rubies.',
  },
  {
    reference: 'Ephesians 5:25',
    theme: 'Love',
    passage:
      'Husbands, love your wives, even as Christ also loved the assembly and gave himself up for it.',
  },
  {
    reference: 'Proverbs 31:26',
    theme: 'Wisdom',
    passage: 'She opens her mouth with wisdom. Kind instruction is on her tongue.',
  },
  {
    reference: '1 Timothy 4:12',
    theme: 'Courage',
    passage:
      'Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity.',
  },
  {
    reference: 'Proverbs 1:7',
    theme: 'Wisdom',
    passage: 'The fear of Yahweh is the beginning of knowledge.',
  },
  {
    reference: 'Matthew 19:14',
    theme: 'Love',
    passage:
      'Jesus said, "Allow the little children, and don\'t forbid them to come to me; for the Kingdom of Heaven belongs to ones like these."',
  },
  {
    reference: 'Psalm 23:1',
    theme: 'Trust',
    passage: 'Yahweh is my shepherd: I shall lack nothing.',
  },
  {
    reference: 'Proverbs 10:9',
    theme: 'Integrity',
    passage:
      'He who walks blamelessly walks surely, but he who perverts his ways will be found out.',
  },
  {
    reference: 'James 4:10',
    theme: 'Humility',
    passage: 'Humble yourselves in the sight of the Lord, and he will exalt you.',
  },
];

export const WISDOM365_VARIANT_CATALOG = [
  {
    slug: 'BUSINESS_OWNERS' as const,
    name: 'Business Owners',
    description:
      'Daily wisdom for entrepreneurs and professionals — stewardship, integrity, and kingdom-minded leadership in the marketplace.',
    bibleTranslationLabel: 'NIV Business Study Companion',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: false,
    sortOrder: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1454165804603-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'business leader',
  },
  {
    slug: 'STUDENTS' as const,
    name: 'Students',
    description:
      'Clear, practical scripture for academic life — focus, discipline, and faith through exams, friendships, and decisions.',
    bibleTranslationLabel: 'NIV (Basic English)',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: false,
    sortOrder: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'student',
  },
  {
    slug: 'YOUTHS' as const,
    name: 'Youths',
    description:
      'Bold, relevant daily word for teens and young adults navigating identity, purpose, and peer pressure.',
    bibleTranslationLabel: 'NLT Youth Edition',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: false,
    sortOrder: 3,
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'young person',
  },
  {
    slug: 'KIDS' as const,
    name: 'Kids',
    description:
      'Short, joyful daily Bible moments for children — parent-managed access with simple language and gentle application.',
    bibleTranslationLabel: 'ICB (International Children\'s Bible)',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: true,
    sortOrder: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'child',
  },
  {
    slug: 'HUSBANDS' as const,
    name: 'Husbands',
    description:
      'Daily wisdom for husbands — sacrificial love, spiritual leadership, and integrity at home.',
    bibleTranslationLabel: 'ESV Men\'s Devotional',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: false,
    sortOrder: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'husband',
  },
  {
    slug: 'WIVES' as const,
    name: 'Wives',
    description:
      'Daily wisdom for wives — grace, strength, partnership, and faith-filled homemaking and influence.',
    bibleTranslationLabel: 'ESV Women\'s Devotional',
    bibleTranslationCode: 'WEB',
    requiresParentalConsent: false,
    sortOrder: 6,
    imageUrl:
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
    audienceVoice: 'wife',
  },
] as const;

export type VariantCatalogEntry = (typeof WISDOM365_VARIANT_CATALOG)[number];

export function buildVariantContent(
  variant: VariantCatalogEntry,
  dayOfYear: number,
  passage: Wisdom365PassageSeed,
): {
  title: string;
  wisdom: string;
  application: string;
  prayer: string;
  audioScriptHint: string;
} {
  const themeLower = passage.theme.toLowerCase();
  const title = `Day ${dayOfYear} · ${passage.theme}`;

  const wisdomByVariant: Record<VariantCatalogEntry['slug'], string> = {
    BUSINESS_OWNERS: `As a ${variant.audienceVoice}, ${themeLower} is not optional in your calling — it is the foundation of sustainable success. ${passage.reference} invites you to lead with eternal priorities before quarterly targets.`,
    STUDENTS: `Hey ${variant.audienceVoice}, today\'s focus is ${themeLower}. Before classes, notifications, and deadlines take over, let ${passage.reference} anchor your mind.`,
    YOUTHS: `You are not too young for God to speak. Today\'s theme is ${themeLower}. ${passage.reference} is your compass when culture pulls you elsewhere.`,
    KIDS: `God loves you so much! Today we learn about ${themeLower}. ${passage.reference} helps us see how much God cares for you every day.`,
    HUSBANDS: `Brother, ${themeLower} defines Christ-like leadership in your home. ${passage.reference} calls you to love and serve with intention today.`,
    WIVES: `Sister, ${themeLower} is part of the grace you carry into your home. ${passage.reference} reminds you that your influence matters deeply to God.`,
  };

  const applicationByVariant: Record<VariantCatalogEntry['slug'], string> = {
    BUSINESS_OWNERS: `Identify one business decision today where you choose ${themeLower} over convenience. Write it down, act on it once, and review this evening.`,
    STUDENTS: `Pick one study block, conversation, or choice today where you practice ${themeLower}. Write one sentence about how it went tonight.`,
    YOUTHS: `Choose one moment today — online, at school, or with friends — to live out ${themeLower}. Tell a trusted friend or leader what you chose.`,
    KIDS: `Draw a picture or tell your parent one way you will show ${themeLower} today. Ask them to pray with you before bed.`,
    HUSBANDS: `Ask your spouse one thoughtful question today and listen fully. Let ${themeLower} shape your tone, patience, and presence at home.`,
    WIVES: `Encourage one person in your household today with words that reflect ${themeLower}. Pray briefly for your marriage before sleep.`,
  };

  const prayerByVariant: Record<VariantCatalogEntry['slug'], string> = {
    BUSINESS_OWNERS: `Lord, govern my business with ${themeLower}. Let my work honor You and bless others. Amen.`,
    STUDENTS: `God, help me grow in ${themeLower} while I study and live among my friends. Amen.`,
    YOUTHS: `Jesus, make me bold in ${themeLower} today. Lead me when I feel pressure to fit in. Amen.`,
    KIDS: `Dear God, thank You for loving me. Help me show ${themeLower} today. Amen.`,
    HUSBANDS: `Father, teach me to lead our home with ${themeLower} and love like Christ. Amen.`,
    WIVES: `Lord, fill me with ${themeLower} and grace for my family today. Amen.`,
  };

  const wisdom = wisdomByVariant[variant.slug];
  const application = applicationByVariant[variant.slug];
  const prayer = prayerByVariant[variant.slug];

  const audioScriptHint = [
    `Hello, how are you today?`,
    `Your wisdom focus for today is ${themeLower}.`,
    `From ${passage.reference} in the ${variant.bibleTranslationLabel}:`,
    passage.passage,
    wisdom,
    application,
    prayer,
  ].join(' ');

  return { title, wisdom, application, prayer, audioScriptHint };
}

export const WISDOM365_THEME_IMAGES: Record<string, string> = {
  Trust: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  Integrity: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  Peace: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  Generosity: 'https://images.unsplash.com/photo-1418065460547-3c41a5a962b2?auto=format&fit=crop&w=1200&q=80',
  Discipline: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80',
  Courage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  Humility: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  Hope: 'https://images.unsplash.com/photo-1495616811223-4d98c6e2470f?auto=format&fit=crop&w=1200&q=80',
  Wisdom: 'https://images.unsplash.com/photo-1518173946687-a1263637735?auto=format&fit=crop&w=1200&q=80',
  Love: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
};
