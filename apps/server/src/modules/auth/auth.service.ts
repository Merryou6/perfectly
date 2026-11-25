import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRole, UserStatus } from "@perfectly/contracts";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import type { ChangePasswordDto } from "../user/dto/change-password.dto";
import type { AuthUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

const SESSION_SECONDS = 7200;

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    this.assertPasswordPolicy(dto.password);
    const username = dto.username.trim();
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException("用户名已被占用");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName: dto.displayName?.trim() || username,
      },
      select: publicUserSelect,
    });
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });
    if (!user) {
      throw new UnauthorizedException("用户名或密码错误");
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("账号当前不可用");
    }

    const { passwordHash: _, ...safeUser } = user;
    return this.issueSession(safeUser);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("登录状态已失效");
    }
    return user;
  }

  async logout(user: AuthUser) {
    await this.prisma.authSession.updateMany({
      where: {
        id: user.sessionId,
        userId: user.sub,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    this.assertPasswordPolicy(dto.newPassword);
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { passwordHash: true },
    });
    if (!currentUser) {
      throw new UnauthorizedException("登录状态已失效");
    }

    const valid = await bcrypt.compare(dto.oldPassword, currentUser.passwordHash);
    if (!valid) {
      throw new BadRequestException("原密码不正确");
    }
    if (await bcrypt.compare(dto.newPassword, currentUser.passwordHash)) {
      throw new BadRequestException("新密码不能与原密码相同");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.sub },
        data: { passwordHash },
        select: publicUserSelect,
      });
      await tx.authSession.updateMany({
        where: { userId: updated.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
    return this.issueSession(updatedUser);
  }

  private async issueSession(user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
  }) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
      },
    });
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      sessionId,
    });
    return {
      token,
      expiresIn: SESSION_SECONDS,
      user,
    };
  }

  private assertPasswordPolicy(password: string) {
    const categories = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    if (categories < 2) {
      throw new BadRequestException(
        "密码至少包含小写字母、大写字母、数字、特殊符号中的两类",
      );
    }
  }
}
