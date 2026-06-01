import {
  artifactTypeForReadingLevel,
  buildFullStudyOutline,
  buildPrayerPoints,
  buildScriptureAnswer,
  pdfPagesToDevotionalDays,
  simplifyText,
  stubPdfExtractedText,
} from './devotional-ai-tools.util';

describe('devotional-ai-tools.util', () => {
  it('buildFullStudyOutline returns days matching duration', () => {
    const out = buildFullStudyOutline({
      sourceLabel: 'Faith in John',
      sourceType: 'BIBLE_BOOK',
      tone: 'YOUTH',
      durationDays: 5,
    });
    expect(out.days).toHaveLength(5);
    expect(out.breakdown).toHaveLength(5);
    expect(out.studyQuestions.length).toBeGreaterThan(0);
    expect(out.summary).toContain('Faith in John');
  });

  it('buildPrayerPoints includes categories', () => {
    const out = buildPrayerPoints({
      source: 'SCRIPTURE',
      prompt: 'John 3:16',
    });
    expect(out.points.length).toBeGreaterThanOrEqual(4);
    expect(out.closing).toContain('Amen');
  });

  it('buildScriptureAnswer respects depth', () => {
    const youth = buildScriptureAnswer('What is grace?', 'Eph 2:8', 'YOUTH');
    expect(youth.depth).toBe('YOUTH');
    expect(youth.answer).toContain('teen-friendly');
  });

  it('stubPdfExtractedText returns pages', () => {
    const { pageCount, pages } = stubPdfExtractedText('study.pdf', 3);
    expect(pageCount).toBe(3);
    expect(pages[0].pageNumber).toBe(1);
  });

  it('pdfPagesToDevotionalDays maps pages to days', () => {
    const days = pdfPagesToDevotionalDays(
      [{ pageNumber: 1, text: 'Intro text' }],
      'study.pdf',
    );
    expect(days[0].dayNumber).toBe(1);
    expect(days[0].title).toContain('study.pdf');
  });

  it('simplifyText prefixes by reading level', () => {
    const { simplified, readingLevel } = simplifyText('Therefore believe.', 'TEENS');
    expect(readingLevel).toBe('TEENS');
    expect(simplified).toMatch(/^\[Teens\]/);
  });

  it('artifactTypeForReadingLevel maps levels', () => {
    expect(artifactTypeForReadingLevel('KIDS_8_12')).toBe('SIMPLIFIED_CHILD');
    expect(artifactTypeForReadingLevel('ADULTS')).toBe('SIMPLIFIED_ADULT');
  });
});
