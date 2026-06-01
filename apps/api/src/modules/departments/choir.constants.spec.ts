import { transposeChordChart, transposeMusicalKey } from './choir.constants';

describe('choir.constants', () => {
  it('transposes keys by semitones', () => {
    expect(transposeMusicalKey('C', 2)).toBe('D');
    expect(transposeMusicalKey('Am', -2)).toBe('Gm');
  });

  it('transposes chord chart symbols', () => {
    const chart = 'C G Am F';
    expect(transposeChordChart(chart, 2)).toContain('D');
  });
});
