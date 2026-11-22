/**
 * Option C security contracts — QA tool gate + stage input hardening.
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  assertOptionalPhaseFields,
  assertPipelineQaToolsEnabled,
  assertStageKey,
} from './pipeline-stage-validation';

describe('Pipeline Option C — security contracts', () => {
  const prevQa = process.env.PIPELINE_QA_TOOLS;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevQa === undefined) delete process.env.PIPELINE_QA_TOOLS;
    else process.env.PIPELINE_QA_TOOLS = prevQa;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it('blocks system template QA tools unless PIPELINE_QA_TOOLS=true (non-production)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PIPELINE_QA_TOOLS;
    expect(() => assertPipelineQaToolsEnabled()).toThrow(ForbiddenException);

    process.env.PIPELINE_QA_TOOLS = 'false';
    expect(() => assertPipelineQaToolsEnabled()).toThrow(ForbiddenException);

    process.env.PIPELINE_QA_TOOLS = 'true';
    expect(() => assertPipelineQaToolsEnabled()).not.toThrow();
  });

  it('never allows bump/resync in production even with PIPELINE_QA_TOOLS=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.PIPELINE_QA_TOOLS = 'true';
    expect(() => assertPipelineQaToolsEnabled()).toThrow(ForbiddenException);
  });

  it('rejects invalid stage keys', () => {
    expect(() => assertStageKey('not-valid')).toThrow(BadRequestException);
    expect(() => assertStageKey('A')).toThrow(BadRequestException);
    expect(assertStageKey('JOINED_GROUP')).toBe('JOINED_GROUP');
  });

  it('bounds phase fields', () => {
    expect(() =>
      assertOptionalPhaseFields({ phaseKey: 'x'.repeat(50) }),
    ).toThrow(BadRequestException);
    expect(() => assertOptionalPhaseFields({ phaseStep: 0 })).toThrow(BadRequestException);
    expect(
      assertOptionalPhaseFields({
        phaseKey: 'outreach',
        phaseStep: 2,
        phaseTitle: 'Initial Outreach',
        colorToken: 'sky',
      }),
    ).toEqual({
      phaseKey: 'outreach',
      phaseStep: 2,
      phaseTitle: 'Initial Outreach',
      colorToken: 'sky',
    });
  });
});
