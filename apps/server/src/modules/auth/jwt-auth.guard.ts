import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AuthUser } from "./current-user.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("请先登录");
    }

    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(
        authorization.slice(7),
      );
      return true;
    } catch {
      throw new UnauthorizedException("登录已过期，请重新登录");
    }
  }
}
