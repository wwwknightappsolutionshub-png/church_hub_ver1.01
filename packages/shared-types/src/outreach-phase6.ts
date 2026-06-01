import { z } from 'zod';
import { OutreachConvertStageSchema } from './outreach';

export const AdvanceOutreachPipelineSchema = z.object({
  convertStage: OutreachConvertStageSchema,
});

export interface OutreachPipelineDto {
  byStage: Record<string, number>;
  needsBusPickup: number;
  convertedTotal: number;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName?: string | null;
    convertStage: string;
    needsBusPickup: boolean;
    followUpId?: string | null;
    memberId?: string | null;
    capturedAt: string;
    followUp?: { id: string; stage: string } | null;
    member?: { id: string; firstName: string; lastName: string } | null;
  }>;
}
