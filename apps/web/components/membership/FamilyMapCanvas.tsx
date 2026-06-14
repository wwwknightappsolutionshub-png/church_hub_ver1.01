'use client';

import { useEffect, useRef } from 'react';
import type { FamilyMapPinDto } from '@church-hub/shared-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  pins: FamilyMapPinDto[];
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function FamilyMapCanvas({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([54.5, -2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (!pins.length) return;

    const bounds = L.latLngBounds([]);
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: defaultIcon }).addTo(map);
      const lines = [
        `<strong>${pin.name}</strong>`,
        pin.address,
        [pin.city, pin.zip].filter(Boolean).join(', '),
        pin.memberCount ? `${pin.memberCount} member(s)` : null,
      ]
        .filter(Boolean)
        .join('<br/>');
      marker.bindPopup(lines);
      bounds.extend([pin.lat, pin.lng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    }
  }, [pins]);

  return (
    <div
      ref={containerRef}
      className="h-[min(70vh,520px)] w-full rounded-lg border border-border"
      data-testid="family-map-canvas"
    />
  );
}
