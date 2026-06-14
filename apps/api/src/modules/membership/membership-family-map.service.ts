import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

export interface FamilyMapPinDto {
  id: string;
  name: string;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  address?: string | null;
  memberCount: number;
  lat: number;
  lng: number;
}

interface GeocodeResult {
  lat: number;
  lng: number;
}

@Injectable()
export class MembershipFamilyMapService {
  private readonly logger = new Logger(MembershipFamilyMapService.name);
  private readonly geocodeCache = new Map<string, GeocodeResult | null>();

  constructor(private readonly prisma: PrismaService) {}

  async getFamilyMapPins(churchId: string): Promise<{ pins: FamilyMapPinDto[]; skipped: number }> {
    const families = await this.prisma.family.findMany({
      where: { churchId, isActive: true, zip: { not: null } },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        zip: true,
        country: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    const pins: FamilyMapPinDto[] = [];
    let skipped = 0;

    for (const family of families) {
      const zip = family.zip?.trim();
      if (!zip) {
        skipped++;
        continue;
      }

      const geo = await this.geocodePostCode({
        zip,
        city: family.city,
        country: family.country,
      });

      if (!geo) {
        skipped++;
        continue;
      }

      pins.push({
        id: family.id,
        name: family.name,
        city: family.city,
        zip: family.zip,
        country: family.country,
        address: family.address,
        memberCount: family._count.members,
        lat: geo.lat,
        lng: geo.lng,
      });
    }

    return { pins, skipped };
  }

  private cacheKey(parts: { zip: string; city?: string | null; country?: string | null }): string {
    return [parts.zip.toLowerCase(), parts.city?.toLowerCase() ?? '', parts.country?.toLowerCase() ?? ''].join('|');
  }

  private async geocodePostCode(parts: {
    zip: string;
    city?: string | null;
    country?: string | null;
  }): Promise<GeocodeResult | null> {
    const key = this.cacheKey(parts);
    if (this.geocodeCache.has(key)) {
      return this.geocodeCache.get(key) ?? null;
    }

    const query = [parts.zip, parts.city, parts.country].filter(Boolean).join(', ');
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'ChurchHub/1.0 (membership-family-map)' },
      });

      if (!res.ok) {
        this.geocodeCache.set(key, null);
        return null;
      }

      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!data.length) {
        this.geocodeCache.set(key, null);
        return null;
      }

      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      this.geocodeCache.set(key, result);
      return result;
    } catch (err) {
      this.logger.warn(`Geocode failed for "${query}": ${String(err)}`);
      this.geocodeCache.set(key, null);
      return null;
    }
  }
}
