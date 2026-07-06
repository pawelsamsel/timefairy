import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #00509d");

export const createProjectSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  color: hexColor.default("#00509d"),
  hourlyRate: z.number().nonnegative(),
  currency: z.string().length(3),
  isBillable: z.boolean().default(true),
  note: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  hourlyRate: z.number(),
  currency: z.string(),
  isBillable: z.boolean(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof projectSchema>;
