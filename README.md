# Perfectly

多媒体动态展示系统的第一个可运行纵向切片。

推荐使用 Node.js 22 LTS，仓库已提供 `.nvmrc`。

## 当前范围

- React + TypeScript + Taro H5 用户端
- NestJS + Prisma + MySQL 后端
- 注册、登录、获取当前用户
- 发布文字动态、动态列表、动态详情
- 修改和删除自己的动态
- 本地开发数据库启动脚本与 Docker Compose 配置

图片视频、标签、评论评分和管理端在后续迭代中接入。

## 本地启动

```bash
pnpm install
cp .env.example .env
./scripts/start-local-mysql.sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev:server
pnpm dev:web
```

本地脚本会在 `.local/mysql` 初始化一套隔离数据，并使用 `3307` 端口，不会修改系统已有的 MySQL 数据。

默认地址：

- Web: `http://localhost:10086`
- API: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`

演示账号：`demo / demo12345`

## 常用检查

```bash
pnpm typecheck
pnpm --filter @perfectly/server build
pnpm --filter @perfectly/web build
```

停止本地数据库：

```bash
./scripts/stop-local-mysql.sh
```
