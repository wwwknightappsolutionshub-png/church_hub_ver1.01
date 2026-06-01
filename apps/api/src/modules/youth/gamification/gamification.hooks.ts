/**
 * Dev hooks — import from other youth modules for consistent scoring.
 *
 * @example
 * import { SCORE_DELTAS } from './gamification/gamification.hooks';
 * await this.gamification.scoreEvent(churchId, memberId, YouthPointSource.RSVP);
 */
export { SCORE_DELTAS, DEFAULT_YOUTH_ACHIEVEMENTS, DEFAULT_YOUTH_CHALLENGES } from './gamification.constants';
export { YouthGamificationService } from './gamification.service';
