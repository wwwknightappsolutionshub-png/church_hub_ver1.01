import { z } from 'zod';
import { MemberRoleSchema, MemberStatusSchema } from './enums';

export const CreateMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  dateOfBirth: z.string().datetime().optional(),
  roles: z.array(MemberRoleSchema).default(['ADULT']),
  status: MemberStatusSchema.default('VISITOR'),
  familyId: z.string().uuid().optional(),
  ministryInterests: z.array(z.string()).default([]),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;

export const UpdateMemberSchema = CreateMemberSchema.partial();
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;

export const CreateFamilySchema = z.object({
  name: z.string().min(1).max(200),
  headMemberId: z.string().uuid().optional(),
});
export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;
