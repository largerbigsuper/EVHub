# EVHub 两轮电动车平台 — 完整技术设计文档

| 项目 | 内容 |
|------|------|
| 文档版本 | V4.0 |
| 文档状态 | 正式版 |
| 创建日期 | 2026-06-05 |
| 定位 | 电动车领域版「懂车帝 + 什么值得买 + 汽车之家 + 百度百科」 |
| 技术栈 | FastAPI + SQLAlchemy 2.0 + PostgreSQL + Next.js |

---

## 目录

1. [项目概述](#1-项目概述)
2. [总体技术架构](#2-总体技术架构)
3. [系统模块划分](#3-系统模块划分)
4. [后端工程架构](#4-后端工程架构)
5. [数据库设计](#5-数据库设计)
6. [API 设计规范](#6-api-设计规范)
7. [安全设计](#7-安全设计)
8. [搜索架构](#8-搜索架构)
9. [缓存设计](#9-缓存设计)
10. [异步任务设计](#10-异步任务设计)
11. [SEO 架构](#11-seo-架构)
12. [部署与运维](#12-部署与运维)
13. [里程碑规划](#13-里程碑规划)
14. [开发规范与注意事项](#14-开发规范与注意事项)

---

## 1. 项目概述

### 1.1 项目定位

EVHub 是面向两轮电动车行业的专业内容与数据平台，最终目标是：

> **电动车领域版「懂车帝 + 什么值得买 + 汽车之家 + 百度百科」**

平台核心功能矩阵：

| 功能域 | 内容 | 阶段 |
|--------|------|------|
| 内容平台 | 科普文章、测评、资讯、改装教程 | MVP |
| 数据平台 | 品牌库、车型库、SKU 库、动态属性参数 | MVP |
| 改装生态 | 改装方案、改装配件、改装案例 | V1.0 |
| 用户社区 | 帖子、评论、点赞、收藏 | V1.0 |
| 导购平台 | 产品筛选、对比、商城 | V2.0 |
| 开放平台 | 开放 API、数据服务、开发者平台 | V3.0 |

### 1.2 用户角色体系

| 角色 | 核心能力 | 获取方式 |
|------|---------|---------|
| 游客 | 浏览、搜索、查看参数和改装案例 | 默认 |
| 注册用户 | + 收藏、评论、点赞、发帖、发布改装方案（需审核） | 注册 |
| KOL 用户 | + 发布专业文章、测评、改装教程（直接发布） | 管理员升级 |
| 商家用户 | + 管理店铺、发布商品和活动 | 申请认证 |
| 管理员 | 内容审核、用户管理、车型数据维护、SEO 管理 | 后台配置 |

**权限矩阵（核心接口）：**

| 操作 | 游客 | 注册用户 | KOL | 商家 | 管理员 |
|------|:----:|:-------:|:---:|:----:|:-----:|
| 浏览内容/车型 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 评论/点赞/收藏 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 发布帖子 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 发布改装方案 | ❌ | ✅（需审核） | ✅（直发） | ❌ | ✅ |
| 发布专业文章/测评 | ❌ | ❌ | ✅ | ❌ | ✅ |
| 管理店铺/商品 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 内容审核 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 车型数据维护 | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. 总体技术架构

### 2.1 架构分层

```
┌──────────────────────────────────────────────────────────┐
│                      客户端层                              │
│            Web / iOS / Android / 小程序                   │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                  Cloudflare CDN / DNS                     │
│           DDoS 防护 · 静态资源缓存 · SSL 终止              │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │                               │
┌────────▼────────┐             ┌────────▼────────┐
│   Vercel         │             │   API 网关层     │
│   Next.js SSR    │             │   Nginx · 限流   │
│   SSG · SEO      │             │   JWT 预校验     │
└─────────────────┘             └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │  FastAPI 后端    │
                                │                 │
                         ┌──────┼──────┬──────┐   │
                         ▼      ▼      ▼      ▼   │
                       内容   产品   社区   改装   │
                       中心   中心   中心   中心   │
                                                  │
┌─────────────────────────────────────────────────┘
│                   数据存储层
├── PostgreSQL 17    主业务数据
├── Redis 8          缓存 · Token · 限流
├── Meilisearch      全文搜索
└── Cloudflare R2    图片/媒体存储
```

### 2.2 技术选型

**后端：**

| 层级 | 技术 | 说明 |
|------|------|------|
| Web 框架 | FastAPI | 异步，自动生成 OpenAPI 文档 |
| ORM | SQLAlchemy 2.0 + Alembic | 异步 ORM + 数据库版本迁移 |
| 数据校验 | Pydantic V2 | 请求/响应模型 |
| 认证 | JWT (RS256) | 双 Token 机制 |
| 权限 | RBAC | 动态角色权限 |
| 异步任务 | Celery + Redis | 图片压缩、索引更新、邮件 |
| 消息队列 | Redis（Celery broker） | 不引入 Kafka，降低运维成本 |

**数据存储：**

| 技术 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 17+ | 主数据库，JSONB 动态属性 |
| Redis | 8+ | 缓存、Token、限流计数 |
| Meilisearch | 最新稳定版 | 全文搜索，支持中文分词 |
| Cloudflare R2 | — | 图片/视频/文件存储 |

**前端：**

| 技术 | 用途 |
|------|------|
| Next.js | SSR/SSG，SEO 核心 |
| React | UI 组件 |
| TailwindCSS | 样式 |
| Zustand | 状态管理 |

**托管服务（MVP 阶段全托管，零运维）：**

| 服务 | 方案 | 免费额度 |
|------|------|---------|
| 后端应用 | Railway | 有免费套餐 |
| PostgreSQL | Supabase | 500MB 免费 |
| Redis | Upstash | 按量计费，免费额度足够 |
| 全文搜索 | Meilisearch Cloud | 10 万文档免费 |
| 对象存储 | Cloudflare R2 | 10GB 免费，无出口费 |
| 前端部署 | Vercel | 免费，自动 CI/CD |
| 错误监控 | Sentry | 5K 错误/月免费 |

> **单人运维核心原则：能托管就托管，把精力留给业务和内容。**

### 2.3 模块间通信规范

模块间遵循以下通信原则，防止代码混乱：

```
同模块内：直接函数调用
跨模块引用数据：只传 ID，不传 ORM 对象
跨模块触发副作用：通过 Celery 异步任务
禁止：模块直接操作其他模块的数据库表
```

```python
# ❌ 错误：Community 模块直接查 vehicles 表
from app.modules.product.models import VehicleSku
comment.vehicle = db.query(VehicleSku).get(vehicle_id)

# ✅ 正确：只存 target_id，展示层由前端聚合
comment.target_id = vehicle_id
comment.target_type = "vehicle_sku"
```

---

## 3. 系统模块划分

### 3.1 模块清单

```
app/modules/
├── auth/          用户中心：登录、注册、JWT、权限
├── user/          用户信息：个人资料、角色管理
├── product/       产品中心：品牌、车系、SKU、动态属性
├── content/       内容中心：文章、测评、教程、资讯
├── mod/           改装中心：改装方案、配件清单、改装案例
├── community/     社区中心：帖子、回复、点赞、收藏
├── search/        搜索中心：全站搜索、联想、热词
├── seo/           SEO 中心：sitemap、robots、结构化数据
├── media/         媒体中心：文件上传、CDN 管理
├── notification/  通知中心：站内信、邮件通知
└── system/        系统管理：审计日志、系统配置
```

### 3.2 模块边界

| 模块 | 负责 | 禁止 |
|------|------|------|
| product | 品牌、车系、SKU、参数 | 评论、点赞、收藏 |
| content | 文章生产、发布工作流 | 商品信息 |
| community | 评论、点赞、收藏、帖子 | 产品信息 |
| mod | 改装方案、配件、合规审核 | 直接操作用户数据 |
| search | 搜索索引、关键词统计 | 业务数据修改 |

---

## 4. 后端工程架构

### 4.1 项目目录结构

```
evhub-backend/
├── app/
│   ├── main.py                    # FastAPI 入口，注册路由和中间件
│   ├── config.py                  # 环境变量与配置管理（pydantic-settings）
│   ├── dependencies.py            # 全局依赖注入（get_db, get_current_user）
│   │
│   ├── api/                       # 路由层：只负责接收请求、调用 service、返回响应
│   │   └── v1/
│   │       ├── router.py          # 汇总所有 v1 路由
│   │       ├── auth.py
│   │       ├── articles.py
│   │       ├── vehicles.py
│   │       ├── brands.py
│   │       ├── search.py
│   │       ├── media.py
│   │       ├── community.py
│   │       ├── mod.py
│   │       └── user.py
│   │
│   ├── services/                  # 业务逻辑层：核心业务，不直接操作数据库
│   │   ├── auth_service.py
│   │   ├── article_service.py
│   │   ├── vehicle_service.py
│   │   ├── brand_service.py
│   │   ├── mod_service.py
│   │   ├── search_service.py      # 搜索引擎抽象层（方便切换底层）
│   │   ├── notification_service.py
│   │   └── media_service.py
│   │
│   ├── repositories/              # 数据访问层：所有数据库操作封装在此
│   │   ├── base.py                # 通用 CRUD 基类
│   │   ├── user_repo.py
│   │   ├── article_repo.py
│   │   ├── vehicle_repo.py
│   │   ├── brand_repo.py
│   │   ├── mod_repo.py
│   │   └── comment_repo.py
│   │
│   ├── models/                    # SQLAlchemy ORM 模型
│   │   ├── base.py                # Base、TimestampMixin、SoftDeleteMixin
│   │   ├── user.py
│   │   ├── article.py
│   │   ├── brand.py
│   │   ├── vehicle_series.py
│   │   ├── vehicle_sku.py
│   │   ├── attribute.py           # 动态属性系统
│   │   ├── mod_build.py
│   │   ├── mod_part.py
│   │   ├── community.py           # topic / comment / like / favorite
│   │   ├── media_file.py
│   │   ├── notification.py
│   │   ├── seo_page.py
│   │   └── audit_log.py
│   │
│   ├── schemas/                   # Pydantic 请求/响应模型
│   │   ├── base.py                # BaseResponse、PageResponse
│   │   ├── auth.py
│   │   ├── article.py
│   │   ├── vehicle.py
│   │   ├── brand.py
│   │   ├── mod.py
│   │   └── community.py
│   │
│   ├── core/                      # 核心基础设施
│   │   ├── database.py            # 异步 DB 连接、get_db
│   │   ├── redis.py               # Redis 连接池
│   │   ├── security.py            # JWT 签发/校验、密码哈希
│   │   ├── permissions.py         # RBAC 权限装饰器
│   │   ├── exceptions.py          # 自定义异常类
│   │   └── response.py            # 统一响应封装
│   │
│   ├── middleware/                # 中间件
│   │   ├── logging.py             # 请求日志（结构化 JSON）
│   │   ├── rate_limit.py          # 滑动窗口限流（Redis）
│   │   └── error_handler.py       # 全局错误处理
│   │
│   ├── tasks/                     # Celery 异步任务
│   │   ├── celery_app.py
│   │   ├── image_tasks.py         # 图片压缩 + CDN
│   │   ├── search_tasks.py        # 搜索索引同步
│   │   ├── sitemap_tasks.py       # Sitemap 更新
│   │   ├── notification_tasks.py  # 站内信 + 邮件
│   │   └── stats_tasks.py         # 浏览量批量落库
│   │
│   └── utils/
│       ├── slug.py                # slug 生成与唯一性校验
│       ├── pagination.py
│       └── upload.py              # R2 上传封装
│
├── migrations/                    # Alembic 迁移文件
│   └── versions/
│
├── tests/
│   ├── conftest.py                # pytest fixtures
│   ├── test_auth.py
│   ├── test_articles.py
│   ├── test_vehicles.py
│   └── test_mod.py
│
├── scripts/
│   ├── seed_data.py               # 种子数据（品牌、车型初始化）
│   └── reindex_search.py          # 手动重建搜索索引
│
├── .env.example
├── docker-compose.yml             # 本地开发
├── Dockerfile
├── requirements.txt
├── alembic.ini
└── README.md
```

### 4.2 分层职责

| 层级 | 目录 | 职责 | 禁止事项 |
|------|------|------|---------|
| 路由层 | `api/` | 接收请求，参数校验，调用 service | 不写业务逻辑，不直接操作 DB |
| 业务层 | `services/` | 核心业务逻辑，事务控制 | 不直接写 SQL |
| 数据层 | `repositories/` | 所有数据库查询封装 | 不写业务逻辑 |
| 模型层 | `models/` | ORM 表结构定义 | 不写业务逻辑 |
| 契约层 | `schemas/` | 请求/响应数据结构 | 不引用 ORM 模型 |

### 4.3 核心基础设施代码

#### 异步数据库连接

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # 连接前检查连通性
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

#### ORM 基类

```python
# app/models/base.py
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
```

#### 通用 Repository 基类

```python
# app/repositories/base.py
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: uuid.UUID) -> ModelType | None:
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == id,
                self.model.deleted_at.is_(None)  # 自动过滤软删除
            )
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        self.db.add(obj)
        await self.db.flush()  # 获取 ID，不提交事务
        return obj

    async def soft_delete(self, id: uuid.UUID) -> bool:
        result = await self.db.execute(
            update(self.model).where(self.model.id == id).values(deleted_at=func.now())
        )
        return result.rowcount > 0
```

### 4.4 中间件设计

#### 请求日志中间件

```python
# app/middleware/logging.py
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)

        log = {
            "request_id": request_id, "method": request.method,
            "path": request.url.path, "status": response.status_code,
            "duration_ms": duration_ms,
        }
        level = logging.WARNING if duration_ms > 500 else logging.INFO
        logger.log(level, json.dumps(log, ensure_ascii=False))
        response.headers["X-Request-ID"] = request_id
        return response
```

#### 滑动窗口限流中间件

```python
# app/middleware/rate_limit.py
RATE_LIMIT_RULES = {
    "/api/v1/auth/login":    {"limit": 10,  "window": 60},
    "/api/v1/auth/register": {"limit": 5,   "window": 60},
    "/api/v1/media/upload":  {"limit": 20,  "window": 60},
    "default":               {"limit": 200, "window": 60},
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # 滑动窗口：Redis zset 记录时间戳
        key = f"rate:{request.url.path}:{request.client.host}"
        now = int(time.time())
        rule = RATE_LIMIT_RULES.get(request.url.path, RATE_LIMIT_RULES["default"])
        # zremrangebyscore + zadd + zcard pipeline
        ...
        if count > rule["limit"]:
            return JSONResponse(status_code=429, content={"code": 429, "message": "请求过于频繁"})
        return await call_next(request)
```

#### 中间件注册顺序（洋葱模型）

```python
# app/main.py — 后注册先执行
app.add_middleware(RateLimitMiddleware)        # 3. 限流
app.add_middleware(RequestLoggingMiddleware)   # 2. 日志
app.add_middleware(CORSMiddleware, ...)        # 1. CORS（最先执行）
register_error_handlers(app)
```

#### 统一异常体系

```python
# app/core/exceptions.py
class AppException(Exception):
    def __init__(self, code: int, message: str, status_code: int = 400): ...

class NotFoundError(AppException):
    def __init__(self, resource: str):
        super().__init__(404, f"{resource}不存在", 404)

class UnauthorizedError(AppException):
    def __init__(self): super().__init__(401, "未登录或 Token 已过期", 401)

class ForbiddenError(AppException):
    def __init__(self): super().__init__(403, "权限不足", 403)

class DuplicateError(AppException):
    def __init__(self, field: str): super().__init__(409, f"{field}已存在", 409)
```

---

## 5. 数据库设计

### 5.1 设计原则

- **三级车型结构**：`brands → vehicle_series → vehicle_skus`，禁止单表存所有车型
- **动态属性系统**：参数不硬编码字段，通过 `attribute_definitions + vehicle_attribute_values` 实现
- **UUID 主键**：所有业务表使用 UUID，避免 ID 枚举攻击，支持分库分表
- **统一审计字段**：所有表继承 `created_at / updated_at / created_by / updated_by / deleted_at`
- **软删除**：业务数据不物理删除，`deleted_at IS NULL` 过滤
- **JSONB 扩展**：非核心参数用 JSONB 存储，避免频繁加字段

### 5.2 数据库规模预估

| 时间 | 用户 | 车型 SKU | 文章 | 评论 |
|------|------|---------|------|------|
| 第 1 年 | 10 万 | 5,000 | 2 万 | 20 万 |
| 第 3 年 | 100 万 | 5 万 | 50 万 | 500 万 |

当前阶段单 PostgreSQL 即可，未来按用户库/内容库/产品库/社区库逻辑拆分。

### 5.3 用户中心

#### `users` 用户表

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  UNIQUE NOT NULL,
    nickname      VARCHAR(100),
    email         VARCHAR(100) UNIQUE NOT NULL,
    phone         VARCHAR(20)  UNIQUE,
    password_hash TEXT         NOT NULL,
    avatar        VARCHAR(500),
    status        SMALLINT     DEFAULT 1,   -- 1=正常 0=封禁
    last_login_at TIMESTAMP,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP,
    deleted_at    TIMESTAMP
);

CREATE UNIQUE INDEX uk_users_username ON users(username);
CREATE UNIQUE INDEX uk_users_email    ON users(email);
CREATE UNIQUE INDEX uk_users_phone    ON users(phone) WHERE phone IS NOT NULL;
```

#### `roles` / `permissions` / `user_roles` / `role_permissions`

```sql
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL,  -- 超级管理员 / KOL / 商家
    code        VARCHAR(50)  UNIQUE NOT NULL,  -- super_admin / kol / merchant
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     VARCHAR(100) NOT NULL,
    code     VARCHAR(100) UNIQUE NOT NULL,  -- article:publish / vehicle:edit
    resource VARCHAR(50),
    action   VARCHAR(50)
);

CREATE TABLE user_roles (
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### 5.4 品牌中心

#### `brands` 品牌表

```sql
CREATE TABLE brands (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    english_name  VARCHAR(100),
    slug          VARCHAR(100) UNIQUE NOT NULL,
    logo_url      VARCHAR(500),
    cover_url     VARCHAR(500),
    country       VARCHAR(50)  DEFAULT '中国',
    founded_year  INTEGER,
    description   TEXT,
    price_range   VARCHAR(50),       -- "2000-8000元"
    official_url  VARCHAR(500),
    is_featured   BOOLEAN      DEFAULT false,
    sort_order    INTEGER      DEFAULT 0,
    status        SMALLINT     DEFAULT 1,
    -- SEO
    meta_title    VARCHAR(100),
    meta_desc     VARCHAR(200),
    -- 审计
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP,
    created_by    UUID REFERENCES users(id),
    updated_by    UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uk_brand_slug ON brands(slug);
CREATE INDEX idx_brand_featured ON brands(is_featured) WHERE is_featured = true;
```

### 5.5 车型中心（三级结构）

#### `vehicle_series` 车系表

```sql
CREATE TABLE vehicle_series (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id         UUID REFERENCES brands(id) NOT NULL,
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(150) UNIQUE NOT NULL,
    category         VARCHAR(20),   -- light / emoto / scooter
    cover_image      VARCHAR(500),
    description      TEXT,
    is_discontinued  BOOLEAN   DEFAULT false,
    launched_at      DATE,
    status           SMALLINT  DEFAULT 1,
    sort_order       INTEGER   DEFAULT 0,
    -- SEO
    meta_title       VARCHAR(100),
    meta_desc        VARCHAR(200),
    -- 审计
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP,
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uk_series_slug   ON vehicle_series(slug);
CREATE INDEX idx_series_brand        ON vehicle_series(brand_id);
CREATE INDEX idx_series_category     ON vehicle_series(category);
```

#### `vehicle_skus` SKU 表

```sql
CREATE TABLE vehicle_skus (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id        UUID REFERENCES vehicle_series(id) NOT NULL,
    sku_code         VARCHAR(100) UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(150) UNIQUE NOT NULL,
    year             INTEGER,
    cover_image      VARCHAR(500),
    images           JSONB     DEFAULT '[]',
    color_options    JSONB     DEFAULT '[]',   -- ["星空黑","珍珠白"]

    -- 核心筛选字段（高频查询，独立建字段+索引）
    price_min        DECIMAL(10,2),
    price_max        DECIMAL(10,2),
    battery_type     VARCHAR(20),   -- lead_acid / lithium / graphene
    range_km         INTEGER,       -- 标准工况续航
    motor_power_w    INTEGER,
    max_speed_kmh    INTEGER,
    weight_kg        DECIMAL(5,1),
    requires_license BOOLEAN   DEFAULT false,   -- 高频筛选，必须独立字段
    license_type     VARCHAR(20),

    -- 状态
    is_featured      BOOLEAN   DEFAULT false,
    status           SMALLINT  DEFAULT 0,   -- 0=草稿 1=已发布 2=停售
    view_count       INTEGER   DEFAULT 0,

    -- 扩展
    specs            JSONB     DEFAULT '{}',   -- 非核心参数

    -- SEO
    meta_title       VARCHAR(100),
    meta_desc        VARCHAR(200),

    -- 审计
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP,
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uk_vehicle_sku_code    ON vehicle_skus(sku_code);
CREATE UNIQUE INDEX uk_vehicle_sku_slug    ON vehicle_skus(slug);
CREATE INDEX idx_vehicle_series_id         ON vehicle_skus(series_id);
CREATE INDEX idx_vehicle_price             ON vehicle_skus(price_min, price_max);
CREATE INDEX idx_vehicle_range             ON vehicle_skus(range_km);
CREATE INDEX idx_vehicle_license           ON vehicle_skus(requires_license);   -- 高频筛选
CREATE INDEX idx_vehicle_status            ON vehicle_skus(status);
```

### 5.6 动态属性系统（EVHub 核心）

动态属性系统是平台核心竞争力，支持任意扩展参数而不改表结构。

#### `attribute_groups` 属性组

```sql
CREATE TABLE attribute_groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,   -- 动力系统 / 电池系统 / 尺寸规格
    sort       INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `attribute_definitions` 属性定义

```sql
CREATE TABLE attribute_definitions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id       UUID REFERENCES attribute_groups(id),
    name           VARCHAR(100) NOT NULL,  -- 电机功率
    code           VARCHAR(100) UNIQUE NOT NULL,  -- motor_power（程序用）
    value_type     VARCHAR(20)  NOT NULL,  -- text / number / boolean / enum
    unit           VARCHAR(20),            -- W / km / kg
    display_format VARCHAR(50),            -- "{value}W"（前端直接用）
    is_filterable  BOOLEAN DEFAULT false,  -- 是否作为筛选条件
    is_key_spec    BOOLEAN DEFAULT false,  -- 是否在卡片预览中展示
    is_comparable  BOOLEAN DEFAULT false,  -- 是否参与车型对比
    sort           INTEGER DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP
);
```

#### `vehicle_attribute_values` 属性值

```sql
CREATE TABLE vehicle_attribute_values (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_sku_id  UUID REFERENCES vehicle_skus(id) ON DELETE CASCADE,
    attribute_id    UUID REFERENCES attribute_definitions(id),
    value_text      TEXT,   -- 统一文本存储，查询时按 value_type 转换
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicle_attribute_vehicle   ON vehicle_attribute_values(vehicle_sku_id);
CREATE INDEX idx_vehicle_attribute_attribute ON vehicle_attribute_values(attribute_id);
CREATE UNIQUE INDEX uk_vehicle_attr          ON vehicle_attribute_values(vehicle_sku_id, attribute_id);
```

### 5.7 内容中心

#### `categories` 分类表

```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID REFERENCES categories(id),   -- 支持二级分类
    name        VARCHAR(50)  NOT NULL,
    slug        VARCHAR(50)  UNIQUE NOT NULL,
    type        VARCHAR(20),   -- knowledge / maintenance / mod / news / ad
    description VARCHAR(200),
    icon_url    VARCHAR(500),
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

#### `articles` 文章表

```sql
CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID REFERENCES users(id) NOT NULL,
    reviewed_by     UUID REFERENCES users(id),
    category_id     UUID REFERENCES categories(id),

    title           VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) UNIQUE NOT NULL,
    content         TEXT,                     -- Markdown
    excerpt         VARCHAR(500),
    cover_image_url VARCHAR(500),

    -- SEO（必须字段）
    meta_title      VARCHAR(100),
    meta_desc       VARCHAR(200),
    og_image_url    VARCHAR(500),
    schema_type     VARCHAR(50),              -- Article / HowTo / Review
    schema_data     JSONB,                    -- JSON-LD 结构化数据

    -- 工作流
    status          VARCHAR(20) DEFAULT 'draft',
    -- draft / pending / published / rejected
    reject_reason   VARCHAR(500),
    published_at    TIMESTAMP,

    -- 统计（冗余计数，避免实时 COUNT）
    view_count      INTEGER DEFAULT 0,
    like_count      INTEGER DEFAULT 0,
    comment_count   INTEGER DEFAULT 0,

    -- 审计
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    created_by      UUID REFERENCES users(id),
    updated_by      UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uk_article_slug     ON articles(slug);
CREATE INDEX idx_article_status         ON articles(status, published_at DESC);
CREATE INDEX idx_article_category       ON articles(category_id);
CREATE INDEX idx_article_author         ON articles(author_id);
```

### 5.8 改装中心

#### `mod_builds` 改装方案表

```sql
CREATE TABLE mod_builds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    vehicle_sku_id  UUID REFERENCES vehicle_skus(id),

    title           VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) UNIQUE NOT NULL,
    description     TEXT,
    total_cost      DECIMAL(10,2),
    difficulty      SMALLINT,         -- 1-5 难度等级

    -- 合规字段（必须）
    is_legal        BOOLEAN NOT NULL, -- 是否合法改装
    legal_note      TEXT,             -- 合规说明（is_legal=false 时必填）

    cover_image_url VARCHAR(500),
    images          JSONB DEFAULT '[]',

    -- 工作流
    status          VARCHAR(20) DEFAULT 'draft',
    -- draft / pending / published / rejected
    reject_reason   VARCHAR(500),
    published_at    TIMESTAMP,

    -- 统计
    view_count      INTEGER DEFAULT 0,
    like_count      INTEGER DEFAULT 0,
    comment_count   INTEGER DEFAULT 0,

    -- SEO
    meta_title      VARCHAR(100),
    meta_desc       VARCHAR(200),
    schema_data     JSONB,            -- HowTo Schema.org

    -- 审计
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_mod_build_user    ON mod_builds(user_id);
CREATE INDEX idx_mod_build_vehicle ON mod_builds(vehicle_sku_id);
CREATE INDEX idx_mod_build_status  ON mod_builds(status);
```

#### `mod_parts` 改装配件清单

```sql
CREATE TABLE mod_parts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id     UUID REFERENCES mod_builds(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    brand        VARCHAR(100),
    category     VARCHAR(50),          -- 灯光 / 坐垫 / 储物 / 轮胎
    price        DECIMAL(10,2),
    purchase_url VARCHAR(500),         -- 购买链接（导购变现入口）
    is_legal     BOOLEAN DEFAULT true, -- 该配件是否合法
    sort         INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mod_parts_build ON mod_parts(build_id);
```

### 5.9 社区中心

#### `topics` 帖子表

```sql
CREATE TABLE topics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id) NOT NULL,
    category_id   UUID REFERENCES categories(id),

    title         VARCHAR(200) NOT NULL,
    content       TEXT,
    images        JSONB DEFAULT '[]',

    status        SMALLINT DEFAULT 0,  -- 0=正常 1=置顶 2=加精 3=删除
    is_pinned     BOOLEAN DEFAULT false,
    is_featured   BOOLEAN DEFAULT false,

    -- 冗余计数
    view_count    INTEGER DEFAULT 0,
    reply_count   INTEGER DEFAULT 0,
    like_count    INTEGER DEFAULT 0,
    last_reply_at TIMESTAMP,           -- 用于帖子列表排序

    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP,
    deleted_at    TIMESTAMP
);

CREATE INDEX idx_topics_last_reply ON topics(last_reply_at DESC);
CREATE INDEX idx_topics_category   ON topics(category_id);
CREATE INDEX idx_topics_user       ON topics(user_id);
```

#### `comments` 通用评论表

```sql
CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    -- article / vehicle_sku / mod_build / topic
    target_id   UUID NOT NULL,
    parent_id   UUID REFERENCES comments(id),  -- 二级回复

    content     TEXT NOT NULL,
    floor_no    INTEGER,   -- 楼层号（同 target 下自增）

    -- 状态
    status      SMALLINT DEFAULT 0,
    -- 0=正常 1=待审核 2=已删除 3=被举报屏蔽

    -- 冗余计数
    like_count  INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user   ON comments(user_id);
```

#### `likes` 点赞表 / `favorites` 收藏表

```sql
CREATE TABLE likes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id   UUID NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE TABLE favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    -- article / vehicle_sku / brand / mod_build / topic
    target_id   UUID NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);
```

### 5.10 通用系统表

#### `tags` 标签表 / `tag_relations` 关联表

```sql
CREATE TABLE tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(50) UNIQUE NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    use_count  INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tag_relations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id   UUID NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uk_tag_relations UNIQUE(tag_id, target_type, target_id),
    CONSTRAINT chk_target_type CHECK (
        target_type IN ('vehicle_sku', 'article', 'mod_build', 'topic')
    )
);
```

#### `media_files` 媒体文件表

```sql
CREATE TABLE media_files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id   UUID REFERENCES users(id),
    filename      VARCHAR(255),
    original_name VARCHAR(255),
    file_type     VARCHAR(50),       -- image / video / pdf
    mime_type     VARCHAR(100),
    file_size     BIGINT,            -- bytes
    storage_key   TEXT,              -- R2 路径
    cdn_url       VARCHAR(500),
    width         INTEGER,
    height        INTEGER,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

#### `notifications` 通知表

```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) NOT NULL,
    type        VARCHAR(50) NOT NULL,
    -- comment_reply / audit_result / like / system
    title       VARCHAR(200),
    content     TEXT,
    is_read     BOOLEAN DEFAULT false,
    target_type VARCHAR(50),
    target_id   UUID,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_time ON notifications(created_at DESC);
```

#### `seo_pages` SEO 页面表

```sql
CREATE TABLE seo_pages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type   VARCHAR(50),   -- vehicle_sku / brand / article / mod_build
    target_id     UUID,
    title         VARCHAR(255),
    keywords      TEXT,
    description   TEXT,
    canonical_url TEXT,
    schema_type   VARCHAR(50),   -- Product / Article / HowTo / Organization
    schema_data   JSONB,         -- JSON-LD 完整数据
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(target_type, target_id)
);
```

#### `search_keywords` 搜索词统计

```sql
CREATE TABLE search_keywords (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword      VARCHAR(255) UNIQUE NOT NULL,
    search_count BIGINT DEFAULT 0,
    result_count INTEGER DEFAULT 0,
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

#### `audit_logs` 操作审计日志

```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(50),     -- CREATE / UPDATE / DELETE / PUBLISH / REJECT
    resource    VARCHAR(50),     -- article / vehicle_sku / mod_build
    resource_id UUID,
    detail      JSONB,           -- 变更前后的数据快照 {before: {}, after: {}}
    ip_address  INET,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_time     ON audit_logs(created_at DESC);
```

---

## 6. API 设计规范

### 6.1 基础规范

- 统一前缀：`/api/v1/`
- 响应格式：`{ code, message, data, meta }`
- 分页参数：`page`（默认 1）、`page_size`（默认 20，最大 100）
- 时间字段：统一 ISO 8601 格式
- 路径参数：资源用 `slug`（SEO 友好），管理接口用 `id`

```json
// 成功
{ "code": 200, "message": "success", "data": {}, "meta": { "page": 1, "total": 100, "total_pages": 5 } }

// 失败
{ "code": 404, "message": "车型不存在", "data": null }
```

### 6.2 核心接口清单

#### 认证 `/api/v1/auth`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/register` | 公开 | 用户注册 |
| POST | `/login` | 公开 | 登录，返回双 Token |
| POST | `/refresh` | 公开 | RefreshToken 换新 AccessToken |
| POST | `/logout` | 登录 | 注销，删除 Redis 中的 RefreshToken |
| GET  | `/me` | 登录 | 当前用户信息 |
| PUT  | `/me` | 登录 | 修改个人资料 |

#### 文章 `/api/v1/articles`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/articles` | 公开 | 文章列表（分类/标签/关键词筛选） |
| GET    | `/articles/:slug` | 公开 | 文章详情（slug 访问） |
| POST   | `/articles` | KOL/Admin | 创建文章 |
| PUT    | `/articles/:id` | 作者/Admin | 修改文章 |
| DELETE | `/articles/:id` | 作者/Admin | 软删除 |
| POST   | `/articles/:id/submit` | 作者 | 提交审核 |
| POST   | `/articles/:id/publish` | Admin | 发布 |
| POST   | `/articles/:id/reject` | Admin | 拒绝（附原因） |

#### 车型 `/api/v1/vehicles`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/brands` | 公开 | 品牌列表 |
| GET | `/brands/:slug` | 公开 | 品牌详情（含车系） |
| GET | `/series/:slug` | 公开 | 车系详情（含 SKU 列表） |
| GET | `/skus` | 公开 | SKU 筛选列表 |
| GET | `/skus/:slug` | 公开 | SKU 详情（含动态属性） |
| GET | `/skus/compare` | 公开 | 多车型对比（最多 4 款） |

**SKU 筛选参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `brand_slug` | string | 品牌 |
| `category` | string | light / emoto / scooter |
| `battery_type` | string | 电池类型 |
| `price_min/max` | int | 价格区间 |
| `range_min` | int | 最低续航 |
| `requires_license` | bool | 是否需要驾照 |
| `tags` | string[] | 标签 |
| `sort_by` | string | price_asc / range_desc / newest |

#### 改装 `/api/v1/mod`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/mod/builds` | 公开 | 改装方案列表 |
| GET    | `/mod/builds/:slug` | 公开 | 方案详情（含配件清单） |
| POST   | `/mod/builds` | 登录 | 发布改装方案 |
| POST   | `/mod/builds/:id/submit` | 作者 | 提交审核 |
| POST   | `/mod/builds/:id/publish` | Admin | 发布 |

#### 社区 `/api/v1/community`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/topics` | 公开 | 帖子列表 |
| POST   | `/topics` | 登录 | 发帖 |
| GET    | `/topics/:id/comments` | 公开 | 评论列表 |
| POST   | `/topics/:id/comments` | 登录 | 发表评论 |
| POST   | `/likes` | 登录 | 点赞（通用，传 target_type + target_id） |
| POST   | `/favorites` | 登录 | 收藏（通用） |

#### 搜索 `/api/v1/search`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search` | 全站搜索（文章+车型+品牌+改装） |
| GET | `/search/suggest` | 联想搜索词 |
| GET | `/search/hot` | 热搜榜 |

---

## 7. 安全设计

### 7.1 JWT 双 Token 机制

```
用户登录
    → 生成 Access Token（15分钟，RS256 签名，payload含user_id+role）
    → 生成 Refresh Token（7天，随机UUID，存入Redis: auth:refresh:{user_id}）
    → 两个 Token 同时返回前端

API 请求
    → Header: Authorization: Bearer {access_token}
    → 网关或中间件校验签名和有效期

Token 刷新
    → POST /auth/refresh，携带 refresh_token
    → 从 Redis 验证是否有效
    → 生成新的双 Token，旧 Refresh Token 立即删除（防重放）

登出
    → 从 Redis 删除 Refresh Token
    → Access Token 等待自然过期（15分钟内仍有效，可接受）
```

### 7.2 安全措施清单

- 密码：bcrypt 哈希，cost factor ≥ 12
- JWT：RS256 非对称签名，私钥存环境变量
- SQL 注入：全程 SQLAlchemy ORM，禁止拼接 SQL
- 文件上传：MIME Type 白名单（image/jpeg, image/png, image/webp），最大 10MB
- CORS：白名单配置，只允许指定域名
- 敏感接口限流：登录 10次/分钟，注册 5次/分钟（Redis 滑动窗口）
- 内容安全：改装方案发布强制填写 `is_legal` 字段，业务层校验

### 7.3 内容审核流程

```
改装方案 / 普通用户文章
        ↓
  status = pending（待审核）
        ↓
  管理员审核队列
        ↓
通过 → status = published → 触发搜索索引更新 + 通知作者
拒绝 → status = rejected + reject_reason → 通知作者（站内信+邮件）
```

---

## 8. 搜索架构

### 8.1 分阶段选型

| 阶段 | 方案 | 切换条件 |
|------|------|---------|
| MVP | PostgreSQL `pg_trgm` 全文检索 | 零额外运维 |
| V1.0 | **Meilisearch**（推荐） | 数据量 > 1 万条 |
| V2.0+ | Elasticsearch | 日活 > 1 万，需要复杂聚合 |

通过 `search_service.py` 抽象层隔离底层引擎，切换引擎只修改实现，上层 API 不变。

### 8.2 搜索索引设计

| 索引名 | 索引字段 | 权重 |
|--------|---------|------|
| `vehicle_index` | model_name, brand_name, tags, key_specs | name 权重最高 |
| `article_index` | title, excerpt, content, tags, category_name | title 权重最高 |
| `brand_index` | name, english_name, description | — |
| `mod_build_index` | title, description, vehicle_name, tags | — |

规则：只有 `status = published` 且 `is_legal = true`（改装方案）的内容进入索引。

### 8.3 索引同步策略

| 触发事件 | Celery 任务 | 优先级 |
|---------|------------|--------|
| 内容发布/更新 | `sync_to_search` | 高（立即触发） |
| 内容删除/下架 | `remove_from_search` | 高 |
| 每日 03:00 | `reindex_all` 全量重建 | 低（兜底） |

---

## 9. 缓存设计

### 9.1 Redis Key 规范

| Key 模式 | 用途 | TTL |
|---------|------|-----|
| `auth:refresh:{user_id}` | Refresh Token | 7天 |
| `vehicle:sku:{id}` | 车型详情缓存 | 30分钟 |
| `vehicle:series:{id}:skus` | 车系下 SKU 列表 | 10分钟 |
| `brand:list:page:{n}` | 品牌列表分页 | 30分钟 |
| `hot:articles` | 热门文章 | 5分钟 |
| `hot:vehicles` | 热门车型 | 10分钟 |
| `rank:vehicles:weekly` | 周榜 | 1小时 |
| `search:suggest:{kw_hash}` | 搜索建议 | 10分钟 |
| `view:article:{id}` | 文章浏览计数（待落库） | 1小时 |
| `rate:{path}:{ip}` | 限流计数 | 1分钟 |

### 9.2 浏览量统计（高并发写入优化）

```
用户浏览 → Redis INCR view:article:{id}
                        ↓
           每 5 分钟 Celery 定时任务批量落库
           UPDATE articles SET view_count = view_count + {delta}
```

### 9.3 缓存更新策略

- 读多写少数据（品牌列表、车型详情）：Cache Aside，写后删缓存
- 热榜数据：定时任务重算，允许 5-10 分钟延迟
- 计数类数据：Redis 累积，定时批量写库

---

## 10. 异步任务设计

采用 Celery + Redis Broker，不引入 Kafka。

### 10.1 任务清单

| 触发时机 | 任务 | 队列优先级 |
|---------|------|---------|
| 图片上传后 | 压缩为 WebP + 推送 R2 CDN | 高 |
| 内容发布后 | 更新 Meilisearch 搜索索引 | 高 |
| 内容发布后 | 更新 sitemap.xml | 中 |
| 审核结果后 | 发送站内通知 + 邮件 | 中 |
| 用户注册后 | 发送欢迎邮件 | 低 |
| 每 5 分钟 | 浏览量批量写库 | 低 |
| 每小时 | 热门榜单重算 | 低 |
| 每日 03:00 | 全量搜索索引重建 | 低 |

---

## 11. SEO 架构

### 11.1 Next.js 端要求

- 车型、品牌、文章、改装方案页面全部使用 SSR/SSG
- 每个页面动态生成 `<title>`、`<meta description>`、`<og:image>`
- 结构化数据通过 `<script type="application/ld+json">` 注入

### 11.2 Schema.org 结构化数据

| 页面 | Schema 类型 | 核心字段 |
|------|------------|---------|
| 车型详情页 | `Product` | name, brand, offers, description |
| 品牌介绍页 | `Organization` | name, url, logo, foundingDate |
| 文章/测评页 | `Article` | headline, author, datePublished |
| 改装方案页 | `HowTo` | name, step, totalCost, tool |
| 搜索结果页 | `SearchResultsPage` | — |

### 11.3 Slug 规范

- 格式：全小写 + 连字符，如 `yadea-g6-pro-2025`
- Slug 一旦创建后不允许修改（影响已被搜索引擎收录的链接）
- 后端 API 提供 slug 唯一性校验接口
- 新 slug 发布后触发 Celery 更新 sitemap.xml

### 11.4 SEO 接口

- `GET /sitemap.xml`：全站点地图，按 lastmod 排序
- `GET /robots.txt`：爬虫规则
- `GET /seo/schema/:type/:id`：返回指定资源的 JSON-LD 数据

---

## 12. 部署与运维

### 12.1 本地开发（docker-compose.yml）

```yaml
version: "3.9"
services:
  api:
    build: .
    ports: ["8000:8000"]
    volumes: [".:/app"]
    environment:
      - DATABASE_URL=postgresql+asyncpg://ev:ev@postgres:5432/ev_db
      - REDIS_URL=redis://redis:6379/0
      - MEILISEARCH_URL=http://meilisearch:7700
    depends_on:
      postgres: { condition: service_healthy }
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: .
    environment:
      - DATABASE_URL=postgresql+asyncpg://ev:ev@postgres:5432/ev_db
      - REDIS_URL=redis://redis:6379/0
    command: celery -A app.tasks.celery_app worker --loglevel=info

  postgres:
    image: postgres:17-alpine
    environment: { POSTGRES_USER: ev, POSTGRES_PASSWORD: ev, POSTGRES_DB: ev_db }
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ev"]
      interval: 5s

  redis:
    image: redis:8-alpine
    ports: ["6379:6379"]

  meilisearch:
    image: getmeili/meilisearch:latest
    ports: ["7700:7700"]
    environment: [MEILI_MASTER_KEY=local_dev_key]

volumes:
  postgres_data:
```

### 12.2 Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "app.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### 12.3 生产部署架构

```
Cloudflare CDN / DNS（DDoS 防护 · SSL 终止）
         │                    │
    Vercel                 Railway
  Next.js 前端           FastAPI 后端（2实例）
                               │
          ┌────────────────────┼───────────────┐
          │                   │               │
       Supabase            Upstash      Meilisearch Cloud
    PostgreSQL 托管       Redis 托管      全文搜索托管
    自动备份·高可用      Serverless      10万文档免费
          │
    Cloudflare R2              Sentry
    图片/媒体存储（10GB免费）   错误监控
```

### 12.4 CI/CD（GitHub Actions）

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v --cov=app

  deploy:
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @railway/cli && railway up --service evhub-backend
        env: { RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }} }
      - run: railway run alembic upgrade head
        env: { RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }} }
```

### 12.5 环境变量清单

```bash
# .env.example
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/evhub
REDIS_URL=redis://host:6379/0
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
R2_BUCKET=evhub-media
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
MEILISEARCH_URL=https://your-instance.meilisearch.io
MEILISEARCH_API_KEY=your_api_key
SENTRY_DSN=https://xxx@sentry.io/xxx
SMTP_HOST=smtp.xxx.com
SMTP_USER=noreply@evhub.cn
SMTP_PASS=your_smtp_password
ENVIRONMENT=production
```

### 12.6 健康检查与日志

- `GET /health`：检查 DB / Redis 连接状态
- `GET /health/ready`：就绪探针
- 日志格式：结构化 JSON，包含 `request_id / user_id / path / status / duration_ms`
- 慢查询（> 500ms）单独记录
- ERROR 级别自动触发 Sentry 告警

---

## 13. 里程碑规划

| 里程碑 | 时间 | 核心功能 | 成功指标 |
|--------|------|---------|---------|
| **MVP** | 0-3个月 | 用户、内容、品牌、车系/SKU、动态属性 | 上线 50 篇文章，录入 100 款车型 |
| **V1.0** | 4-6个月 | 搜索、社区（帖子/评论）、改装方案、SEO | 月独立访客 > 5,000，注册用户 > 1,000 |
| **V2.0** | 7-12个月 | 改装生态完善、商城导购、KOL 体系 | 月独立访客 > 50,000，注册用户 > 10,000 |
| **V3.0** | 13-24个月 | 开放平台、数据 API、行业生态 | 日活 > 10,000，合作品牌 > 20 家 |

### MVP 阶段详细任务

**第 1-2 个月（基础建设）：**
- [ ] FastAPI 项目骨架（路由、中间件、异常处理、统一响应）
- [ ] PostgreSQL 初始化（users / roles / brands / vehicle_series / vehicle_skus / attribute_definitions / articles / categories / media_files / audit_logs）
- [ ] JWT 双 Token 认证 + RBAC 权限中间件
- [ ] 品牌 / 车系 / SKU CRUD + 动态属性录入
- [ ] 文章 CRUD + 发布工作流（draft → pending → published）
- [ ] 图片上传（Cloudflare R2）+ 异步压缩
- [ ] PostgreSQL 全文搜索（基础版）

**第 3 个月（内容积累 + 上线）：**
- [ ] 录入 20+ 个主流品牌数据
- [ ] 录入 100+ 款主流 SKU 及参数
- [ ] 发布 50 篇高质量科普文章
- [ ] SEO meta 字段完善
- [ ] 部署上线（Railway + Supabase + Vercel）
- [ ] Sentry 错误监控接入

---

## 14. 开发规范与注意事项

### 14.1 代码规范

- Python 代码使用 `ruff` 格式化，`mypy` 类型检查
- 所有函数必须有类型注解
- Repository 层方法必须有单元测试覆盖
- 认证、发布工作流、文件上传三条核心链路必须有集成测试

### 14.2 接口规范

- 先写 OpenAPI 文档（FastAPI schema），再写实现
- 路径使用 `slug` 而非 `id`（SEO + 安全）
- 所有列表接口支持分页，禁止返回无限制数据
- 删除操作全部使用软删除，禁止物理删除

### 14.3 数据规范

- `slug` 创建后不允许修改
- 车型核心筛选字段（`requires_license` / `range_km` / `price_min` 等）必须独立建字段和索引，不能只存 JSONB
- 所有统计计数（`view_count` / `like_count` / `comment_count`）使用冗余字段，通过异步任务同步，不实时 COUNT

### 14.4 改装内容合规

> ⚠️ 法律红线，必须严格执行

| 类型 | 处理方式 |
|------|---------|
| 合法改装 | 外观件、坐垫、置物架、灯光美化（不影响动力）——正常发布 |
| 违法改装 | 解速、大功率电机替换、电池超标改装——`is_legal=false`，需额外审核，加醒目合规提示 |
| 法规说明 | 所有改装内容页面顶部显示合规声明 |
| 配件链接 | `mod_parts.purchase_url` 为导购变现入口，需确保合规性 |

### 14.5 单人开发优先级原则

```
内容 > 功能 > 架构优化

MVP 阶段每周节奏：
  周一-三：写代码（功能实现）
  周四-五：写内容（文章、录入车型数据）
  不要为了"架构完美"推迟上线
```

---

*EVHub 完整技术设计文档 V4.0*
*整合来源：01-总体架构设计.md + 02-数据库设计.md + 历次优化讨论*
*下次更新：V1.0 开发启动时同步更新 API 详细设计*

---

# 附录：AI 辅助开发任务规划

> 本规划以模块为主导，每个模块包含后台管理（FastAPI 后端 + Admin 界面）与前端（Next.js）两条线，按顺序执行。每个任务块给出可直接粘贴给 AI 的提示词、主要任务、注意事项和完成目标。

---

## 使用说明

1. 按模块顺序执行，前置模块完成后再开始下一模块
2. 每个任务块的「提示词」可直接复制给 AI（Claude / Cursor / Copilot）
3. 「注意事项」是 AI 容易出错的地方，提示词中已包含，执行前再确认一遍
4. 每个任务完成后对照「完成目标」逐项验收

---

## 模块 0：项目骨架初始化

### 0-A 后端骨架

**提示词：**
```
你是一个 Python 后端架构师。请帮我初始化一个 FastAPI 项目，要求如下：

技术栈：FastAPI + SQLAlchemy 2.0（异步）+ Alembic + Pydantic V2 + Redis（asyncio）

目录结构：
app/
├── main.py           # FastAPI 入口，注册路由和中间件
├── config.py         # pydantic-settings 管理环境变量
├── dependencies.py   # get_db, get_current_user 依赖注入
├── api/v1/router.py  # 路由汇总
├── core/
│   ├── database.py   # 异步引擎 + get_db
│   ├── redis.py      # Redis 连接池
│   ├── security.py   # JWT RS256 签发/校验 + bcrypt 密码哈希
│   ├── exceptions.py # AppException 及子类
│   └── response.py   # 统一响应封装 { code, message, data, meta }
├── middleware/
│   ├── logging.py    # 结构化 JSON 请求日志，慢请求（>500ms）WARNING
│   ├── rate_limit.py # Redis 滑动窗口限流，规则可配置
│   └── error_handler.py # 全局错误处理，AppException + 未知异常
├── models/base.py    # TimestampMixin、SoftDeleteMixin、Base
└── schemas/base.py   # BaseResponse、PageResponse

要求：
- 数据库连接池 pool_size=10，max_overflow=20，pool_pre_ping=True
- JWT 使用 RS256，Access Token 15分钟，Refresh Token 存 Redis 7天
- 所有异常统一返回 { code, message, data: null }，生产环境不暴露堆栈
- 中间件注册顺序：CORSMiddleware → RequestLoggingMiddleware → RateLimitMiddleware
- 提供 GET /health 健康检查接口，检查 DB 和 Redis 连通性
- 提供 .env.example 文件
- 提供 docker-compose.yml（postgres:17 + redis:8 + meilisearch + api + worker）
- 提供 Dockerfile（python:3.12-slim，生产用 gunicorn + uvicorn worker）
- 提供 requirements.txt

请输出完整代码，不要省略。
```

**主要任务：**
- 创建完整目录结构和所有基础文件
- 实现异步数据库连接（asyncpg）
- 实现 JWT RS256 双 Token 机制
- 实现三个中间件（日志/限流/错误处理）
- 配置 Docker 本地开发环境

**注意事项：**
- SQLAlchemy 2.0 异步写法与 1.x 差异大，注意 `async_sessionmaker` 和 `Mapped` 类型注解
- 中间件注册顺序与执行顺序相反（洋葱模型）
- JWT 私钥用 RS256，不要用 HS256
- `expire_on_commit=False` 避免提交后懒加载报错

**完成目标：**
- [ ] `uvicorn app.main:app --reload` 启动无报错
- [ ] `GET /health` 返回 `{ code: 200, data: { db: ok, redis: ok } }`
- [ ] `docker-compose up` 所有服务正常启动
- [ ] 目录结构与规划完全一致

---

### 0-B 前端骨架

**提示词：**
```
你是一个 Next.js 前端架构师。请帮我初始化一个 Next.js 15 项目，要求如下：

技术栈：Next.js 15（App Router）+ TypeScript + TailwindCSS + Zustand + React Query（TanStack Query v5）

目录结构：
src/
├── app/
│   ├── layout.tsx          # 根布局，引入全局字体和样式
│   ├── page.tsx            # 首页占位
│   ├── (public)/           # 公开页面路由组
│   └── (admin)/            # 后台管理路由组（独立 layout）
├── components/
│   ├── ui/                 # 基础 UI 组件（Button, Input, Badge, Modal 等）
│   ├── layout/             # Header, Footer, Sidebar
│   └── common/             # 通用业务组件（Pagination, ImageUpload 等）
├── lib/
│   ├── api.ts              # axios 封装，统一处理 token 和错误
│   ├── auth.ts             # 登录/登出/token 刷新逻辑
│   └── utils.ts            # 通用工具函数
├── stores/
│   └── auth.store.ts       # Zustand 用户状态
├── types/
│   └── api.ts              # API 响应类型定义 BaseResponse<T>、PageResponse<T>
└── hooks/
    └── useAuth.ts          # 认证相关 hooks

要求：
- API baseURL 从环境变量 NEXT_PUBLIC_API_URL 读取
- axios 拦截器：请求自动带 Authorization Bearer，401 自动刷新 token
- token 存 httpOnly Cookie（安全），不存 localStorage
- 提供 tailwind.config.ts 配置（主色调 #1A56A0）
- 提供 tsconfig.json，路径别名 @/ 指向 src/
- 提供 .env.local.example

请输出完整代码，不要省略。
```

**主要任务：**
- 初始化 Next.js 15 App Router 项目
- 封装 axios 实例（拦截器、token 刷新）
- 搭建路由组结构（public / admin）
- 配置 Zustand 用户状态管理
- 定义全局 TypeScript 类型

**注意事项：**
- Token 存 httpOnly Cookie，不要存 localStorage（XSS 防护）
- Next.js 15 Server Component 和 Client Component 边界要清晰
- Axios 401 拦截器要处理并发请求的 token 刷新（用 Promise 队列）

**完成目标：**
- [ ] `npm run dev` 启动无报错，首页正常显示
- [ ] TypeScript 编译无错误
- [ ] axios 实例封装完成，含 token 自动刷新逻辑
- [ ] admin 和 public 路由组结构创建完成

---

## 模块 1：用户认证

### 1-A 后端：认证 API

**提示词：**
```
基于已有的 FastAPI 项目骨架，实现用户认证模块。

数据库表（已在 models/base.py 有 Base 和 Mixin）：

users 表字段：
id(UUID PK), username(VARCHAR 50 UNIQUE), nickname(VARCHAR 100),
email(VARCHAR 100 UNIQUE), phone(VARCHAR 20 UNIQUE nullable),
password_hash(TEXT), avatar(VARCHAR 500), status(SMALLINT DEFAULT 1),
last_login_at(TIMESTAMP), created_at, updated_at, deleted_at

roles / permissions / user_roles / role_permissions 表（标准 RBAC）

需要实现的文件：
- app/models/user.py          # User、Role、Permission ORM 模型
- app/schemas/auth.py         # RegisterRequest、LoginRequest、TokenResponse、UserResponse
- app/repositories/user_repo.py  # 用户数据访问层
- app/services/auth_service.py   # 注册、登录、刷新、登出业务逻辑
- app/api/v1/auth.py             # 路由：POST /register /login /refresh /logout GET /me PUT /me

业务规则：
- 注册：username/email 唯一校验，密码 bcrypt 哈希（cost=12）
- 登录：返回 access_token（15min RS256）+ refresh_token（UUID 存 Redis 7天）
- refresh：验证 Redis 中的 refresh_token，生成新双 Token，旧 refresh_token 立即删除
- logout：从 Redis 删除 refresh_token
- 所有数据变更写 audit_logs 表
- Redis key 格式：auth:refresh:{user_id}

注意：
- Repository 层封装所有 DB 操作，Service 层不直接写 SQL
- 软删除过滤：所有查询加 deleted_at IS NULL 条件
- 返回统一格式 BaseResponse

请输出完整代码。
```

**主要任务：**
- 实现 User / Role / Permission ORM 模型
- 实现 RBAC 权限关联表
- 实现注册、登录、刷新 Token、登出接口
- 写入审计日志

**注意事项：**
- refresh_token 换新后旧 token 必须立即从 Redis 删除（防重放）
- 密码哈希使用 bcrypt，cost factor = 12
- 返回 token 时不要返回密码字段

**完成目标：**
- [ ] `POST /api/v1/auth/register` 注册成功返回用户信息
- [ ] `POST /api/v1/auth/login` 返回双 Token
- [ ] `POST /api/v1/auth/refresh` Token 刷新正常
- [ ] `POST /api/v1/auth/logout` Redis 中 Token 删除
- [ ] `GET /api/v1/auth/me` 需要登录，未登录返回 401
- [ ] Alembic migration 文件生成正确

---

### 1-B 后台管理：用户管理页面

**提示词：**
```
基于已有的 Next.js 项目，实现后台管理的用户管理模块。

页面路径：src/app/(admin)/users/page.tsx

需要实现：
1. 用户列表页（表格）
   - 列：头像、用户名、邮箱、角色、状态、注册时间、操作
   - 支持搜索（用户名/邮箱）、角色筛选、状态筛选
   - 分页（每页20条）
   - 操作：封禁/解封、修改角色、查看详情

2. 用户详情抽屉/模态框
   - 显示用户完整信息
   - 显示该用户的操作日志

3. 角色管理（同页面标签页切换）
   - 角色列表：角色名、权限数量、用户数量
   - 新增/编辑角色（含权限勾选）

组件要求：
- 使用 TailwindCSS 实现，参考 shadcn/ui 风格（不直接引入 shadcn，自己实现）
- 表格支持排序
- 所有操作有 loading 态和错误提示
- 使用 React Query 管理请求状态

API 对接：
- GET /api/v1/admin/users?page=1&page_size=20&search=&role=&status=
- PUT /api/v1/admin/users/{id}/status  封禁/解封
- PUT /api/v1/admin/users/{id}/role    修改角色
- GET /api/v1/admin/roles              角色列表
- POST/PUT /api/v1/admin/roles         新增/编辑角色

请输出完整代码，包含所有组件文件。
```

**主要任务：**
- 用户列表表格（含搜索/筛选/分页）
- 封禁/解封、修改角色操作
- 角色管理（CRUD + 权限分配）
- React Query 数据管理

**注意事项：**
- 管理员操作需要二次确认（封禁用户等危险操作）
- 表格数据更新后自动刷新（React Query invalidateQueries）
- 角色权限勾选使用树形结构展示

**完成目标：**
- [ ] 用户列表正常展示，分页正常
- [ ] 搜索和筛选联动正常
- [ ] 封禁/解封操作有确认弹窗
- [ ] 角色管理增删改正常
- [ ] 所有操作有 loading 和错误状态

---

### 1-C 前端：登录/注册页面

**提示词：**
```
基于已有的 Next.js 项目，实现用户登录和注册页面。

页面路径：
- src/app/(public)/login/page.tsx
- src/app/(public)/register/page.tsx

登录页要求：
- 邮箱/用户名 + 密码表单
- 记住我（token 有效期延长）
- 登录成功跳转到上一页或首页
- 错误提示（密码错误、账号封禁等）
- 链接到注册页

注册页要求：
- 用户名、邮箱、密码、确认密码
- 前端表单校验（用户名 3-50 字符，密码 8 位以上含字母数字）
- 注册成功自动登录跳转首页

通用要求：
- 设计风格：简洁现代，主色 #1A56A0，有 EVHub 品牌 Logo 占位
- 响应式：移动端和桌面端都好看
- 使用 react-hook-form + zod 做表单校验
- 登录态持久化：token 存 httpOnly Cookie
- 未登录访问需登录页面时自动重定向

请输出完整代码，包含所有样式。
```

**主要任务：**
- 登录表单（react-hook-form + zod）
- 注册表单（含二次密码确认）
- 登录态持久化（Cookie）
- 路由守卫（未登录自动跳转）

**注意事项：**
- 密码字段加显示/隐藏切换
- 表单提交期间禁用按钮，防止重复提交
- 错误信息要友好，不要暴露技术细节

**完成目标：**
- [ ] 登录表单校验正常，提交成功跳转
- [ ] 注册表单校验正常，两次密码一致性校验
- [ ] 未登录访问 /admin 自动跳转 /login
- [ ] 刷新页面登录态保持

---

## 模块 2：品牌与车型管理

### 2-A 后端：品牌 / 车系 / SKU API

**提示词：**
```
基于已有的 FastAPI 项目，实现产品中心模块（品牌 + 车系 + SKU + 动态属性）。

数据库表（按设计文档）：
- brands（品牌）
- vehicle_series（车系，关联 brand_id）
- vehicle_skus（SKU，关联 series_id）
- attribute_groups（属性组）
- attribute_definitions（属性定义，含 is_key_spec / is_filterable / is_comparable / display_format）
- vehicle_attribute_values（SKU 属性值，关联 sku_id + attribute_id）

需要实现：
- app/models/brand.py + vehicle_series.py + vehicle_sku.py + attribute.py
- app/repositories/ 对应 repo 文件
- app/services/vehicle_service.py
- app/api/v1/ 对应路由文件

公开接口：
- GET /api/v1/brands                    品牌列表（is_featured 置顶）
- GET /api/v1/brands/:slug              品牌详情（含车系列表）
- GET /api/v1/series/:slug              车系详情（含 SKU 列表）
- GET /api/v1/skus                      SKU 筛选列表（多维度筛选+分页）
  筛选参数：brand_slug, category, battery_type, price_min, price_max,
           range_min, requires_license, tags, sort_by
- GET /api/v1/skus/:slug                SKU 详情（含完整动态属性，按属性组分组返回）
- GET /api/v1/skus/compare?ids=a,b,c,d 多车型对比（最多4款，返回属性对比矩阵）

管理接口（需 admin 权限）：
- POST/PUT/DELETE /api/v1/admin/brands
- POST/PUT/DELETE /api/v1/admin/series
- POST/PUT/DELETE /api/v1/admin/skus
- POST/PUT/DELETE /api/v1/admin/attributes/groups
- POST/PUT/DELETE /api/v1/admin/attributes/definitions
- PUT /api/v1/admin/skus/:id/attributes  批量设置 SKU 属性值

重点：
- SKU 详情需按属性组分组返回动态属性，只展示 is_key_spec=true 的属性（卡片预览）
- 车型对比接口返回格式：{ skus: [...], attributes: [{ group, items: [{ name, values: [sku1_val, sku2_val] }] }] }
- requires_license 是独立字段（高频筛选），不放 specs JSONB
- slug 唯一性校验，自动生成（品牌名转拼音+连字符）
- 所有写操作记录 audit_logs

请输出完整代码。
```

**主要任务：**
- 实现品牌 / 车系 / SKU 三级数据模型
- 实现动态属性系统（属性定义 + 属性值）
- 实现多维度筛选接口（索引优化）
- 实现车型对比接口（属性矩阵）

**注意事项：**
- SKU 筛选要用索引字段（price_min / range_km / requires_license），不要在 JSONB 里筛选
- 动态属性按属性组分组返回，前端直接渲染
- 车型对比最多 4 款，需校验 ids 数量

**完成目标：**
- [ ] 品牌/车系/SKU CRUD 正常
- [ ] SKU 筛选接口支持所有筛选维度
- [ ] SKU 详情返回属性组分组数据
- [ ] 车型对比接口返回属性矩阵
- [ ] 动态属性增删改查正常

---

### 2-B 后台管理：车型数据管理页面

**提示词：**
```
基于已有的 Next.js 项目，实现后台管理的车型数据管理模块。

页面结构：
src/app/(admin)/vehicles/
├── page.tsx              # 品牌列表（总览）
├── brands/
│   ├── page.tsx          # 品牌管理列表
│   └── [id]/page.tsx     # 品牌编辑页
├── series/
│   ├── page.tsx          # 车系管理
│   └── [id]/page.tsx     # 车系编辑页（含封面图上传）
├── skus/
│   ├── page.tsx          # SKU 管理列表（含筛选）
│   └── [id]/page.tsx     # SKU 编辑页（含动态属性录入）
└── attributes/
    └── page.tsx          # 属性定义管理

SKU 编辑页是核心，需要：
1. 基础信息 Tab：名称、车系选择、年份、价格区间、封面图上传
2. 核心参数 Tab：电池类型、续航、电机功率、最高时速、重量、是否需驾照
3. 动态属性 Tab：按属性组展示所有属性定义，逐一填写属性值
4. 颜色/图片 Tab：颜色选项管理（标签输入），多图上传（拖拽排序）

图片上传组件要求：
- 支持点击上传和拖拽上传
- 预览缩略图
- 显示上传进度
- 上传到 POST /api/v1/media/upload，返回 cdn_url

属性定义管理页：
- 属性组增删改（拖拽排序）
- 属性定义增删改（属性名、编码、类型、单位、是否可筛选/关键参数/可对比）

请输出完整代码，包含所有子组件。
```

**主要任务：**
- 品牌 / 车系 / SKU 三级管理页面
- SKU 编辑多 Tab 表单
- 动态属性录入界面
- 图片上传组件（带进度/预览）
- 属性定义管理（分组+拖拽排序）

**注意事项：**
- SKU 编辑页表单字段多，用 Tab 分组减少视觉负担
- 动态属性录入要根据 `value_type` 展示不同输入框（数字/文本/布尔/枚举）
- 图片上传成功后立即预览，失败有错误提示

**完成目标：**
- [ ] 品牌增删改正常，logo 上传正常
- [ ] 车系增删改正常，关联品牌选择正常
- [ ] SKU 四个 Tab 数据独立保存
- [ ] 动态属性根据类型展示对应输入控件
- [ ] 图片拖拽上传、预览、进度条正常

---

### 2-C 前端：品牌与车型展示页面

**提示词：**
```
基于已有的 Next.js 项目，实现面向用户的品牌和车型展示页面。全部使用 SSR/SSG 以支持 SEO。

需要实现的页面：

1. 品牌列表页 src/app/(public)/brands/page.tsx（SSG）
   - 品牌卡片网格（Logo + 名称 + 车型数量）
   - 按国家/字母筛选（纯前端筛选）

2. 品牌详情页 src/app/(public)/brands/[slug]/page.tsx（SSR）
   - 品牌介绍（Logo、创立时间、官网链接）
   - 旗下车系网格（封面图 + 车系名 + SKU 数量）
   - generateMetadata 返回品牌 SEO meta

3. 车型筛选页 src/app/(public)/vehicles/page.tsx（SSR）
   - 左侧筛选面板（品牌、类型、电池、价格滑块、续航、是否需驾照）
   - 右侧 SKU 卡片网格（封面图、名称、关键参数、价格）
   - URL 参数同步（筛选状态持久化到 URL）
   - 骨架屏 loading

4. 车型详情页 src/app/(public)/vehicles/[slug]/page.tsx（SSR）
   - 图片轮播（多图）
   - 基础信息（名称、价格、颜色选择）
   - 参数表格（动态属性按属性组展示）
   - 相关车型推荐（同品牌）
   - 收藏按钮（需登录）
   - generateMetadata 返回完整 SEO meta
   - JSON-LD Product Schema 注入

5. 车型对比页 src/app/(public)/compare/page.tsx（CSR）
   - 最多选 4 款车型（从搜索添加）
   - 参数对比表格（属性矩阵，差异项高亮）

设计要求：
- 响应式：移动端单列，平板双列，桌面三列/四列
- 骨架屏代替 loading spinner
- 图片使用 Next.js Image 组件（自动优化）
- 主色 #1A56A0，辅色 #0F6E56

请输出完整代码，包含 generateMetadata。
```

**主要任务：**
- 品牌列表/详情页（SSG）
- 车型筛选页（SSR + URL 参数同步）
- 车型详情页（SSR + Schema.org JSON-LD）
- 车型对比页（参数差异高亮）

**注意事项：**
- 筛选状态要同步到 URL（`useSearchParams`），方便分享和 SEO
- 详情页必须有 `generateMetadata` 返回动态 meta
- JSON-LD Product Schema 按设计文档格式注入 `<head>`
- 图片全部走 Next.js Image 组件，配置 CDN domain

**完成目标：**
- [ ] 品牌列表 SSG 构建正常，页面有 meta
- [ ] 车型筛选 URL 参数同步，刷新后筛选保持
- [ ] 车型详情页 HTML source 中有 JSON-LD
- [ ] 对比页差异参数高亮显示
- [ ] 移动端布局正常

---

## 模块 3：内容管理

### 3-A 后端：文章 API

**提示词：**
```
基于已有的 FastAPI 项目，实现内容管理模块（文章系统）。

数据库表：articles、categories（支持二级分类，parent_id 自关联）

需要实现：
- app/models/article.py + category.py
- app/repositories/article_repo.py
- app/services/article_service.py
- app/api/v1/articles.py（公开接口）
- app/api/v1/admin/articles.py（管理接口）

公开接口：
- GET /api/v1/articles               文章列表（category_slug, tag, keyword, page）
- GET /api/v1/articles/:slug         文章详情（slug 访问，浏览量 +1 写 Redis）
- GET /api/v1/categories             分类树（含子分类）

管理接口（需相应权限）：
- POST   /api/v1/admin/articles      创建文章（KOL/Admin，默认 draft）
- PUT    /api/v1/admin/articles/:id  修改文章（作者本人或 Admin）
- DELETE /api/v1/admin/articles/:id  软删除（Admin）
- POST   /api/v1/admin/articles/:id/submit   提交审核（作者）
- POST   /api/v1/admin/articles/:id/publish  发布（Admin，触发 Celery 更新搜索索引和 sitemap）
- POST   /api/v1/admin/articles/:id/reject   拒绝（Admin，需填 reject_reason）
- GET    /api/v1/admin/articles/pending      待审核列表（Admin）
- POST   /api/v1/admin/categories    分类 CRUD

Celery 任务（文章发布后异步触发）：
- sync_article_to_search(article_id)  同步到 Meilisearch
- update_sitemap()                    更新 sitemap.xml

浏览量统计：
- 浏览时 Redis INCR article:view:{id}
- Celery Beat 每5分钟批量 UPDATE articles SET view_count = view_count + delta

SEO 字段：文章详情接口返回 meta_title、meta_desc、og_image_url、schema_data

请输出完整代码，包含 Celery 任务文件。
```

**主要任务：**
- 文章 CRUD + 发布工作流（5种状态）
- 分类树（二级分类）
- 浏览量统计（Redis 异步落库）
- Celery 任务（搜索索引同步 + sitemap 更新）

**注意事项：**
- 文章详情用 slug 访问，不用 id（SEO 友好）
- 发布触发的 Celery 任务要用 `.delay()` 异步调用
- 浏览量用 Redis INCR，批量落库减少 DB 写压力
- 审核工作流：只有 pending 状态才能 publish/reject

**完成目标：**
- [ ] 文章 CRUD 正常，状态流转正确
- [ ] 分类树接口返回嵌套结构
- [ ] 发布后 Celery 任务正常触发
- [ ] 浏览量 Redis 计数正常，批量落库正常
- [ ] 待审核列表按 created_at 排序

---

### 3-B 后台管理：内容管理页面

**提示词：**
```
基于已有的 Next.js 项目，实现后台管理的内容管理模块。

页面结构：
src/app/(admin)/content/
├── page.tsx              # 文章列表（含审核队列 Tab）
├── articles/
│   ├── new/page.tsx      # 新建文章
│   └── [id]/edit/page.tsx # 编辑文章
└── categories/page.tsx   # 分类管理

文章编辑器页面（核心）要求：
1. 使用 @uiw/react-md-editor 作为 Markdown 编辑器
2. 左栏：编辑器主体 + 工具栏（图片上传插入、标题层级）
3. 右侧栏（固定）：
   - 发布设置（状态、分类、标签输入）
   - SEO 设置（meta title、meta description、og image）
   - 封面图上传
   - 操作按钮（保存草稿、提交审核、发布）

文章列表页要求：
- Tab 切换：全部、草稿、待审核、已发布、已拒绝
- 待审核 Tab 高亮显示（有数量角标）
- 审核操作：内联 通过/拒绝 按钮（拒绝需填原因）
- 支持批量操作（批量发布、批量删除）

分类管理：
- 树形结构展示（最多二级）
- 拖拽排序
- 新增/编辑分类（名称、slug、类型、图标上传）

请输出完整代码，包含 Markdown 编辑器集成。
```

**主要任务：**
- Markdown 编辑器集成（含图片上传）
- 右侧发布/SEO 设置面板
- 文章列表多 Tab + 审核操作
- 分类树形管理

**注意事项：**
- 编辑器图片上传要插入 markdown 图片语法 `![](url)`
- 自动保存草稿（每30秒 debounce 保存）
- 拒绝时弹窗填写原因，不能为空

**完成目标：**
- [ ] Markdown 编辑器正常显示，图片可上传插入
- [ ] 自动保存草稿30秒触发
- [ ] 文章状态流转按钮逻辑正确
- [ ] 审核通过/拒绝操作正常
- [ ] 分类树形结构显示和管理正常

---

### 3-C 前端：文章展示页面

**提示词：**
```
基于已有的 Next.js 项目，实现面向用户的文章展示页面。全部使用 SSR/SSG 支持 SEO。

需要实现：

1. 文章列表页 src/app/(public)/articles/page.tsx（SSR）
   - 文章卡片（封面图、标题、摘要、分类、发布时间、浏览量）
   - 分类导航（横向 Tab，来自 /api/v1/categories）
   - 分页（URL 参数 page=）

2. 文章详情页 src/app/(public)/articles/[slug]/page.tsx（SSR）
   - 文章头部（标题、作者头像+名字、发布时间、阅读时长估算、浏览量）
   - Markdown 渲染（使用 react-markdown + rehype-highlight 代码高亮）
   - 右侧浮动目录（TOC，滚动高亮当前章节）
   - 底部相关文章推荐
   - 分享按钮（复制链接）
   - generateMetadata 返回完整 SEO meta
   - JSON-LD Article Schema

3. 首页内容区 src/app/(public)/page.tsx 中的文章模块
   - 热门文章（最多6篇，按 view_count 排序）
   - 最新文章（最多6篇）
   - 推荐品牌（is_featured=true 的品牌）

设计风格：
- 文章内容区最大宽度 720px，居中
- 代码块深色主题
- 目录在桌面端固定右侧，移动端折叠
- 字体：正文 16px 行高 1.8，标题清晰层级

请输出完整代码，包含 Markdown 样式。
```

**主要任务：**
- 文章列表（SSR + 分类导航）
- 文章详情（Markdown 渲染 + TOC + Schema.org）
- 首页内容聚合
- 代码高亮样式

**注意事项：**
- TOC 目录从 Markdown 内容提取 h2/h3 标题生成
- 阅读时长 = 字数 / 300（汉字每分钟约300字）
- `react-markdown` 需配置允许的 HTML 标签（防 XSS）

**完成目标：**
- [ ] 文章列表 SSR 正常，分类切换正常
- [ ] Markdown 渲染正确，代码高亮正常
- [ ] TOC 滚动时自动高亮当前章节
- [ ] 文章详情页 HTML source 有 JSON-LD
- [ ] 首页三个区块数据展示正常

---

## 模块 4：改装中心

### 4-A 后端：改装 API

**提示词：**
```
基于已有的 FastAPI 项目，实现改装中心模块。

数据库表：mod_builds（改装方案）、mod_parts（配件清单，一对多关联 build_id）

核心字段注意：
- mod_builds.is_legal (BOOLEAN NOT NULL) 是否合法改装，必须填写
- mod_builds.legal_note (TEXT) 合规说明，is_legal=false 时必填
- mod_builds.status 工作流：draft / pending / published / rejected
- mod_parts.purchase_url 购买链接（导购变现入口）
- mod_parts.is_legal 该配件是否合法

需要实现：
- app/models/mod_build.py + mod_part.py
- app/repositories/mod_repo.py
- app/services/mod_service.py
- app/api/v1/mod.py（公开接口）
- app/api/v1/admin/mod.py（管理接口）

公开接口：
- GET /api/v1/mod/builds           方案列表（按 vehicle_sku_id/tags/is_legal 筛选）
- GET /api/v1/mod/builds/:slug     方案详情（含配件清单）

用户接口（需登录）：
- POST /api/v1/mod/builds          发布方案（is_legal 必填）
- PUT  /api/v1/mod/builds/:id      修改自己的方案
- POST /api/v1/mod/builds/:id/submit 提交审核

管理接口：
- GET  /api/v1/admin/mod/pending   待审核列表
- POST /api/v1/admin/mod/:id/publish
- POST /api/v1/admin/mod/:id/reject

业务规则：
- is_legal=false 的方案需要额外人工审核（pending 队列中标记）
- 发布后触发搜索索引更新
- 所有改装方案列表页面顶部需提示：is_legal=false 方案不予发布

请输出完整代码。
```

**主要任务：**
- 改装方案 + 配件清单数据模型
- 发布工作流（含合规校验）
- 违法改装方案过滤逻辑
- 管理员审核接口

**注意事项：**
- `is_legal` 字段必须在 Service 层校验不为 null
- `is_legal=false` 的方案即使管理员也要特殊标记，不能随意发布
- 配件的 `purchase_url` 是变现入口，要记录点击数（后期）

**完成目标：**
- [ ] 发布方案时 is_legal 必填校验
- [ ] is_legal=false 方案在审核列表有醒目标记
- [ ] 配件清单 CRUD 正常（一对多）
- [ ] 工作流状态流转正确

---

### 4-B 后台管理：改装审核页面

**提示词：**
```
基于已有的 Next.js 项目，实现后台管理的改装方案审核模块。

页面路径：src/app/(admin)/mod/page.tsx

需要实现：
1. 待审核列表
   - 展示：方案标题、作者、关联车型、is_legal 状态（红色警示/绿色正常）、提交时间
   - is_legal=false 的方案在列表中用红色边框/角标醒目提示
   - 操作：查看详情、通过、拒绝

2. 方案详情模态框
   - 方案基本信息（标题、车型、费用、难度）
   - 合规状态（is_legal + legal_note 必须展示在最顶部，红色警示框）
   - 配件清单（名称、品牌、价格、购买链接、is_legal 标注）
   - 图片展示
   - 通过/拒绝操作（拒绝需填原因）

合规提示要求：
- is_legal=false 时，页面顶部显示红色警告条：
  "⚠️ 该方案包含可能违法的改装内容，请谨慎审核，不符合规定请拒绝发布"

请输出完整代码。
```

**主要任务：**
- 改装审核列表（违法方案高亮）
- 方案详情弹窗
- 合规状态顶部警示条
- 审核通过/拒绝操作

**注意事项：**
- 违法方案的视觉提示要足够醒目，避免审核人员忽略
- 拒绝原因必填，不能提交空字符串

**完成目标：**
- [ ] 违法方案在列表有红色醒目标识
- [ ] 详情弹窗顶部合规警示正常展示
- [ ] 审核通过/拒绝操作正常，拒绝原因必填
- [ ] 审核后列表自动刷新

---

### 4-C 前端：改装展示页面

**提示词：**
```
基于已有的 Next.js 项目，实现面向用户的改装中心页面。

需要实现：

1. 改装方案列表 src/app/(public)/mod/page.tsx（SSR）
   - 方案卡片（封面图、标题、关联车型、总费用、难度、作者）
   - 筛选：按车型、按合规状态（默认只显示 is_legal=true）
   - 页面顶部固定合规声明横幅：
     "本平台仅展示合法改装方案。改装前请了解当地法规，超标改装属违法行为。"

2. 改装方案详情 src/app/(public)/mod/[slug]/page.tsx（SSR）
   - 图片轮播
   - 车型信息（链接到车型详情）
   - 合规说明区块（绿色正常 / 红色警示，is_legal 字段）
   - 配件清单（名称、品牌、价格、购买按钮→purchase_url）
   - 难度和费用统计
   - 发布改装方案按钮（需登录）
   - generateMetadata + JSON-LD HowTo Schema

3. 发布改装方案页 src/app/(public)/mod/new/page.tsx（需登录）
   - 关联车型选择（搜索选择）
   - 标题、描述（Markdown 编辑器）
   - 合规声明：强制勾选 is_legal，勾选 false 时弹窗警告
   - 配件清单（动态增减行）
   - 图片上传（多图）
   - 费用、难度设置

请输出完整代码，包含合规提示相关所有 UI。
```

**主要任务：**
- 改装列表（默认过滤违法方案）
- 方案详情（含 HowTo Schema.org）
- 合规声明横幅和区块
- 发布表单（强制合规声明）

**注意事项：**
- 列表默认只显示 `is_legal=true` 的方案
- 发布表单中 `is_legal` 选择 false 时，必须弹出警告弹窗告知法律风险
- 配件的 `purchase_url` 点击需要记录（后期变现统计基础）

**完成目标：**
- [ ] 列表页顶部合规声明横幅正常展示
- [ ] 方案详情合规状态区块样式正确
- [ ] 发布表单 is_legal=false 警告弹窗正常
- [ ] 配件清单动态增减正常
- [ ] HowTo JSON-LD 在 HTML source 中存在

---

## 模块 5：社区功能

### 5-A 后端：社区 API

**提示词：**
```
基于已有的 FastAPI 项目，实现社区中心模块（帖子 + 评论 + 点赞 + 收藏）。

数据库表：topics、comments（通用，target_type+target_id）、likes、favorites、notifications

需要实现：
- app/models/community.py（Topic、Comment、Like、Favorite、Notification）
- app/repositories/comment_repo.py + topic_repo.py
- app/services/community_service.py
- app/api/v1/community.py

接口：
帖子：
- GET  /api/v1/topics                分页列表（按 last_reply_at 排序）
- GET  /api/v1/topics/:id            详情（含楼层评论，一级评论分页）
- POST /api/v1/topics                发帖（登录）
- DELETE /api/v1/topics/:id          删除（作者或 Admin 软删除）

评论（通用，支持文章/车型/改装/帖子）：
- GET  /api/v1/comments?target_type=&target_id=&page=   评论列表
- POST /api/v1/comments              发评论（登录，target_type+target_id+content）
- DELETE /api/v1/comments/:id        删除（作者或 Admin）

点赞/收藏（通用）：
- POST   /api/v1/likes               点赞（登录）
- DELETE /api/v1/likes               取消（登录）
- POST   /api/v1/favorites           收藏
- DELETE /api/v1/favorites           取消收藏
- GET    /api/v1/user/favorites      我的收藏列表

通知：
- GET  /api/v1/notifications         我的通知列表（未读优先）
- POST /api/v1/notifications/read-all 全部已读

业务规则：
- 评论/点赞后通过 Celery 异步通知被评论/被点赞的用户（写 notifications 表）
- 评论支持二级回复（parent_id），最多两级，不无限嵌套
- 楼层号：同一 target 下的评论按 created_at 自动编号
- 点赞/收藏需要幂等（重复操作不报错，返回当前状态）

请输出完整代码，包含 Celery 通知任务。
```

**主要任务：**
- 帖子 + 通用评论系统（二级回复）
- 通用点赞/收藏（target_type 设计）
- 通知系统（Celery 异步）
- 楼层号自动编号

**注意事项：**
- 评论最多二级，避免无限嵌套（parent 的 parent_id 必须为 null）
- 点赞/收藏幂等处理：用 `INSERT ... ON CONFLICT DO NOTHING`
- 冗余计数（`like_count` / `reply_count`）用 Celery 异步更新，不实时 COUNT

**完成目标：**
- [ ] 帖子发布/查看正常
- [ ] 评论二级回复正常，楼层号递增
- [ ] 点赞/收藏幂等，重复操作不报错
- [ ] 通知在被触发后异步写入数据库
- [ ] 通知列表未读优先排序

---

### 5-B 前端：社区页面

**提示词：**
```
基于已有的 Next.js 项目，实现面向用户的社区功能页面。

需要实现：

1. 社区首页 src/app/(public)/community/page.tsx（SSR）
   - 帖子列表（标题、作者、回复数、最后回复时间）
   - 置顶帖子（is_pinned=true 置顶显示）
   - 分类 Tab 切换

2. 帖子详情 src/app/(public)/community/[id]/page.tsx（SSR）
   - 帖子内容（Markdown 渲染）
   - 评论列表（按楼层排序，显示楼层号）
   - 二级回复折叠展示
   - 发表评论框（需登录）
   - 点赞按钮（实时更新）

3. 发帖页 src/app/(public)/community/new/page.tsx（需登录）
   - 标题输入
   - 内容 Markdown 编辑器
   - 分类选择
   - 图片上传

4. 通知中心 src/app/(public)/notifications/page.tsx（需登录）
   - 通知列表（点赞/评论/审核结果分类）
   - 未读数量 Badge（在导航栏显示）
   - 点击通知跳转对应内容
   - 全部已读按钮

通用组件：
- LikeButton 组件：乐观更新（点击立即更新 UI，失败回滚）
- CommentBox 组件：支持 @用户名 回复
- NotificationBadge：轮询未读数量（每60秒，登录态）

请输出完整代码。
```

**主要任务：**
- 帖子列表/详情
- 通用评论组件（楼层 + 二级回复）
- 点赞乐观更新
- 通知中心 + 导航栏角标

**注意事项：**
- 点赞用乐观更新（先更新 UI，API 失败再回滚），提升体验
- 未读通知数量轮询频率不要太高（60秒即可），不要用 WebSocket（过早优化）
- 评论 @用户名 只做 UI 展示，不需要后端实现真正的 mention 系统

**完成目标：**
- [ ] 帖子列表展示正常，置顶帖子在顶部
- [ ] 评论楼层号正确，二级回复折叠
- [ ] 点赞乐观更新，失败有错误提示
- [ ] 通知中心分类展示正常
- [ ] 导航栏未读数 Badge 正常更新

---

## 模块 6：搜索功能

### 6-A 后端：搜索 API

**提示词：**
```
基于已有的 FastAPI 项目，实现搜索中心模块。当前阶段使用 PostgreSQL 全文检索，架构上预留切换 Meilisearch 的接口层。

需要实现：
- app/services/search_service.py（抽象接口 + PostgreSQL 实现）
- app/api/v1/search.py
- app/tasks/search_tasks.py（索引同步任务）

接口：
- GET /api/v1/search?q=关键词&type=all|article|vehicle|brand|mod&page=1
  返回分组结果：{ articles: [], vehicles: [], brands: [], total: 0 }
- GET /api/v1/search/suggest?q=九号  联想建议（从 search_keywords 表 + 车型名/品牌名）
- GET /api/v1/search/hot             热搜榜（search_count 最高的10个）

PostgreSQL 全文检索实现：
- 文章：tsvector 索引 (title*A + excerpt*B + content*C)，中文用 pg_trgm
- 车型：搜索 model_name + brand name JOIN
- 品牌：搜索 name + description
- 使用 GIN 索引加速

搜索关键词统计：
- 每次搜索后异步（Celery）更新 search_keywords 表的 search_count

搜索服务抽象层设计：
class SearchService:
    async def search(q, type, page) -> SearchResult  # 当前: PG实现
    async def suggest(q) -> list[str]
    async def sync_document(type, id, data)          # 文档同步（Celery调用）
    async def remove_document(type, id)

注释说明：切换到 Meilisearch 时只需实现 MeilisearchSearchService 替换注入即可

请输出完整代码。
```

**主要任务：**
- 搜索服务抽象层（方便切换引擎）
- PostgreSQL 全文检索实现（pg_trgm）
- 联想建议（热词 + 资源名）
- 热搜榜统计
- 搜索词 Celery 异步统计

**注意事项：**
- 搜索服务必须做抽象层，不要直接写死 PG 实现
- pg_trgm 需要在 migration 中 `CREATE EXTENSION pg_trgm`
- 中文搜索 pg_trgm 效果有限，要在注释中说明切换 Meilisearch 的时机

**完成目标：**
- [ ] 全站搜索返回分组结果
- [ ] 联想建议响应 < 200ms
- [ ] 热搜榜数据正确更新
- [ ] 搜索词统计异步写入
- [ ] 抽象层设计，替换引擎只改实现类

---

### 6-B 前端：搜索功能

**提示词：**
```
基于已有的 Next.js 项目，实现全站搜索功能。

需要实现：

1. 搜索框组件 src/components/common/SearchBar.tsx
   - 输入时 debounce 300ms 请求联想建议
   - 下拉展示建议（分组：车型/文章/品牌）
   - 回车或点击搜索跳转搜索结果页
   - 热搜词展示（搜索框为空时）

2. 搜索结果页 src/app/(public)/search/page.tsx（SSR）
   - URL 参数：?q=关键词&type=all
   - 顶部 Tab：全部、车型、文章、品牌、改装方案
   - 各 Tab 显示对应分组结果
   - 关键词高亮（搜索词在结果中高亮）
   - 无结果时展示推荐内容

3. 导航栏集成
   - 桌面端：搜索框常驻导航栏
   - 移动端：搜索图标点击展开全屏搜索

搜索词高亮实现：
- 用正则将搜索词在标题/摘要中用 <mark> 包裹
- 注意 XSS：只在纯文本中做替换，不在 HTML 中操作

请输出完整代码，包含 debounce 和键盘导航。
```

**主要任务：**
- 搜索框（debounce + 联想下拉）
- 搜索结果页（分 Tab 展示）
- 关键词高亮
- 移动端全屏搜索

**注意事项：**
- debounce 300ms，不要每次击键都请求
- 键盘导航（上下方向键选择联想词，Escape 关闭）
- 高亮时注意 XSS，用 DOM 操作而不是 innerHTML

**完成目标：**
- [ ] 搜索框 debounce 联想正常
- [ ] 键盘上下选择联想词正常
- [ ] 搜索结果分 Tab 展示
- [ ] 搜索词在结果中高亮
- [ ] 移动端全屏搜索体验正常

---

## 模块 7：SEO 与性能优化

### 7-A 后端：SEO 接口

**提示词：**
```
基于已有的 FastAPI 项目，实现 SEO 支撑模块。

需要实现：
- app/api/v1/seo.py
- app/tasks/sitemap_tasks.py（Sitemap 生成）

接口：
- GET /sitemap.xml          动态生成 XML sitemap（所有已发布文章、车型、品牌）
- GET /robots.txt           robots 规则（允许所有爬虫，disallow /api/）
- GET /api/v1/seo/schema/:type/:id  返回指定资源的 JSON-LD 数据

Sitemap 设计：
- 首页 priority=1.0，changefreq=daily
- 文章页 priority=0.8，changefreq=weekly，lastmod=published_at
- 车型页 priority=0.9，changefreq=monthly
- 品牌页 priority=0.7，changefreq=monthly
- 改装方案页 priority=0.6，changefreq=weekly

Sitemap 生成策略：
- 每次文章/车型发布后，Celery 任务重新生成并缓存到 Redis（TTL 1小时）
- GET /sitemap.xml 直接从 Redis 读取缓存，缓存不存在时实时生成
- 条目超过5万时自动拆分为 sitemap_index.xml + sitemap_1.xml...

Schema.org 数据格式（参考设计文档）：
- vehicle_sku → Product schema
- article → Article schema
- brand → Organization schema  
- mod_build → HowTo schema

请输出完整代码。
```

**主要任务：**
- sitemap.xml 动态生成（Redis 缓存）
- robots.txt 接口
- Schema.org JSON-LD 接口

**注意事项：**
- sitemap 用 Redis 缓存，不要每次请求都查 DB
- 超过5万条目要分页（sitemap index）
- JSON-LD 数据格式要符合 Google 结构化数据要求

**完成目标：**
- [ ] `/sitemap.xml` 返回有效 XML，Google Search Console 可验证
- [ ] `/robots.txt` 格式正确
- [ ] Schema.org 接口返回各类型 JSON-LD
- [ ] 文章发布后 sitemap 自动更新

---

### 7-B 前端：性能与 SEO 优化

**提示词：**
```
基于已有的 Next.js 项目，实现全站 SEO 和性能优化。

需要实现：

1. 全局 SEO 配置 src/app/layout.tsx
   - 默认 metadata（site name、description、og:image、twitter card）
   - 全局 JSON-LD（WebSite schema + SearchAction）

2. 动态 Metadata 工具 src/lib/seo.ts
   - buildMetadata(title, description, image, url) → Metadata 对象
   - buildJsonLd(type, data) → JSON-LD 对象
   - 在各详情页使用

3. 性能优化
   - 首页使用 ISR（revalidate: 3600）
   - 文章列表使用 SSR（revalidate: 300）
   - 详情页使用 SSR
   - 图片全部走 Next.js Image（domains 配置 R2 CDN 域名）

4. 核心 Web Vitals 优化
   - 字体使用 next/font（本地化，避免 Google Fonts 阻塞）
   - 关键 CSS 内联（TailwindCSS 已处理）
   - 延迟加载非首屏组件（dynamic import）

5. 分析接入
   - Google Analytics 4（通过 Script 组件，afterInteractive 策略）
   - Vercel Analytics（直接引入 @vercel/analytics）

请输出完整代码，包含所有 SEO 工具函数。
```

**主要任务：**
- 全局 metadata 配置
- SEO 工具函数封装
- ISR/SSR 缓存策略
- Core Web Vitals 优化
- Analytics 接入

**注意事项：**
- `next/font` 配置要设置 `display: swap` 避免 FOIT
- ISR 的 `revalidate` 值根据内容更新频率设置
- Analytics Script 必须用 `afterInteractive` 策略，不阻塞首屏

**完成目标：**
- [ ] Lighthouse SEO 分数 > 95
- [ ] Lighthouse Performance 分数 > 85
- [ ] 所有页面有正确 meta title 和 description
- [ ] 核心页面有 JSON-LD 结构化数据
- [ ] GA4 数据正常上报

---

## 模块 8：系统管理与收尾

### 8-A 后台管理：Dashboard 首页

**提示词：**
```
基于已有的 Next.js 项目，实现后台管理 Dashboard 首页。

页面路径：src/app/(admin)/dashboard/page.tsx

需要实现：

1. 数据统计卡片（顶部4个）
   - 总用户数（今日新增）
   - 总文章数（今日发布）
   - 总车型数
   - 今日 PV

2. 待处理事项（重要）
   - 待审核文章数量（链接到文章管理）
   - 待审核改装方案数量（链接到改装管理）
   - 违法改装方案数量（红色警示）

3. 内容趋势图（折线图）
   - 近7天：文章发布数 vs 访问量
   - 使用 Recharts 实现

4. 热门内容 Top 5
   - 热门文章（按 view_count）
   - 热门车型（按 view_count）

5. 最近操作日志（审计日志最新10条）

后端需补充接口：
GET /api/v1/admin/stats
返回：{ users: { total, today }, articles: { total, today, pending }, vehicles: { total }, pv_today: N, pending_mod: N, illegal_mod: N }

请输出完整代码，包含图表组件。
```

**主要任务：**
- 统计数据卡片
- 待处理事项（醒目展示违法方案数）
- 趋势折线图（Recharts）
- 热门内容榜单
- 操作日志展示

**注意事项：**
- 违法改装方案数量要用红色警示色，不能和普通待审核混在一起
- 图表数据从后端接口获取，不要用假数据
- Dashboard 数据适当缓存（Redis），避免每次请求都聚合查询

**完成目标：**
- [ ] 统计卡片数据真实来自 API
- [ ] 违法方案数量红色警示展示
- [ ] 折线图正常渲染
- [ ] 热门榜单正常展示
- [ ] 审计日志最新10条展示

---

### 8-B 后台管理：导航与权限路由

**提示词：**
```
基于已有的 Next.js 项目，完善后台管理的导航结构和权限路由守卫。

需要实现：

1. 后台 Layout src/app/(admin)/layout.tsx
   - 左侧导航菜单（折叠/展开）
   - 顶部导航栏（用户信息、通知、退出）
   - 面包屑导航
   - 响应式（移动端抽屉式导航）

2. 导航菜单结构：
   - Dashboard（仪表盘）
   - 内容管理（文章/分类）
   - 车型数据（品牌/车系/SKU/属性）
   - 改装管理（待审核/已发布）
   - 社区管理（帖子/评论举报）
   - 用户管理（用户列表/角色权限）
   - SEO 管理（页面 SEO/关键词）
   - 系统设置

3. 权限路由守卫 src/middleware.ts（Next.js middleware）
   - 访问 /admin/* 路由时校验 Cookie 中的 token
   - token 无效跳转 /login?redirect=...
   - 不同角色看到不同菜单项

4. 后台全局组件
   - Toast 通知（操作成功/失败提示）
   - 确认弹窗（危险操作二次确认）
   - 全局 Loading 状态

请输出完整代码，包含 Next.js middleware.ts。
```

**主要任务：**
- 后台 Layout（左侧导航 + 顶部栏）
- Next.js middleware 路由守卫
- 角色权限菜单控制
- 全局 Toast / 确认弹窗

**注意事项：**
- middleware.ts 只做轻量校验（token 格式/有效期），不要在 middleware 里查 DB
- 菜单权限控制在前端做显示隐藏，真正的权限校验在后端接口
- 移动端导航必须可用，不能只做桌面端

**完成目标：**
- [ ] 未登录访问 /admin 自动跳转登录页
- [ ] 不同角色看到不同菜单项
- [ ] 左侧导航折叠正常
- [ ] 移动端抽屉导航正常
- [ ] Toast 组件全局可用

---

## 执行顺序总览

```
模块 0：项目骨架（后端 → 前端）
   ↓
模块 1：用户认证（后端 API → 后台管理 → 前端页面）
   ↓
模块 2：品牌车型（后端 API → 后台管理 → 前端页面）
   ↓
模块 3：内容管理（后端 API → 后台管理 → 前端页面）
   ↓
模块 4：改装中心（后端 API → 后台管理 → 前端页面）
   ↓
模块 5：社区功能（后端 API → 前端页面）
   ↓
模块 6：搜索功能（后端 API → 前端组件）
   ↓
模块 7：SEO 与性能（后端接口 → 前端优化）
   ↓
模块 8：Dashboard 与收尾（后台 + 路由守卫）
```

---

## 任务完成状态追踪

| 模块 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 0-A | 后端骨架 | ✅ 已完成 | FastAPI项目骨架创建完成，服务器启动正常 |
| 0-B | 前端骨架 | ✅ 已完成 | Next.js 15项目创建完成，构建成功，9个页面 |
| 1-A | 认证 API | ✅ 已完成 | User/Role/Permission模型、注册/登录/刷新/登出/me接口、审计日志、Alembic配置 |
| 1-B | 用户管理后台 | ✅ 已完成 | 后端Admin API(用户列表/封禁/角色CRUD/权限设置) + 前端用户管理页面(搜索/分页/角色Tab/权限弹窗) |
| 1-C | 登录注册页面 | ✅ 已完成 | react-hook-form+zod表单校验、密码显隐切换、登录/注册流程、admin路由守卫、/login + /register 页面 |
| 2-A | 品牌车型 API | ✅ 已完成 | Brand/Series/Sku/AttributeGroup/Definition/Value六个模型、公开品牌/车系/SKU接口+筛选+对比、Admin管理接口全CRUD |
| 2-B | 车型管理后台 | ✅ 已完成 | 8个管理页面：品牌/车系/SKU CRUD + 属性定义管理(含弹窗) + SKU四Tab编辑(基础/参数/动态属性/颜色标签) |
| 2-C | 品牌车型前端 | ✅ 已完成 | 品牌列表SSG+详情SSR+车型筛选SSR(URL参数同步)+车型详情SSR(JSON-LD)+对比CSR(差异高亮)，admin路由前缀化 |
| 3-A | 文章 API | ✅ 已完成 | Category+Article模型、公开文章列表/详情/分类树、管理CRUD+工作流(submit/publish/reject)、Redis浏览量计数+Celery批量落库 |
| 3-B | 内容管理后台 | ✅ 已完成 | 4个页面：文章列表(5Tab状态筛选+审核操作+拒绝弹窗)、新建文章(MDEditor+右侧SEO面板+30s自动保存)、编辑文章、分类树形管理(增删改+二级限制) |
| 3-C | 文章展示前端 | ✅ 已完成 | 文章列表SSR(分类Tab+分页)、文章详情SSR(react-markdown+rehype-highlight+TOC目录+JSON-LD)、首页三个内容区块(推荐品牌+热门文章+最新文章) |
| 4-A | 改装 API | ✅ 已完成 | ModBuild+ModPart模型(一对多)、公开列表/详情(含配件清单)、用户CRUD+工作流(submit)、Admin审核(publish/reject/pending)、is_legal必填校验 |
| 4-B | 改装审核后台 | ✅ 已完成 | 1个页面：admin/mod改装审核列表(4Tab状态筛选+违法方案红色警示/角标/左侧边框+列表顶部统计提示)、方案详情模态框(合规警告条+配件清单+内容预览+审核操作)、拒绝弹窗(原因必填) |
| 4-C | 改装展示前端 | ✅ 已完成 | 3个页面：方案列表SSR(合规横幅+is_legal筛选+方案卡片+分页)、方案详情SSR(合规区块+Markdown+配件清单表格含购买按钮+HowTo Schema+4栏统计)、发布方案(车型搜索选择+合规声明radio+非合规警告弹窗+配件动态增减+Markdown内容) |
| 5-A | 社区 API | ✅ 已完成 | Topic(置顶/精华/回复数)+Comment(通用评论/target_type+target_id/二级回复/楼层号)+Like+Favorite+Notification模型、5个Repo+1个Service(通知自动生成)、14个API(帖子CRUD+评论CRUD+点赞toggle+收藏toggle+收藏列表+通知列表/全部已读) |
| 5-B | 社区前端 | ✅ 已完成 | 4个页面：社区首页SSR(置顶帖子+回复/点赞/浏览统计卡片+relative time)、帖子详情SSR+TopicClient(评论+二级回复折叠+楼层号#1+点赞+回复输入框)、发帖页(需登录+标题/内容/标签)、通知中心(未读优先+类型图标+全部已读+跳转)，新增4个TS类型 |
| 6-A | 搜索 API | ✅ 已完成 | 3个API：GET /search(分组结果articles/vehicles/brands+pg_trgm模糊匹配+ILIKE+similarity排序)+GET /search/suggest(热词+品牌名+车型名补全)+GET /search/hot(热搜榜)、SearchService抽象接口+PgSearchService实现、search_keywords统计表+自动记录 |
| 6-B | 搜索前端 | ✅ 已完成 | 3个文件：SearchBar组件(debounce 300ms联想建议+热搜榜下拉+键盘导航↑↓Enter Escape+关键词高亮<mark>)、搜索页SSR+SearchClient(Tab切换全部/文章/车型/品牌+类型图标+分页)、Navbar导航栏(品牌/车型/文章/改装/社区链接+搜索框+登录态+铃铛图标通知入口+发帖按钮+移动端搜索图标) |
| 7-A | SEO 接口 | ✅ 已完成 | sitemap.xml动态生成(Redis缓存1h+优先级首页1.0→车型0.9→文章0.8→品牌0.7→改装0.6+>5万自动sitemap_index分片)+robots.txt(允许爬虫/disallow /api/和/admin/)+JSON-LD Schema接口(vehicle→Product/article→Article/brand→Organization/mod→HowTo)+sitemap缓存失效方法 |
| 7-B | 性能优化 | ✅ 已完成 | lib/seo.tsx(buildMetadata+OGP+Twitter Card+buildJsonLd WebSite/Article/Product/HowTo/BreadcrumbList+JsonLd组件)+根布局(robots index/follow+GA4+WebSite JSON-LD+SearchAction)+首页ISR revalidate 3600 |
| 8-A | Dashboard | ✅ 已完成 | 后端3个API：GET /admin/stats(Redis缓存5min+用户/文章/车型统计+今日增量+待审核+违法方案#红色警示)+GET /admin/trends(7天折线数据+缓存)+GET /admin/audit-logs(最近10条)、前端Dashboard页：4色统计卡片(蓝/绿/紫/橙border-l)+待处理事项(文章+改装链接+违法⚠️红底)+Recharts折线图+操作日志表格(操作类型中文映射+timeAgo) |
| 8-B | 导航与路由守卫 | ✅ 已完成 | AdminLayout增强(左侧菜单active高亮+图标📊📝🚗🔧👤+移动端抽屉式sidebar+汉堡按钮+遮罩层+面包屑中文化映射+顶部"查看前台"链接)、middleware.ts(token校验/admin角色editor+重定向带redirect参数)、Toast全局通知组件(success/error/info三种+auto-dismiss 3.5s+Providers集成) |

---

*AI 开发任务规划 V1.0 — 附录于 EVHub 完整技术设计文档 V4.0*
