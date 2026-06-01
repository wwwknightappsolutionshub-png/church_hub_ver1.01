import { z } from 'zod';

export const ClassEnrollmentStatusSchema = z.enum([
  'ENROLLED',
  'IN_PROGRESS',
  'COMPLETED',
  'WITHDRAWN',
]);

export const AttendanceScopeSchema = z.enum(['SERVICE', 'FAMILY', 'DEPARTMENT']);

export const CreateClassEnrollmentSchema = z.object({
  memberId: z.string().uuid(),
  classDefinitionId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  status: ClassEnrollmentStatusSchema.optional(),
});

export const RecordAttendanceSchema = z.object({
  memberId: z.string().uuid(),
  scope: AttendanceScopeSchema,
  serviceDate: z.string(),
  present: z.boolean().optional(),
  churchServiceId: z.string().uuid().optional(),
  serviceUnitId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const BulkAttendanceSchema = z.object({
  scope: AttendanceScopeSchema,
  serviceDate: z.string(),
  churchServiceId: z.string().uuid().optional(),
  serviceUnitId: z.string().uuid().optional(),
  familyId: z.string().uuid().optional(),
  entries: z.array(
    z.object({
      memberId: z.string().uuid(),
      present: z.boolean(),
      notes: z.string().max(500).optional(),
    }),
  ),
});

export type TimelineEventDto = {
  id: string;
  type: string;
  title: string;
  summary: string;
  at: string;
  metadata?: Record<string, unknown>;
};
