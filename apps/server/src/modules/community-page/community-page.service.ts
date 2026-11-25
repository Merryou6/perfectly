import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CommunityPageDraftState,
  CommunityPageSchema,
  PageVersionSummary,
  PublishedCommunityPage,
} from "@perfectly/contracts";
import { PermissionService } from "../../common/permissions/permission.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { PublishPageSchemaDto, RollbackPageDto } from "./dto/save-page-schema.dto";
import {
  defaultCommunityPageSchema,
  safeCommunityPageSchema,
  validateCommunityPageSchema,
} from "./page-schema.validator";

const PAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

const versionSelect = {
  id: true,
  versionNo: true,
  status: true,
  changeSummary: true,
  publishedAt: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      displayName: true,
    },
  },
} as const;

@Injectable()
export class CommunityPageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async getPublished(
    communityId: number,
    pageKey: string,
  ): Promise<PublishedCommunityPage | null> {
    this.validatePageKey(pageKey);
    const page = await this.prisma.communityPage.findUnique({
      where: { communityId_pageKey: { communityId, pageKey } },
      select: {
        id: true,
        pageKey: true,
        currentVersion: {
          select: {
            versionNo: true,
            schemaJson: true,
            publishedAt: true,
          },
        },
      },
    });
    if (!page?.currentVersion?.publishedAt) return null;

    const fallback = defaultCommunityPageSchema({
      name: "社区",
      description: "社区页面正在完善。",
    });
    return {
      pageId: page.id,
      pageKey: page.pageKey,
      versionNo: page.currentVersion.versionNo,
      schema: safeCommunityPageSchema(page.currentVersion.schemaJson, fallback),
      publishedAt: page.currentVersion.publishedAt.toISOString(),
    };
  }

  async getDraftState(
    communityId: number,
    pageKey: string,
    user: AuthUser,
  ): Promise<CommunityPageDraftState> {
    this.validatePageKey(pageKey);
    await this.permissions.assertCanManageCommunity(user, communityId);
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { name: true, description: true },
    });
    if (!community) throw new NotFoundException("社区不存在");

    const page = await this.prisma.communityPage.findUnique({
      where: { communityId_pageKey: { communityId, pageKey } },
      select: {
        id: true,
        pageKey: true,
        draftSchema: true,
        currentVersion: {
          select: {
            id: true,
            versionNo: true,
            schemaJson: true,
            publishedAt: true,
          },
        },
        versions: {
          orderBy: { versionNo: "desc" },
          take: 12,
          select: versionSelect,
        },
      },
    });

    const fallback = defaultCommunityPageSchema(community);
    const publishedSchema = page?.currentVersion?.schemaJson
      ? safeCommunityPageSchema(page.currentVersion.schemaJson, fallback)
      : null;
    const draftSchema = page?.draftSchema
      ? safeCommunityPageSchema(page.draftSchema, publishedSchema ?? fallback)
      : publishedSchema ?? fallback;

    return {
      pageId: page?.id ?? null,
      pageKey,
      draftSchema,
      published:
        page?.currentVersion?.publishedAt
          ? {
              pageId: page.id,
              pageKey,
              versionNo: page.currentVersion.versionNo,
              schema: publishedSchema ?? fallback,
              publishedAt: page.currentVersion.publishedAt.toISOString(),
            }
          : null,
      versions: page?.versions.map((version) => this.toVersionSummary(version)) ?? [],
    };
  }

  async saveDraft(
    communityId: number,
    pageKey: string,
    user: AuthUser,
    schemaInput: unknown,
  ) {
    this.validatePageKey(pageKey);
    await this.permissions.assertCanManageCommunity(user, communityId);
    const schema = validateCommunityPageSchema(schemaInput);
    await this.prisma.communityPage.upsert({
      where: { communityId_pageKey: { communityId, pageKey } },
      update: { draftSchema: schema as unknown as object },
      create: {
        communityId,
        pageKey,
        draftSchema: schema as unknown as object,
      },
    });
    return this.getDraftState(communityId, pageKey, user);
  }

  async publish(
    communityId: number,
    pageKey: string,
    user: AuthUser,
    dto: PublishPageSchemaDto,
  ) {
    this.validatePageKey(pageKey);
    await this.permissions.assertCanManageCommunity(user, communityId);
    const schema = validateCommunityPageSchema(dto.schema);
    await this.publishSchema(
      communityId,
      pageKey,
      user.sub,
      schema,
      dto.changeSummary?.trim() || "发布社区卡片页面",
    );
    return this.getDraftState(communityId, pageKey, user);
  }

  async rollback(
    communityId: number,
    pageKey: string,
    user: AuthUser,
    dto: RollbackPageDto,
  ) {
    this.validatePageKey(pageKey);
    await this.permissions.assertCanManageCommunity(user, communityId);
    const page = await this.prisma.communityPage.findUnique({
      where: { communityId_pageKey: { communityId, pageKey } },
      select: { id: true },
    });
    if (!page) throw new NotFoundException("卡片页面不存在");

    const version = await this.prisma.communityPageVersion.findFirst({
      where: { id: dto.versionId, pageId: page.id },
      select: { versionNo: true, schemaJson: true },
    });
    if (!version) throw new NotFoundException("目标版本不存在");

    const schema = validateCommunityPageSchema(version.schemaJson);
    await this.publishSchema(
      communityId,
      pageKey,
      user.sub,
      schema,
      dto.changeSummary?.trim() || `回滚到版本 ${version.versionNo}`,
    );
    return this.getDraftState(communityId, pageKey, user);
  }

  private async publishSchema(
    communityId: number,
    pageKey: string,
    userId: number,
    schema: CommunityPageSchema,
    changeSummary: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const page = await tx.communityPage.upsert({
        where: { communityId_pageKey: { communityId, pageKey } },
        update: {},
        create: { communityId, pageKey },
        select: { id: true },
      });
      const current = await tx.communityPageVersion.aggregate({
        where: { pageId: page.id },
        _max: { versionNo: true },
      });
      const version = await tx.communityPageVersion.create({
        data: {
          pageId: page.id,
          versionNo: (current._max.versionNo ?? 0) + 1,
          schemaJson: schema as unknown as object,
          changeSummary,
          status: "PUBLISHED",
          createdById: userId,
          publishedAt: new Date(),
        },
        select: { id: true },
      });
      await tx.communityPage.update({
        where: { id: page.id },
        data: {
          currentVersionId: version.id,
          draftSchema: schema as unknown as object,
        },
      });
    });
  }

  private toVersionSummary(version: {
    id: number;
    versionNo: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    changeSummary: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    createdBy: { id: number; displayName: string };
  }): PageVersionSummary {
    return {
      id: version.id,
      versionNo: version.versionNo,
      status: version.status,
      changeSummary: version.changeSummary,
      createdBy: version.createdBy,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private validatePageKey(pageKey: string) {
    if (!PAGE_KEY_PATTERN.test(pageKey)) {
      throw new BadRequestException("页面标识不合法");
    }
  }
}
