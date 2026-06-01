import { z } from "zod";
import { Role } from "./enums";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([Role.ADMIN, Role.USER]),
  timezone: z.string(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(6),
});
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;
