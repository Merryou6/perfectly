import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "./current-user.decorator";

interface TokenPayload extends AuthUser {
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("请先登录");
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(
        authorization.slice(7),
      );
    } catch {
      throw new UnauthorizedException("登录已过期，请重新登录");
    }
    if (!payload.sessionId) {
      throw new UnauthorizedException("登录状态已失效，请重新登录");
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            username: true,
            role: true,
            status: true,
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== "ACTIVE" ||
      session.userId !== payload.sub
    ) {
      throw new UnauthorizedException("登录状态已失效，请重新登录");
    }

    request.user = {
      sub: session.userId,
      username: session.user.username,
      role: session.user.role,
      sessionId: payload.sessionId,
    };
    return true;
  }
}
