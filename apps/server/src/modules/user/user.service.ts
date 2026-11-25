import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.displayName === undefined && dto.avatarUrl === undefined) {
      throw new BadRequestException("没有需要更新的资料");
    }

    const displayName = dto.displayName?.trim();
    if (dto.displayName !== undefined && !displayName) {
      throw new BadRequestException("昵称不能为空");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(dto.avatarUrl !== undefined
          ? { avatarUrl: dto.avatarUrl?.trim() || null }
          : {}),
      },
      select: profileSelect,
    });
  }
}
