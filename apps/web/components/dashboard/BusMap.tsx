'use client';

import { BusLocationEvent } from '@/lib/hooks/use-bus-realtime';

interface BusMapProps {
  locations: BusLocationEvent[];
  className?: string;
}

export function BusMap({ locations, className }: BusMapProps) {
  const lat = locations[0]?.latitude ?? 51.5074;
  const lng = locations[0]?.longitude ?? -0.1278;
  const bbox = 0.02;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bbox}%2C${lat - bbox}%2C${lng + bbox}%2C${lat + bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <iframe
          title="Bus live map"
          src={embedUrl}
          className="h-64 w-full border-0 md:h-80"
          loading="lazy"
        />
      </div>
      {locations.length > 0 && (
        <div className="mt-3 space-y-2">
          {locations.map((loc) => (
            <div
              key={`${loc.driverId}-${loc.recordedAt}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="font-medium">Driver {loc.driverId.slice(0, 8)}…</span>
              <span className="text-muted-foreground">
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
