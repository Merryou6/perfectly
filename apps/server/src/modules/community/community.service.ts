import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CommunityDetail,
  CommunitySummary,
  CommunityViewerState,
  JoinCommunityResult,
} from "@perfectly/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { JoinCommunityDto } from "./dto/join-community.dto";
import { ListCommunitiesDto } from "./dto/list-communities.dto";

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  ownerId: true,
  joinApprovalRequired: true,
  memberPostingOnly: true,
  status: true,
  createdAt: true,
  _count: {
    select: {
      members: { where: { status: "APPROVED" as const } },
      posts: { where: { status: "PUBLISHED" as const } },
    },
  },
} as const;

type CommunityRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  ownerId: number;
  joinApprovalRequired: boolean;
  memberPostingOnly: boolean;
  status: "NORMAL" | "FROZEN" | "ARCHIVED";
  createdAt: Date;
  _count: { members: number; posts: number };
};

function toSummary(community: CommunityRow): CommunitySummary {
  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description,
    ownerId: community.ownerId,
    joinApprovalRequired: community.joinApprovalRequired,
    memberPostingOnly: community.memberPostingOnly,
    status: community.status,
    memberCount: community._count.members,
    postCount: community._count.posts,
    createdAt: community.createdAt.toISOString(),
  };
}

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCommunitiesDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = { status: "NORMAL" as const };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: communitySelect,
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      items: items.map((item) => toSummary(item)),
      total,
      page,
      pageSize,
    };
  }

  async get(id: number): Promise<CommunityDetail> {
    const community = await this.prisma.community.findFirst({
      where: { id, status: "NORMAL" },
      select: {
        ...communitySelect,
        sections: {
          where: { status: "NORMAL" },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            communityId: true,
            name: true,
            sortOrder: true,
          },
        },
      },
    });
    if (!community) {
      throw new NotFoundException("社区不存在或已停用");
    }

    return {
      ...toSummary(community),
      sections: community.sections,
    };
  }

  async getViewerState(
    communityId: number,
    userId: number,
  ): Promise<CommunityViewerState> {
    await this.assertCommunityExists(communityId);
    const [membership, joinRequest] = await this.prisma.$transaction([
      this.prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId } },
        select: { id: true, role: true, status: true },
      }),
      this.prisma.communityJoinRequest.findFirst({
        where: { communityId, userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true },
      }),
    ]);

    return {
      membership,
      joinRequest: joinRequest
        ? {
            id: joinRequest.id,
            status: joinRequest.status,
            createdAt: joinRequest.createdAt.toISOString(),
          }
        : null,
    };
  }

  async join(
    communityId: number,
    user: AuthUser,
    dto: JoinCommunityDto,
  ): Promise<JoinCommunityResult> {
    const community = await this.assertCommunityExists(communityId);
    const existingMembership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: user.sub } },
      select: { id: true, role: true, status: true },
    });

    if (existingMembership?.status === "APPROVED") {
      return { membership: existingMembership, joinRequest: null };
    }

    const shouldApprove =
      user.role === "ADMIN" ||
      community.ownerId === user.sub ||
      !community.joinApprovalRequired;

    if (shouldApprove) {
      const [membership] = await this.prisma.$transaction([
        this.prisma.communityMember.upsert({
          where: { communityId_userId: { communityId, userId: user.sub } },
          update: {
            role: community.ownerId === user.sub ? "ADMIN" : "MEMBER",
            status: "APPROVED",
            joinedAt: new Date(),
          },
          create: {
            communityId,
            userId: user.sub,
            role: community.ownerId === user.sub ? "ADMIN" : "MEMBER",
            status: "APPROVED",
            joinedAt: new Date(),
          },
          select: { id: true, role: true, status: true },
        }),
        this.prisma.communityJoinRequest.updateMany({
          where: { communityId, userId: user.sub, status: "PENDING" },
          data: { status: "CANCELLED" },
        }),
      ]);
      return { membership, joinRequest: null };
    }

    const pendingRequest = await this.prisma.communityJoinRequest.findFirst({
      where: { communityId, userId: user.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true },
    });
    const joinRequest =
      pendingRequest ??
      (await this.prisma.communityJoinRequest.create({
        data: {
          communityId,
          userId: user.sub,
          reason: dto.reason?.trim() || null,
        },
        select: { id: true, status: true, createdAt: true },
      }));

    return {
      membership: existingMembership,
      joinRequest: {
        id: joinRequest.id,
        status: joinRequest.status,
        createdAt: joinRequest.createdAt.toISOString(),
      },
    };
  }

  private async assertCommunityExists(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException("社区 ID 不合法");
    }
    const community = await this.prisma.community.findFirst({
      where: { id, status: "NORMAL" },
      select: { id: true, ownerId: true, joinApprovalRequired: true },
    });
    if (!community) {
      throw new NotFoundException("社区不存在或已停用");
    }
    return community;
  }
}
