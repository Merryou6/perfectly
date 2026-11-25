import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PermissionService } from "../../common/permissions/permission.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { CreatePostDto } from "./dto/create-post.dto";
import { ListPostsDto } from "./dto/list-posts.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const postSelect = {
  id: true,
  title: true,
  body: true,
  postType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  community: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  section: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

function serializePost<
  T extends { body: string | null; createdAt: Date; updatedAt: Date },
>(post: T) {
  return {
    ...post,
    body: post.body ?? "",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async list(query: ListPostsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = {
      status: "PUBLISHED" as const,
      ...(query.communityId ? { communityId: query.communityId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: postSelect,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: items.map(serializePost),
      total,
      page,
      pageSize,
    };
  }

  async get(id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, status: "PUBLISHED" },
      select: postSelect,
    });
    if (!post) {
      throw new NotFoundException("帖子不存在或已删除");
    }
    return serializePost(post);
  }

  async create(authorId: number, user: AuthUser, dto: CreatePostDto) {
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException("帖子正文不能为空");
    }

    const community = await this.prisma.community.findFirst({
      where: { id: dto.communityId, status: "NORMAL" },
      select: {
        id: true,
        ownerId: true,
        memberPostingOnly: true,
        status: true,
      },
    });
    if (!community) {
      throw new NotFoundException("社区不存在或已停用");
    }
    await this.permissions.assertCanPost(user, community);

    const section = await this.prisma.section.findFirst({
      where: {
        id: dto.sectionId,
        communityId: dto.communityId,
        status: "NORMAL",
      },
      select: { id: true },
    });
    if (!section) {
      throw new BadRequestException("分区不属于当前社区或不可用");
    }

    const post = await this.prisma.post.create({
      data: {
        authorId,
        communityId: dto.communityId,
        sectionId: dto.sectionId,
        title: dto.title?.trim() || null,
        body,
      },
      select: postSelect,
    });
    return serializePost(post);
  }

  async update(user: AuthUser, id: number, dto: UpdatePostDto) {
    if (dto.title === undefined && dto.body === undefined) {
      throw new BadRequestException("没有需要更新的内容");
    }

    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        communityId: true,
        status: true,
      },
    });
    if (!post || post.status === "DELETED") {
      throw new NotFoundException("帖子不存在或已删除");
    }
    const canManage = await this.permissions.canManageCommunity(
      user,
      post.communityId,
    );
    if (post.authorId !== user.sub && !canManage) {
      throw new ForbiddenException("只能修改自己发布的帖子");
    }

    const body = dto.body?.trim();
    if (dto.body !== undefined && !body) {
      throw new BadRequestException("帖子正文不能为空");
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(body !== undefined ? { body } : {}),
      },
      select: postSelect,
    });
    return serializePost(updated);
  }

  async remove(user: AuthUser, id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        communityId: true,
        status: true,
      },
    });
    if (!post || post.status === "DELETED") {
      throw new NotFoundException("帖子不存在或已删除");
    }
    const canManage = await this.permissions.canManageCommunity(
      user,
      post.communityId,
    );
    if (post.authorId !== user.sub && !canManage) {
      throw new ForbiddenException("只能删除自己发布的帖子");
    }
    await this.prisma.post.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }
}
