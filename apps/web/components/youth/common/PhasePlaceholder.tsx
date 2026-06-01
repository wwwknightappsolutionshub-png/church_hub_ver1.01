interface PhasePlaceholderProps {
  feature: string;
  phase?: number;
}

/** Phase 1 route placeholder — replaced in Phase 2 with full UI. */
export function PhasePlaceholder({ feature, phase = 2 }: PhasePlaceholderProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-lg font-semibold">{feature}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        This section is scaffolded for Phase {phase}. The main youth hub remains at{' '}
        <a href="/dashboard/youth" className="text-primary underline">
          /dashboard/youth
        </a>
        .
      </p>
    </div>
  );
}
