export {
  scanContentForModeration,
  scanYouthContent,
  type YouthContentScanOptions,
} from './safety.util';

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\w]+/g);
  return matches ? [...new Set(matches.map((t) => t.slice(1).toLowerCase()))] : [];
}

export function computeEngagementScore(likeCount: number, commentCount: number, shareCount: number, ageHours: number): number {
  const recencyBoost = Math.max(0, 48 - ageHours) / 48;
  return likeCount * 2 + commentCount * 3 + shareCount * 5 + recencyBoost * 10;
}

export function xpForLevel(level: number): number {
  return level * 100;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
}
