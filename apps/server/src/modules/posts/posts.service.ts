import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { ListPostsDto } from "./dto/list-posts.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const postSelect = {
  id: true,
  title: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPostsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 50);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: postSelect,
      }),
      this.prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, status: "PUBLISHED" },
      select: postSelect,
    });
    if (!post) {
      throw new NotFoundException("动态不存在或已删除");
    }
    return post;
  }

  async create(authorId: number, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        authorId,
        title: dto.title?.trim() || null,
        content: dto.content.trim(),
      },
      select: postSelect,
    });
  }

  async update(user: AuthUser, id: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    });
    if (!post || post.status === "DELETED") {
      throw new NotFoundException("动态不存在或已删除");
    }
    if (post.authorId !== user.sub && user.role !== "ADMIN") {
      throw new ForbiddenException("只能修改自己的动态");
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
      },
      select: postSelect,
    });
  }

  async remove(user: AuthUser, id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    });
    if (!post || post.status === "DELETED") {
      throw new NotFoundException("动态不存在或已删除");
    }
    if (post.authorId !== user.sub && user.role !== "ADMIN") {
      throw new ForbiddenException("只能删除自己的动态");
    }
    await this.prisma.post.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }
}
