import type { BranchListMember } from '@/components/ministry-cells/CellBranchMembersSheet';

export interface BranchProvinceSummary {
  id: string;
  name: string;
  leader: { id: string; name: string; email: string } | null;
}

export interface BranchRow {
  id: string;
  name: string;
  location: string | null;
  postcode: string | null;
  provinceId: string | null;
  province: BranchProvinceSummary | null;
  createdAt: string;
  memberCount: number;
  incidentCount: number;
  members?: BranchListMember[];
  leader: { id: string; name: string; email: string } | null;
}

export interface MinistryCellsContext {
  role: 'admin' | 'pastor' | 'provincialLeader' | 'cellLeader' | 'none';
  leaderBranchId: string | null;
  leaderProvinceId: string | null;
  canManage: boolean;
  canViewAnalytics: boolean;
}

export interface BranchDetail {
  id: string;
  name: string;
  location: string | null;
  postcode: string | null;
  provinceId: string | null;
  province: BranchProvinceSummary | null;
  createdAt?: string;
  memberCount: number;
  leader: { id: string; name: string; email: string } | null;
  members: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    joinedAt: string;
  }[];
  latestAttendance: { presentCount: number; weekStart: string } | null;
  openIncidents: number;
  openPrayers: number;
}

export interface FormDef {
  id: string;
  kind: string;
  name: string;
  fields: { key: string; label: string; type: string; required?: boolean; options?: string[] }[];
}

export interface TeachingResource {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  fileUrl: string | null;
}

export interface CellProvinceRow {
  id: string;
  name: string;
  postcodes: string[];
  branchCount: number;
  createdAt: string;
  updatedAt: string;
  leader: { id: string; name: string; email: string };
}

export type MinistryCellsTab = 'branches' | 'analytics' | 'province';
