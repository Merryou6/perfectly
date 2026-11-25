# Perfectly

多媒体贴吧社区系统的可运行基础切片，按《软件架构文档 V0.6》和《用户故事文档 V1.3》收敛为“社区 -> 分区 -> 帖子”主模型。

当前目标不是完成全部功能，而是先固定前后端共同依赖的身份、权限、数据模型、响应格式和接口边界。

## 当前范围

- React + TypeScript + Taro H5 用户端
- NestJS + Prisma + MySQL 后端
- 用户名密码注册、登录、当前用户
- 社区列表、社区详情、分区切换
- 加入社区；支持直接加入和待审核两种配置
- 社区成员发帖权限与平台管理员/社区管理员统一判断
- 帖子列表、详情、发布、编辑、软删除
- 社区卡片页面的草稿编辑、实时预览、发布与版本回滚
- 共享 TypeScript 契约、数据库迁移和可重复种子数据

暂不展开：评论、评分、文件上传、媒体转码、实时频道、事件回调、AI 审核、自然语言生成卡片和后台管理。这些模块应沿现有边界继续实现，不直接修改主流程表结构。

## 目录

```text
apps/server                 NestJS API 与 Prisma
apps/web                    Taro H5 客户端
packages/contracts          前后端共享接口类型
docs/api.md                 当前 API 契约
docs/foundation.md          模块边界与并行开发约定
```

## 本地启动

推荐 Node.js 22 LTS，仓库已提供 `.nvmrc`。本地脚本使用隔离的 MySQL 数据目录和 `3307` 端口。

```bash
pnpm install
cp .env.example .env
./scripts/start-local-mysql.sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

默认地址：

- Web: `http://localhost:10086`
- API: `http://127.0.0.1:3000/api/v1`
- Health: `http://127.0.0.1:3000/api/v1/health`

演示账号密码均为 `demo12345`：

- `demo`：城市漫游成员，可直接体验发帖
- `momo`：城市漫游管理员
- `admin`：平台管理员
- `newbie`：尚未加入社区，可用于体验加入流程

社区管理员可以从社区首页进入“管理卡片”。当前支持主视觉、公告、数据统计和动作四种白名单卡片，草稿不会影响线上页面。

## 常用检查

```bash
pnpm typecheck
pnpm build
pnpm --filter @perfectly/web build
pnpm --filter @perfectly/server build
```

停止本地数据库：

```bash
./scripts/stop-local-mysql.sh
```
