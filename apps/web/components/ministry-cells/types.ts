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
  latestAttendance?: { presentCount: number; weekStart: string } | null;
  members?: BranchListMember[];
  leader: { id: string; name: string; email: string } | null;
}

export interface MinistryCellsContext {
  role: 'admin' | 'pastor' | 'provincialLeader' | 'cellLeader' | 'none';
  leaderBranchId: string | null;
  leaderProvinceId: string | null;
  isDeputy?: boolean;
  deputyRole?: 'ASSISTANT' | 'SECRETARY' | null;
  deputyBranchIds?: string[];
  deputyProvinceIds?: string[];
  canManage: boolean;
  canAssignDeputies?: boolean;
  canViewAnalytics: boolean;
}

export type CellDeputyRow = {
  id: string;
  role: 'ASSISTANT' | 'SECRETARY';
  user: { id: string; name: string; email: string };
};

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
  deputies?: CellDeputyRow[];
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
  assignedAt?: string;
  leader: { id: string; name: string; email: string; phone?: string | null };
  deputies?: CellDeputyRow[];
}

export type MinistryCellsTab = 'branches' | 'analytics' | 'province';
