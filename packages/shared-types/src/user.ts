import { z } from "zod";
import { Role } from "./enums";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum([Role.ADMIN, Role.USER]).default(Role.USER),
  timezone: z.string().default("UTC"),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum([Role.ADMIN, Role.USER]).optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changeUserPasswordSchema = z.object({
  password: z.string().min(6),
});
export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([Role.ADMIN, Role.USER]),
  timezone: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [25, 50, 100].includes(n), { message: "pageSize must be 25, 50, or 100" })
    .default(25),
  search: z.string().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});
export type UserListQuery = z.input<typeof userListQuerySchema>;

export const paginatedUsersSchema = z.object({
  items: z.array(userSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;
