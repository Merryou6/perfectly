import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UserRole } from "@perfectly/contracts";
import type { Request } from "express";

export interface AuthUser {
  sub: number;
  username: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);
