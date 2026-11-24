/** Outreach campaigns, command centre, scorecard, map — v1.08 */

export type OutreachCaptureSourceDto =
  | 'MANUAL'
  | 'SYNC'
  | 'IMPORT'
  | 'PUBLIC_QR';

export interface OutreachCampaignDto {
  id: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface OutreachDuplicateMatchDto {
  followUpId: string;
  contactName: string;
  stage: string;
  outreachContactId?: string | null;
  capturedAt?: string | null;
}

export interface OutreachDuplicatesDto {
  matches: OutreachDuplicateMatchDto[];
}

export interface OutreachCommandCentreRowDto {
  id: string;
  firstName: string;
  lastName?: string | null;
  capturedAt: string;
  captureSource: OutreachCaptureSourceDto;
  campaignId?: string | null;
  campaignName?: string | null;
  followUpId?: string | null;
  establishmentStage?: string | null;
  assignedToName?: string | null;
  handoffHours?: number | null;
  stuck: boolean;
  welcomeSent: boolean;
  hasGeo: boolean;
}

export interface OutreachCommandCentreDto {
  from: string;
  to: string;
  summary: {
    total: number;
    withFollowUp: number;
    stuck: number;
    bySource: Record<OutreachCaptureSourceDto, number>;
  };
  rows: OutreachCommandCentreRowDto[];
}

export interface OutreachTeamScoreRowDto {
  evangelistId?: string | null;
  label: string;
  captures: number;
  qrAttributed: number;
  welcomeSent: number;
  withFollowUp: number;
  firstProgressWithin72h: number;
  firstProgressRate: number;
}

export interface OutreachTeamScorecardDto {
  from: string;
  to: string;
  rows: OutreachTeamScoreRowDto[];
}

export interface OutreachMapPointDto {
  id: string;
  latitude: number;
  longitude: number;
  locationLabel?: string | null;
  capturedAt: string;
  followUpId?: string | null;
  establishmentStage?: string | null;
  firstName: string;
  lastName?: string | null;
}