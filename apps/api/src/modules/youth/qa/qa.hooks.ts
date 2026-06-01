/**
 * Dev hooks — moderation and category labels for other youth modules.
 *
 * @example
 * import { scanContentForModeration } from '../qa/qa.hooks';
 * const flag = scanContentForModeration(text);
 */
export { QA_CATEGORY_LABELS, QA_STATUS_LABELS } from './qa.constants';
export { scanYouthContent, scanContentForModeration } from '../common/moderation.util';
export { YouthQaService } from './qa.service';
