import { Injectable } from '@nestjs/common';

/**
 * Short-form sermon clips (Reels/TikTok-style).
 * @see docs/youth/PHASE1-SCAN.md — Phase 2 implementation
 */
@Injectable()
export class YouthClipsService {
  static readonly MODULE_KEY = 'youth/clips' as const;
}
