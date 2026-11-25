import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CommunityStatus } from "@perfectly/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../../modules/auth/current-user.decorator";

interface PostingCommunity {
  id: number;
  ownerId: number;
  memberPostingOnly: boolean;
  status: CommunityStatus;
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async canManageCommunity(user: AuthUser, communityId: number) {
    if (user.role === "ADMIN") return true;

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });
    if (community?.ownerId === user.sub) return true;

    const membership = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId: user.sub },
      },
      select: { role: true, status: true },
    });
    return membership?.status === "APPROVED" && membership.role === "ADMIN";
  }

  async assertCanManageCommunity(user: AuthUser, communityId: number) {
    if (!(await this.canManageCommunity(user, communityId))) {
      throw new ForbiddenException("只有社区管理员可以执行此操作");
    }
  }

  async assertCanPost(user: AuthUser, community: PostingCommunity) {
    if (community.status !== "NORMAL") {
      throw new ForbiddenException("社区当前不可发布内容");
    }
    if (user.role === "ADMIN" || community.ownerId === user.sub) return;
    if (!community.memberPostingOnly) return;

    const membership = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: user.sub,
        },
      },
      select: { status: true },
    });
    if (membership?.status !== "APPROVED") {
      throw new ForbiddenException("加入社区后才能发布帖子");
    }
  }
}
