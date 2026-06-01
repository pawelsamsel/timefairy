import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  note: z.string().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Client = z.infer<typeof clientSchema>;
