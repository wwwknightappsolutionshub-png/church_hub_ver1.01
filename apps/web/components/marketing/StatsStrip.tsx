const stats = [
  { value: '500+', label: 'Churches onboarded' },
  { value: '2.4M', label: 'Members managed' },
  { value: '99.9%', label: 'Platform uptime' },
  { value: '78%', label: 'Avg. follow-up completion' },
];

export function StatsStrip() {
  return (
    <section id="platform" className="border-b border-border bg-sidebar py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 lg:grid-cols-4 lg:px-8">
        {stats.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="font-heading text-3xl font-bold text-white lg:text-4xl">{value}</p>
            <p className="mt-1 text-sm text-sidebar-foreground/70">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
