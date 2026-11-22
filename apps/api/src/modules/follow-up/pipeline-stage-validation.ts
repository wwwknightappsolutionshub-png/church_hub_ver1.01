import { BadRequestException, ForbiddenException } from '@nestjs/common';

/** UPPER_SNAKE_CASE stage keys (2–48 chars). */
export const STAGE_KEY_RE = /^[A-Z][A-Z0-9_]{1,47}$/;

const PHASE_KEY_MAX = 40;
const PHASE_TITLE_MAX = 80;
const COLOR_TOKEN_MAX = 32;
const LABEL_MAX = 80;
const SHORT_LABEL_MAX = 40;

/** Global system-template mutations (bump/resync) — opt-in QA / product tooling only. */
export function assertPipelineQaToolsEnabled() {
  if (process.env.PIPELINE_QA_TOOLS !== 'true') {
    throw new ForbiddenException(
      'System template bump/resync is disabled. Set PIPELINE_QA_TOOLS=true for local/QA tooling only.',
    );
  }
}

export function assertStageKey(key: string, label = 'Stage key'): string {
  const trimmed = (key ?? '').trim();
  if (!STAGE_KEY_RE.test(trimmed)) {
    throw new BadRequestException(
      `${label} must be UPPER_SNAKE_CASE (2–48 chars, start with a letter)`,
    );
  }
  return trimmed;
}

export function assertLabel(raw: string | undefined, field: 'label' | 'shortLabel'): string {
  const value = (raw ?? '').trim();
  const max = field === 'label' ? LABEL_MAX : SHORT_LABEL_MAX;
  if (!value || value.length > max) {
    throw new BadRequestException(
      field === 'label'
        ? `Stage label must be 1–${LABEL_MAX} characters`
        : `Short label must be 1–${SHORT_LABEL_MAX} characters`,
    );
  }
  return value;
}

export function assertOptionalPhaseFields(input: {
  phaseKey?: string;
  phaseStep?: number;
  phaseTitle?: string;
  colorToken?: string | null;
}): {
  phaseKey?: string;
  phaseStep?: number;
  phaseTitle?: string;
  colorToken?: string | null;
} {
  const out: {
    phaseKey?: string;
    phaseStep?: number;
    phaseTitle?: string;
    colorToken?: string | null;
  } = {};

  if (input.phaseKey !== undefined) {
    const phaseKey = input.phaseKey.trim();
    if (!phaseKey || phaseKey.length > PHASE_KEY_MAX) {
      throw new BadRequestException(`phaseKey must be 1–${PHASE_KEY_MAX} characters`);
    }
    if (!/^[a-z][a-z0-9_-]{0,39}$/i.test(phaseKey)) {
      throw new BadRequestException('phaseKey must be alphanumeric (start with a letter)');
    }
    out.phaseKey = phaseKey;
  }

  if (input.phaseStep !== undefined) {
    if (!Number.isInteger(input.phaseStep) || input.phaseStep < 1 || input.phaseStep > 99) {
      throw new BadRequestException('phaseStep must be an integer from 1–99');
    }
    out.phaseStep = input.phaseStep;
  }

  if (input.phaseTitle !== undefined) {
    const phaseTitle = input.phaseTitle.trim();
    if (!phaseTitle || phaseTitle.length > PHASE_TITLE_MAX) {
      throw new BadRequestException(`phaseTitle must be 1–${PHASE_TITLE_MAX} characters`);
    }
    out.phaseTitle = phaseTitle;
  }

  if (input.colorToken !== undefined) {
    if (input.colorToken === null) {
      out.colorToken = null;
    } else {
      const colorToken = input.colorToken.trim();
      if (!colorToken || colorToken.length > COLOR_TOKEN_MAX) {
        throw new BadRequestException(`colorToken must be 1–${COLOR_TOKEN_MAX} characters`);
      }
      if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(colorToken)) {
        throw new BadRequestException('colorToken must be alphanumeric (start with a letter)');
      }
      out.colorToken = colorToken;
    }
  }

  return out;
}
