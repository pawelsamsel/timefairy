import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const dayLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(ISO_DATE),
  note: z.string(),
  isDayOff: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DayLog = z.infer<typeof dayLogSchema>;

export const dayLogListQuerySchema = z.object({
  from: z.string().regex(ISO_DATE),
  to: z.string().regex(ISO_DATE),
});
export type DayLogListQuery = z.infer<typeof dayLogListQuerySchema>;

export const upsertDayLogSchema = z.object({
  note: z.string().max(50000).optional(),
  isDayOff: z.boolean().optional(),
});
export type UpsertDayLogInput = z.infer<typeof upsertDayLogSchema>;

export type DayLogState = {
  date: string;
  note: string;
  isDayOff: boolean | null;
};
