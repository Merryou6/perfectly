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

  const designer = await prisma.user.upsert({
    where: { username: "momo" },
    update: {},
    create: {
      username: "momo",
      passwordHash: await bcrypt.hash("demo12345", 10),
      displayName: "Momo",
    },
  });

  const count = await prisma.post.count();
  if (count === 0) {
    await prisma.post.createMany({
      data: [
        {
          authorId: demo.id,
          title: "把周末留在海边",
          content:
            "风很轻，海水刚好漫过脚踝。把手机收起来以后，才发现傍晚其实很长。",
          createdAt: new Date(Date.now() - 1000 * 60 * 24),
        },
        {
          authorId: designer.id,
          title: "今天的工作台",
          content:
            "换了新的暖光灯，桌面终于不再像加班的现场。下一步想把墙上那块空白留给旅行照片。",
          createdAt: new Date(Date.now() - 1000 * 60 * 95),
        },
        {
          authorId: demo.id,
          title: "午后散步",
          content:
            "街角咖啡店门口多了一排白色椅子。坐着看了一会儿行人，觉得城市也有慢下来的时候。",
          createdAt: new Date(Date.now() - 1000 * 60 * 180),
        },
        {
          authorId: designer.id,
          title: "一份新的播放列表",
          content:
            "前半段适合写代码，后半段适合关掉电脑发呆。今天循环了很多遍最后一首。",
          createdAt: new Date(Date.now() - 1000 * 60 * 420),
        },
        {
          authorId: demo.id,
          title: "第一次记录",
          content:
            "想给日常留一个不急着被点赞的地方。图片、文字、视频都可以慢慢放进来。",
          createdAt: new Date(Date.now() - 1000 * 60 * 1440),
        },
      ],
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
