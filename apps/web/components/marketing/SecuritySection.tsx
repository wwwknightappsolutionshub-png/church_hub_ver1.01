import { Lock, Server, ShieldCheck, Users } from 'lucide-react';

const features = [
  { icon: ShieldCheck, title: 'Role-based access control', desc: 'Granular permissions for pastors, leaders, drivers, and volunteers.' },
  { icon: Lock, title: 'End-to-end encryption', desc: 'Data encrypted in transit and at rest. Confidential pastoral notes protected.' },
  { icon: Server, title: 'Multi-tenant architecture', desc: 'Isolated church data with enterprise-grade infrastructure and 99.9% uptime SLA.' },
  { icon: Users, title: 'Audit logs & compliance', desc: 'Full activity tracking for accountability and governance requirements.' },
];

export function SecuritySection() {
  return (
    <section id="security" className="border-y border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Enterprise security for sacred data
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Member information and pastoral notes deserve the highest level of protection.
              Church_Hub is built with security-first architecture from day one.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
