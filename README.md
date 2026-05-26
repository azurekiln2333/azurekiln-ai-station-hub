# AzureKiln AI Hub

AI 中转站汇总站，基于提供的 NexusAI UI demo 重构为前后端分离项目。

## 目录结构

- `web/`：React + Vite 前端，包含探索页、详情页、登录页、收藏页和管理后台
- `server/`：Express + MySQL 后端，包含登录鉴权、站点 API、收藏 API、管理员 API 和数据库初始化脚本
- `server/seed-data/`：初始化 MySQL 时使用的站点种子数据
- `cognitive_nexus/`、`*_nexusai/`：原始 UI demo 和设计参考

## 功能

- AI 中转站目录、搜索、分类筛选和多标签筛选
- 中转站卡片收藏、详情页、性能概览、模型兼容、安全能力和价格信息
- 点击直达外部中转站或文档
- MySQL 用户登录、JWT 鉴权、收藏列表
- 管理员后台，支持新增、编辑、删除中转站
- 响应式桌面和移动端导航

## 运行

先准备 MySQL，然后复制环境变量文件：

```bash
npm install
copy .env.example .env
```

按需修改根目录 `.env` 里的 MySQL 连接信息，然后初始化数据库：

```bash
npm run db:seed
npm run dev
```

也可以单独启动：

```bash
npm run dev:web
npm run dev:server
```

默认账号：

- 管理员：`admin@azurekiln.ai` / `admin123456`
- 普通用户：`demo@azurekiln.ai` / `demo123456`

生产构建：

```bash
npm run build
```

## 数据库

`npm run db:seed` 会创建：

- `users`：用户和管理员账号
- `stations`：中转站目录数据
- `favorites`：用户收藏关系

SQL schema 在 `server/schema.sql`，后端 API 在 `server/server.js`。
