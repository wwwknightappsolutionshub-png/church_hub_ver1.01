import { BadRequestException } from '@nestjs/common';
import { MarketingInboundType } from '@prisma/client';

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}.'’\- ]{0,78}[\p{L}\p{M}.]$/u;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const SHORT_TEXT_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .'’&,()/:!?-]{0,118}[\p{L}\p{M}0-9.!?]$/u;
const DANGEROUS_RE =
  /[<>]|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=|&(?:amp;)?(?:lt|gt|#)|&#|%3c|%3e/i;
const LINE_BREAKS = /[\u0000-\u001F\u007F\u0085\u2028\u2029\u200B-\u200D\uFEFF]/g;

export type CleanSubmission = {
  type: MarketingInboundType;
  name: string;
  email: string;
  organization: string | null;
  subject: string | null;
  message: string;
  rating: number | null;
};

function rejectDangerous(value: string, label: string) {
  if (DANGEROUS_RE.test(value) || value.includes('\0')) {
    throw new BadRequestException('Please check what you entered and try again');
  }
}

function fold(value: string): string {
  return value.normalize('NFKC');
}

function cleanLine(value: string | undefined, label: string, max: number): string {
  const text = fold(value ?? '')
    .replace(LINE_BREAKS, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > max) {
    throw new BadRequestException(`${label} is too long`);
  }
  rejectDangerous(text, label);
  return text;
}

export function cleanInternalNotes(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Please check what you entered and try again');
  }
  const text = fold(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0085\u2028\u2029\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (!text) return null;
  if (text.length > 2000) {
    throw new BadRequestException('Internal notes are too long');
  }
  rejectDangerous(text, 'Internal notes');
  return text;
}

function cleanMessage(value: string | undefined): string {
  const text = fold(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0085\u2028\u2029\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 10) {
    throw new BadRequestException('Please tell us a little more');
  }
  if (text.length > 4000) {
    throw new BadRequestException('Please shorten your message');
  }
  rejectDangerous(text, 'Message');
  return text;
}

export function cleanMarketingSubmission(input: {
  type?: string;
  name?: string;
  email?: string;
  organization?: string;
  subject?: string;
  message?: string;
  rating?: number | null;
}): CleanSubmission {
  if (input.type !== MarketingInboundType.CONTACT && input.type !== MarketingInboundType.FEEDBACK) {
    throw new BadRequestException('Invalid submission type');
  }

  const name = cleanLine(input.name, 'Name', 80);
  if (name.length < 2 || !NAME_RE.test(name)) {
    throw new BadRequestException('Enter your name using letters only');
  }

  const email = cleanLine(input.email, 'Email', 254).toLowerCase();
  if (!EMAIL_RE.test(email) || email.includes('..')) {
    throw new BadRequestException('Enter a valid email address');
  }

  const organizationRaw = cleanLine(input.organization, 'Organization', 120);
  const organization = organizationRaw.length === 0 ? null : organizationRaw;
  if (organization && (organization.length < 2 || !SHORT_TEXT_RE.test(organization))) {
    throw new BadRequestException('Organization contains characters we cannot accept');
  }

  const subjectRaw = cleanLine(input.subject, 'Subject', 120);
  const subject = subjectRaw.length === 0 ? null : subjectRaw;
  if (subject && (subject.length < 2 || !SHORT_TEXT_RE.test(subject))) {
    throw new BadRequestException('Subject contains characters we cannot accept');
  }
  if (input.type === MarketingInboundType.CONTACT && !subject) {
    throw new BadRequestException('Enter a subject for your message');
  }

  let rating: number | null = null;
  if (input.type === MarketingInboundType.FEEDBACK && input.rating != null && input.rating !== ('' as never)) {
    const n = Number(input.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new BadRequestException('Rating must be a whole number from 1 to 5');
    }
    rating = n;
  }

  return {
    type: input.type,
    name,
    email,
    organization,
    subject,
    message: cleanMessage(input.message),
    rating,
  };
}
