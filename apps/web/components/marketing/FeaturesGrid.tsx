import {
  Bus,
  Briefcase,
  HeartHandshake,
  Megaphone,
  Radio,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const modules = [
  {
    icon: Users,
    title: 'Membership System',
    description: 'Digital onboarding, family linking, role-based profiles, and status pipeline from Visitor to Discipled.',
    tags: ['Onboarding', 'Families', 'RBAC'],
  },
  {
    icon: HeartHandshake,
    title: 'Follow-Up & Discipleship',
    description: 'Automated pipeline stages, team assignments, SMS reminders, and confidential pastoral notes.',
    tags: ['Pipeline', 'Reminders', 'Notes'],
  },
  {
    icon: Megaphone,
    title: 'Evangelism & Outreach',
    description: 'Offline-first capture, QR/NFC evangelist links, GPS tagging, and automatic welcome messaging.',
    tags: ['Offline sync', 'QR codes', 'GPS'],
  },
  {
    icon: Sparkles,
    title: 'Youth Community',
    description: 'Groups, events, moderated chats, gamification with badges, and parent/guardian linking.',
    tags: ['Events', 'Gamification', 'Safety'],
  },
  {
    icon: Briefcase,
    title: 'Business Community',
    description: 'Verified member directory, church marketplace, job board, and mentorship matching.',
    tags: ['Directory', 'Marketplace', 'Jobs'],
  },
  {
    icon: Bus,
    title: 'Bus Ministry',
    description: 'Ride scheduling, route optimization, driver GPS tracking, capacity management, and emergency alerts.',
    tags: ['GPS', 'Routes', 'Alerts'],
  },
  {
    icon: Radio,
    title: 'Communications Hub',
    description: 'Announcements, sermon archive, devotional plans, push notifications, and group channels.',
    tags: ['Push', 'Sermons', 'Chat'],
  },
  {
    icon: Shield,
    title: 'Admin & Analytics',
    description: 'Cross-ministry dashboards, evangelism metrics, attendance insights, and exportable reports.',
    tags: ['Analytics', 'Reports', 'Multi-campus'],
  },
];

export function FeaturesGrid() {
  return (
    <section id="modules" className="border-b border-border bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">8 integrated modules</Badge>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">
            Every ministry. One platform.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Replace scattered spreadsheets and disconnected apps with a unified system
            built for how churches actually operate.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(({ icon: Icon, title, description, tags }) => (
            <article
              key={title}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
