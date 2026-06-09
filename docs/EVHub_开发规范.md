# EVHub 开发规范

## 项目结构

```
EVHub/
├── docs/                          # 文档
│   ├── EVHub_完整技术设计文档.md
│   ├── EVHub_开发进度汇总.md
│   └── EVHub_开发规范.md
├── evhub-backend/                 # 后端 FastAPI + SQLAlchemy
│   └── app/
│       ├── api/v1/               # API 路由（按模块分文件，公开/管理分离）
│       ├── core/                  # 核心（database, redis, security, response, exceptions, celery）
│       ├── middleware/            # 中间件（CORS, logging, rate_limit, error_handler）
│       ├── models/               # SQLAlchemy ORM（一个文件一个模型）
│       ├── repositories/         # 数据访问层
│       ├── schemas/              # Pydantic 请求/响应 Schema
│       ├── services/             # 业务逻辑层
│       └── tasks/                # Celery 异步任务
└── evhub-frontend/               # 前端 Next.js 15 App Router
    └── src/
        ├── app/
        │   ├── (public)/         # 公开路由组（/login, /register, /brands, /vehicles, /compare）
        │   └── (admin)/admin/    # 管理后台路由组（/admin/vehicles, /admin/users, /admin/content）
        ├── components/           # 共享组件
        ├── hooks/                # 自定义 Hooks
        ├── lib/                  # 工具库（api.ts: 客户端axios, auth.ts, utils.ts）
        ├── stores/               # Zustand 状态仓库
        └── types/                # TypeScript 类型定义（api.ts 统一管理）

## 后端规范

### 统一响应格式
```json
{ "code": 200, "message": "success", "data": {} }
{ "code": 200, "message": "success", "data": [], "meta": { "page": 1, "page_size": 20, "total": 100, "total_pages": 5 } }
```

### API 路由 MUST
1. 每个 `@router` 装饰器必须指定 `response_model=`（Pydantic 泛型：`BaseResponse[T]` 或 `PageResponse[T]`）
2. 请求体使用 Pydantic Schema 做参数校验
3. 管理接口需注入 `current_user: dict = Depends(get_current_user)`
4. 所有写操作写入 `audit_logs` 表

### 分层架构（严格遵守）
```
Router → Service → Repository → Model
```
- **Router**：只做参数接收、依赖注入和返回，不超过 10 行
- **Service**：业务逻辑，调用 Repository 和外部服务
- **Repository**：封装数据库 CRUD，返回 ORM 对象或字典
- **Model**：纯 SQLAlchemy 声明，不含业务逻辑

### Repository 规范（必查项！）
- **所有 Repository 必须继承 `BaseRepository[ModelType]`**（`app/repositories/base.py`）
- BaseRepository 提供了 `get_by_id`, `get_all`, `count`, `create(**kwargs)`, `update(id, **kwargs)`, `soft_delete(id)` 等通用方法
- 自定义 Repository 只需在 `__init__` 中 `super().__init__(ModelClass, db)`，然后添加领域特有方法
- BaseRepository 自动处理 `deleted_at` 过滤（如果模型有该字段）
- 不直接操作 SQLAlchemy Session，全部通过 Repository 封装

### Schema 命名规范
- 请求体：`XxxCreate`, `XxxUpdate`
- 响应数据对象：`XxxItem`（列表项）、`XxxDetail`（详情含关联）
- 响应包装别名：`XxxResp = BaseResponse[XxxData]`, `XxxListResp = PageResponse[XxxItem]`
- 必须创建独立的 `*Data` 类，再用别名包装，不能直接在 response_model 中写 `BaseResponse[dict]`

### ORM 模型规范
- JSONB 字段用 `sqlalchemy.dialects.postgresql.JSONB` 类型
- `created_at` / `updated_at` 用 `func.now()` 默认值
- 关系定义放文件底部（避免循环引用）
- 使用 `from __future__ import annotations` 支持延迟类型标注

## 前端规范

### 路由分组规则（重要！）
- `(admin)` 和 `(public)` 是**组织分组**，不影响 URL 路径
- Admin 实际路由路径必须在 `(admin)/admin/` 下，才能生成 `/admin/...` URL
- Public 路由直接在 `(public)/` 下，生成 `/...` URL
- **严禁** `(admin)/xxx` 与 `(public)/xxx` 出现同名路径段

### Server Components vs Client Components
- **SSR/SSG 页面**（`page.tsx`）：服务端组件，用 `fetch()` 调后端 API，**不能用 axios**
- **交互逻辑**：抽到 `*Client.tsx` 文件中，标记 `"use client"`
- **React Query / axios**：仅在客户端组件中使用
- `searchParams` 和 `params` 在 Next.js 15 中是 **Promise**，必须 `await`

### 样式
- TailwindCSS v4，自定义主题色在 `globals.css` 的 `@theme` 块定义
- 颜色变量：`--color-primary`, `--color-secondary`, `--color-background`, `--color-surface`, `--color-foreground`, `--color-muted`, `--color-border`, `--color-danger`, `--color-success`, `--color-warning`, `--color-accent`
- 不使用 `bg-primary-dark`、`hover:bg-primary-dark` 等非主题变量，用 opacity 或预定义 shade

### 数据获取
- 客户端：`@tanstack/react-query` + `@/lib/api.ts` axios 实例
- 服务端：`fetch(API_BASE + path, { next: { revalidate: N } })`
- SSG 页面加 `export const revalidate = 3600;`

### Token 管理
- Token 存储在 httpOnly Cookie 中（不存 localStorage）
- 401 自动刷新：`lib/api.ts` 中有并发刷新队列

### 构建前检查顺序
1. `npx tsc --noEmit` → 必须零错误
2. `npx next build` → 必须成功

### 常见坑
- `<option>` 的 `selected` prop 类型是 `boolean | undefined`，用 `!!` 转换
- 管理员并发数据获取用 `Promise.allSettled` 而非串行 `for` 循环
- `<img>` 在 Markdown 中需要配置 `next.config` 的 `images.remotePatterns`

## Celery 任务规范
- 任务文件放 `app/tasks/` 目录
- 异步触发用 `.delay()` 或 `.apply_async()`
- 批量落库类任务用 `Celery Beat` 定时调度（如每 5 分钟同步浏览量）
- 任务内数据库操作必须创建独立的 `AsyncSession`

## Git 规范
- 三个 `.gitignore` 分别位于根目录、`evhub-backend/`、`evhub-frontend/`
- venv/、node_modules/、.next/、__pycache__/、.env 均被排除