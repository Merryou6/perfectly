import path from "node:path";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcrypt";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/perfectly",
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 10);

  const demo = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash,
      displayName: "林晚",
    },
  });

  const momo = await prisma.user.upsert({
    where: { username: "momo" },
    update: {},
    create: {
      username: "momo",
      passwordHash,
      displayName: "Momo",
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "ADMIN" },
    create: {
      username: "admin",
      passwordHash,
      displayName: "平台管理员",
      role: "ADMIN",
    },
  });

  const newbie = await prisma.user.upsert({
    where: { username: "newbie" },
    update: {},
    create: {
      username: "newbie",
      passwordHash,
      displayName: "新同学",
    },
  });

  const cityWalk = await prisma.community.upsert({
    where: { slug: "city-walk" },
    update: {
      name: "城市漫游",
      description: "记录街道、光影和城市里不急着被定义的小事。",
      ownerId: momo.id,
      joinApprovalRequired: false,
      memberPostingOnly: true,
    },
    create: {
      name: "城市漫游",
      slug: "city-walk",
      description: "记录街道、光影和城市里不急着被定义的小事。",
      ownerId: momo.id,
      joinApprovalRequired: false,
      memberPostingOnly: true,
    },
  });

  const filmLab = await prisma.community.upsert({
    where: { slug: "film-and-light" },
    update: {
      name: "胶片与光",
      description: "关于拍摄、冲洗、构图和一台旧相机的日常。",
      ownerId: demo.id,
      joinApprovalRequired: true,
      memberPostingOnly: false,
    },
    create: {
      name: "胶片与光",
      slug: "film-and-light",
      description: "关于拍摄、冲洗、构图和一台旧相机的日常。",
      ownerId: demo.id,
      joinApprovalRequired: true,
      memberPostingOnly: false,
    },
  });

  await mergeLegacyDailySection(cityWalk.id);
  const daily = await ensureSection(cityWalk.id, "日常", 0);
  const routes = await ensureSection(cityWalk.id, "路线", 10);
  const gear = await ensureSection(filmLab.id, "器材", 0);
  const darkroom = await ensureSection(filmLab.id, "暗房", 10);

  await ensureMember(cityWalk.id, momo.id, "ADMIN");
  await ensureMember(cityWalk.id, demo.id, "MEMBER");
  await ensureMember(filmLab.id, demo.id, "ADMIN");
  await ensureMember(filmLab.id, momo.id, "MEMBER");
  await prisma.communityJoinRequest.deleteMany({
    where: { userId: newbie.id },
  });
  await prisma.communityMember.deleteMany({
    where: { userId: newbie.id },
  });

  await ensurePost(
    cityWalk.id,
    daily.id,
    demo.id,
    "雨停之后",
    "下班绕了一条远路。梧桐叶落得很慢，路边的修鞋摊还亮着灯。",
    18,
  );
  await ensurePost(
    cityWalk.id,
    routes.id,
    momo.id,
    "一条适合傍晚散步的路线",
    "从旧车站出发，沿河走到第二座桥，再拐进有面包店的小巷。全程大约四十分钟。",
    95,
  );
  await ensurePost(
    filmLab.id,
    gear.id,
    demo.id,
    "第一次尝试 400 度黑白卷",
    "颗粒比预想的明显，但在阴天反而很合适。准备周末再去试一卷。",
    220,
  );

  await ensureCommunityPage(cityWalk.id, momo.id, {
    version: 1,
    theme: { accent: "forest" },
    cards: [
      {
        id: "city-intro",
        type: "hero",
        title: "把城市走成一页手记",
        body: "这里收集街角、路线和那些值得停一下的瞬间。",
        action: null,
      },
      {
        id: "weekly-topic",
        type: "notice",
        title: "本周主题",
        body: "拍下你下班路上最想停留的一分钟，配一句当时的心情。",
        action: null,
      },
      {
        id: "community-stats",
        type: "stats",
        title: "社区正在发生",
        body: "成员和帖子数量来自真实社区数据。",
        action: null,
      },
      {
        id: "write-together",
        type: "action",
        title: "写下你的路线",
        body: "不需要完整攻略，一条有用的线索就够了。",
        action: "publish-post",
      },
    ],
  });
}

async function ensureSection(communityId: number, name: string, sortOrder: number) {
  const exact = await prisma.section.findFirst({
    where: { communityId, name },
  });
  const existing =
    exact ??
    (name === "日常"
      ? await prisma.section.findFirst({
          where: { communityId, name: "Daily" },
        })
      : null);
  if (existing) {
    return prisma.section.update({
      where: { id: existing.id },
      data: { name, sortOrder, status: "NORMAL" },
    });
  }
  return prisma.section.create({
    data: { communityId, name, sortOrder },
  });
}

async function mergeLegacyDailySection(communityId: number) {
  const [daily, legacy] = await Promise.all([
    prisma.section.findFirst({ where: { communityId, name: "日常" } }),
    prisma.section.findFirst({ where: { communityId, name: "Daily" } }),
  ]);
  if (!daily || !legacy) return;

  await prisma.post.updateMany({
    where: { sectionId: legacy.id },
    data: { sectionId: daily.id },
  });
  await prisma.section.delete({ where: { id: legacy.id } });
}

async function ensureMember(
  communityId: number,
  userId: number,
  role: "ADMIN" | "MEMBER",
) {
  return prisma.communityMember.upsert({
    where: { communityId_userId: { communityId, userId } },
    update: { role, status: "APPROVED", joinedAt: new Date() },
    create: {
      communityId,
      userId,
      role,
      status: "APPROVED",
      joinedAt: new Date(),
    },
  });
}

async function ensurePost(
  communityId: number,
  sectionId: number,
  authorId: number,
  title: string,
  body: string,
  minutesAgo: number,
) {
  const existing = await prisma.post.findFirst({
    where: { communityId, authorId, title },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.post.create({
    data: {
      communityId,
      sectionId,
      authorId,
      title,
      body,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    },
    select: { id: true },
  });
}

async function ensureCommunityPage(
  communityId: number,
  createdById: number,
  schema: {
    version: 1;
    theme: { accent: string };
    cards: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      action: string | null;
    }>;
  },
) {
  let page = await prisma.communityPage.findUnique({
    where: { communityId_pageKey: { communityId, pageKey: "home" } },
    select: { id: true, currentVersionId: true },
  });
  if (page?.currentVersionId) return page;

  page ??= await prisma.communityPage.create({
    data: { communityId, pageKey: "home" },
    select: { id: true, currentVersionId: true },
  });

  const version = await prisma.communityPageVersion.upsert({
    where: { pageId_versionNo: { pageId: page.id, versionNo: 1 } },
    update: {},
    create: {
      pageId: page.id,
      versionNo: 1,
      schemaJson: schema as unknown as object,
      changeSummary: "初始化社区卡片页面",
      status: "PUBLISHED",
      createdById,
      publishedAt: new Date(),
    },
    select: { id: true },
  });
  return prisma.communityPage.update({
    where: { id: page.id },
    data: {
      currentVersionId: version.id,
      draftSchema: schema as unknown as object,
    },
    select: { id: true, currentVersionId: true },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
