'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OutreachMapPointDto } from '@church-hub/shared-types';
import Link from 'next/link';

export function OutreachMapInner({ points }: { points: OutreachMapPointDto[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(ref.current).setView([points[0].latitude, points[0].longitude], 11);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    for (const p of points) {
      const marker = L.circleMarker([p.latitude, p.longitude], { radius: 6 });
      const label = `${p.firstName} ${p.lastName ?? ''}`.trim();
      const link = p.followUpId
        ? `<a href="/dashboard/establishment?followUpId=${encodeURIComponent(p.followUpId)}">Open Establishment</a>`
        : '';
      marker.bindPopup(`<strong>${label}</strong><br/>${p.capturedAt.slice(0, 10)}<br/>${link}`);
      marker.addTo(map);
    }
    map.fitBounds(bounds, { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points]);

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-64 w-full rounded-md border" />
      <p className="text-xs text-muted-foreground">
        {points.length} point(s) —{' '}
        <Link href="/dashboard/establishment" className="text-primary hover:underline">
          Establishment
        </Link>
      </p>
    </div>
  );
}