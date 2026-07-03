import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  note: z.string().optional(),
  dailyWorkHours: z.number().positive().nullable().optional(),
  includeSaturdays: z.boolean().nullable().optional(),
  includeSundays: z.boolean().nullable().optional(),
  defaultHourlyRate: z.number().nonnegative().nullable().optional(),
  defaultCurrency: z.string().length(3).nullable().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  note: z.string().nullable(),
  dailyWorkHours: z.number().nullable(),
  includeSaturdays: z.boolean().nullable(),
  includeSundays: z.boolean().nullable(),
  defaultHourlyRate: z.number().nullable(),
  defaultCurrency: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Client = z.infer<typeof clientSchema>;
