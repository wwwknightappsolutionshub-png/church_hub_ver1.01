export type ContactField = 'name' | 'email' | 'organization' | 'subject' | 'message' | 'rating';

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}.'’\- ]{0,78}[\p{L}\p{M}.]$/u;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const SHORT_TEXT_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .'’&,()/:!?-]{0,118}[\p{L}\p{M}0-9.!?]$/u;
const DANGEROUS_RE =
  /[<>]|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=|&(?:amp;)?(?:lt|gt|#)|&#|%3c|%3e/i;

export type ContactDraft = {
  kind: 'contact' | 'feedback';
  name: string;
  email: string;
  organization: string;
  subject: string;
  message: string;
  rating: number | '';
};

function line(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F\u0085\u2028\u2029\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unsafe(value: string): boolean {
  return DANGEROUS_RE.test(value) || value.includes('\0');
}

/** Drop markup so it is not left in the box or sent. */
export function readableMessage(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0085\u2028\u2029\u200B-\u200D\uFEFF]/g, '')
    .replace(/&(?:amp;)?(?:lt|gt|#)[^;\s]{0,20};?/gi, '')
    .replace(/%3c/gi, '')
    .replace(/%3e/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '');
}

export function validateContactDraft(draft: ContactDraft): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  const name = line(draft.name);
  const email = line(draft.email).toLowerCase();
  const organization = line(draft.organization);
  const subject = line(draft.subject);
  const message = readableMessage(draft.message).trim();

  if (name.length < 2 || name.length > 80 || unsafe(name) || !NAME_RE.test(name)) {
    errors.name = 'Enter your name using letters only.';
  }
  if (email.length > 254 || unsafe(email) || !EMAIL_RE.test(email) || email.includes('..')) {
    errors.email = 'Enter a valid email address.';
  }
  if (draft.kind === 'contact' && organization) {
    if (organization.length < 2 || organization.length > 120 || unsafe(organization) || !SHORT_TEXT_RE.test(organization)) {
      errors.organization = 'Use a plain church or organization name.';
    }
  }
  if (draft.kind === 'contact' && !subject) {
    errors.subject = 'Enter a subject for your message.';
  } else if (subject && (subject.length < 2 || subject.length > 120 || unsafe(subject) || !SHORT_TEXT_RE.test(subject))) {
    errors.subject = 'Use a plain subject, up to 120 characters.';
  }
  if (message.length < 10 || message.length > 4000 || unsafe(message)) {
    errors.message = message.length > 4000 ? 'Please shorten your message.' : 'Please tell us a little more.';
  }
  if (draft.kind === 'feedback' && draft.rating !== '' && (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5)) {
    errors.rating = 'Choose a rating from 1 to 5.';
  }
  return errors;
}
