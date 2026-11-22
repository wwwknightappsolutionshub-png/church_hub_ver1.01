'use client';

import { useMemo } from 'react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  enabledStages,
  phaseColumnsFromPipeline,
  stageLabelMap,
  stageShortMap,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';

export function usePipelineDefinition(options?: { enabled?: boolean }) {
  const query = useApiQuery<ResolvedPipeline>(
    ['follow-up', 'pipeline'],
    '/follow-up/pipeline',
    {
      enabled: options?.enabled !== false,
      staleTime: 60_000,
    },
  );

  const stages = useMemo(() => enabledStages(query.data), [query.data]);
  const stageKeys = useMemo(() => stages.map((s) => s.key), [stages]);
  const labels = useMemo(() => stageLabelMap(query.data), [query.data]);
  const shorts = useMemo(() => stageShortMap(query.data), [query.data]);
  const phases = useMemo(() => phaseColumnsFromPipeline(query.data), [query.data]);

  return {
    ...query,
    pipeline: query.data ?? null,
    stages,
    stageKeys,
    labels,
    shorts,
    phases,
  };
}
