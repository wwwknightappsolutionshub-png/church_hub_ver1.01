import {
  MODERATION_KEYWORDS,
  YOUTH_SAFE_STRICT_PATTERNS,
} from '../youth.constants';

export interface YouthContentScanOptions {
  /** When true (default), block contact info and external URLs */
  strictSafeMode?: boolean;
}

/**
 * Youth-safe content filter — keywords + optional strict mode.
 * Used across feed, chat, Q&A, and prayer wall.
 */
export function scanYouthContent(
  content: string,
  opts: YouthContentScanOptions = {},
): string | null {
  const strict = opts.strictSafeMode !== false;
  const lower = content.toLowerCase();
  const keyword = MODERATION_KEYWORDS.find((k) => lower.includes(k));
  if (keyword) return `Flagged keyword: ${keyword}`;

  if (strict) {
    for (const { label, regex } of YOUTH_SAFE_STRICT_PATTERNS) {
      if (regex.test(content)) {
        return `Youth-safe mode: ${label} not allowed`;
      }
    }
  }

  return null;
}

/** @deprecated Use scanYouthContent — kept for backward-compatible imports */
export function scanContentForModeration(content: string): string | null {
  return scanYouthContent(content, { strictSafeMode: false });
}
