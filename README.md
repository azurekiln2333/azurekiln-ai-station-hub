# AzureKiln AI Hub

AI 中转站汇总站，基于提供的 NexusAI UI demo 重构为 React/Vite + Express + MySQL 应用。

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

按需修改 `.env` 里的 MySQL 连接信息，然后初始化数据库：

```bash
npm run db:seed
npm run dev
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

## 设计来源

原始 UI demo 保留在以下目录中：

- `explore_stations_nexusai/`
- `station_detail_nexusai/`
- `login_nexusai/`
- `my_favorites_nexusai/`
- `cognitive_nexus/DESIGN.md`
