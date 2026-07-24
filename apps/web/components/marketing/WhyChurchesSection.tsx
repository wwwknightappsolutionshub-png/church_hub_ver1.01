import {
  Church,
  ClipboardList,
  HeartHandshake,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const reasons = [
  {
    icon: Layers3,
    title: 'Replace tool sprawl',
    description:
      'Stop juggling spreadsheets, WhatsApp groups, and disconnected apps. Membership, follow-up, outreach, youth, and operations live in one secure system.',
  },
  {
    icon: HeartHandshake,
    title: 'Never lose a first-time guest',
    description:
      'Structured discipleship pipelines, assignments, and reminders help leaders follow through — so visitors become members, not missed opportunities.',
  },
  {
    icon: ClipboardList,
    title: 'Built for how churches work',
    description:
      'Role-based access for pastors, unit admins, evangelists, and members. Enable only the modules you need as your ministry grows.',
  },
  {
    icon: ShieldCheck,
    title: 'Sacred data, enterprise care',
    description:
      'Tenant isolation, audit trails, and confidential pastoral notes — designed for governance without slowing ministry down.',
  },
  {
    icon: Sparkles,
    title: 'Engage every generation',
    description:
      'Youth community, prayer, communications, and branded church pages keep members connected between Sundays.',
  },
  {
    icon: Church,
    title: 'Your brand, your home',
    description:
      'Publish a public church landing page, invite members digitally, and give leaders a professional workspace that reflects your congregation.',
  },
];

/** Why churches choose Church_Hub — capabilities framed around ministry outcomes. */
export function WhyChurchesSection() {
  return (
    <section id="why-churches" className="border-b border-border py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="gold" className="mb-4">
            Why churches choose Church_Hub
          </Badge>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">
            Built for ministry outcomes — not just software checklists
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Church_Hub helps congregations shepherd people, coordinate teams, and grow with clarity —
            without forcing your staff into tools designed for generic businesses.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-elevated"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
