import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

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

  private async issueSession(user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "DISABLED" | "DELETED";
    createdAt: Date;
  }) {
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return {
      token,
      expiresIn: 7200,
      user,
    };
  }
}
