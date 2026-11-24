import { z } from 'zod';

/** Non-negative whole number only — rejects decimals, floats, and non-numeric strings. */
export const WholeNonNegIntSchema = z.union([
  z
    .number({ invalid_type_error: 'Must be a whole number' })
    .int('Must be a whole number')
    .nonnegative('Must be zero or greater'),
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Must be a whole number')
    .transform((v) => Number(v)),
]);

const optionalWhole = WholeNonNegIntSchema.optional();

export const RecordCellAttendanceSchema = z
  .object({
    weekStart: z.string().trim().min(1).optional(),
    meetingDate: z.string().trim().min(1).optional(),
    presentCount: optionalWhole,
    absentCount: optionalWhole,
    maleCount: optionalWhole,
    femaleCount: optionalWhole,
    boysCount: optionalWhole,
    girlsCount: optionalWhole,
    testifiersCount: optionalWhole,
    firstTimersCount: optionalWhole,
    notes: z.string().trim().max(2000).optional(),
    meetingId: z.string().trim().min(1).optional(),
  })
  .strict();

export type RecordCellAttendanceInput = z.infer<typeof RecordCellAttendanceSchema>;

export const UpdateCellAttendanceSchema = RecordCellAttendanceSchema;

export type UpdateCellAttendanceInput = z.infer<typeof UpdateCellAttendanceSchema>;
