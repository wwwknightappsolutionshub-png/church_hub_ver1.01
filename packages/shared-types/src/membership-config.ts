import { z } from 'zod';

export const ChurchServiceSchema = z.object({
  id: z.string().uuid(),
  churchId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  startTime: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export const CreateChurchServiceSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().max(16).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const MembershipClassDefinitionSchema = z.object({
  id: z.string().uuid(),
  churchId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export const CreateMembershipClassDefinitionSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type ChurchServiceDto = z.infer<typeof ChurchServiceSchema>;
export type CreateChurchServiceDto = z.infer<typeof CreateChurchServiceSchema>;
export type MembershipClassDefinitionDto = z.infer<typeof MembershipClassDefinitionSchema>;
export type CreateMembershipClassDefinitionDto = z.infer<
  typeof CreateMembershipClassDefinitionSchema
>;
