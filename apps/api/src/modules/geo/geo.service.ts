import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sanitizeUkPostcode, UK_POSTCODE_REGEX } from '@church-hub/shared-types';

export interface PostcodeLookupResult {
  postcode: string;
  latitude: number;
  longitude: number;
  adminDistrict: string | null;
  parish: string | null;
  region: string | null;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly base = 'https://api.postcodes.io';

  async lookupPostcode(raw: string): Promise<PostcodeLookupResult> {
    const postcode = sanitizeUkPostcode(raw);
    if (!UK_POSTCODE_REGEX.test(postcode)) {
      throw new BadRequestException('Enter a valid UK postcode');
    }

    const encoded = encodeURIComponent(postcode.replace(/\s+/g, ''));
    let res: Response;
    try {
      res = await fetch(`${this.base}/postcodes/${encoded}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
    } catch (err) {
      this.logger.warn(`postcodes.io lookup failed: ${err instanceof Error ? err.message : err}`);
      throw new ServiceUnavailableException('Postcode lookup is temporarily unavailable');
    }

    if (res.status === 404) {
      throw new NotFoundException('Postcode not found');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('Postcode lookup is temporarily unavailable');
    }

    const body = (await res.json()) as {
      result?: {
        postcode?: string;
        latitude?: number;
        longitude?: number;
        admin_district?: string | null;
        parish?: string | null;
        region?: string | null;
      };
    };
    const r = body.result;
    if (
      !r?.postcode ||
      typeof r.latitude !== 'number' ||
      typeof r.longitude !== 'number'
    ) {
      throw new NotFoundException('Postcode not found');
    }

    return {
      postcode: r.postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      adminDistrict: r.admin_district ?? null,
      parish: r.parish ?? null,
      region: r.region ?? null,
    };
  }

  async autocompletePostcode(partial: string): Promise<string[]> {
    const q = sanitizeUkPostcode(partial).replace(/\s+/g, '');
    if (q.length < 2 || q.length > 8) return [];

    let res: Response;
    try {
      res = await fetch(`${this.base}/postcodes/${encodeURIComponent(q)}/autocomplete`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      return [];
    }
    if (!res.ok) return [];
    const body = (await res.json()) as { result?: string[] | null };
    return (body.result ?? []).slice(0, 8).map((p) => sanitizeUkPostcode(p));
  }
}
