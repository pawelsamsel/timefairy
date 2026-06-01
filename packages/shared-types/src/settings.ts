import { z } from "zod";

export const systemSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const updateSystemSettingsSchema = systemSettingsSchema.partial();
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
