import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

export type AuthPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type RequestUser = AuthPayload;
