import { z } from "zod";
import { LaneType } from "./enums";

export const createLaneSchema = z.object({
  name: z.string().min(1),
  type: z.enum([LaneType.LOGGED, LaneType.PLANNED, LaneType.EVENTS, LaneType.CUSTOM]),
  color: z.string().default("#00509d"),
  sortOrder: z.number().int().default(0),
});
export type CreateLaneInput = z.infer<typeof createLaneSchema>;

export const updateLaneSchema = createLaneSchema.partial();
export type UpdateLaneInput = z.infer<typeof updateLaneSchema>;

export const laneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([LaneType.LOGGED, LaneType.PLANNED, LaneType.EVENTS, LaneType.CUSTOM]),
  isDefault: z.boolean(),
  color: z.string(),
  sortOrder: z.number(),
});
export type Lane = z.infer<typeof laneSchema>;
