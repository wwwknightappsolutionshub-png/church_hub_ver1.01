import { ArrowRight, Database, Rocket, Settings } from 'lucide-react';

const steps = [
  {
    icon: Rocket,
    step: '01',
    title: 'Launch your church workspace',
    description: 'Register, configure campuses, import members, and assign roles in under an hour.',
  },
  {
    icon: Settings,
    step: '02',
    title: 'Activate ministry modules',
    description: 'Enable membership, outreach, youth, bus, and business modules tailored to your needs.',
  },
  {
    icon: Database,
    step: '03',
    title: 'Connect your teams',
    description: 'Invite pastors, evangelists, drivers, and youth leaders with granular permissions.',
  },
  {
    icon: ArrowRight,
    step: '04',
    title: 'Grow with real-time insights',
    description: 'Track discipleship pipelines, outreach impact, and attendance from one dashboard.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Go live in days, not months</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Enterprise onboarding with guided setup, data migration support, and dedicated success resources.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-4">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <div key={step} className="relative">
              <div className="flex items-center gap-3 lg:block">
                <span className="font-heading text-4xl font-bold text-primary/10 sm:text-5xl">{step}</span>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary lg:mt-2">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
