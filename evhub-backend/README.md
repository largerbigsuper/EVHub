# EVHub Backend

两轮电动车专业内容与数据平台 - 后端服务

## 技术栈

- **框架**: FastAPI (Python 3.12+)
- **数据库**: PostgreSQL 17 + SQLAlchemy 2.0 (async)
- **缓存**: Redis
- **认证**: JWT (RS256) 双 Token
- **搜索**: Meilisearch
- **任务队列**: Celery + Redis
- **迁移**: Alembic

## 项目结构

```
evhub-backend/
├── app/
│   ├── main.py              # FastAPI 入口，中间件注册
│   ├── config.py             # 环境变量配置
│   ├── dependencies.py       # 依赖注入
│   ├── api/v1/               # API 路由
│   │   ├── auth.py           # 认证接口
│   │   ├── admin_users.py    # 用户管理
│   │   ├── admin_roles.py    # 角色管理
│   │   └── router.py         # 路由汇总
│   ├── core/                 # 核心模块
│   │   ├── database.py       # 数据库连接
│   │   ├── redis.py          # Redis 连接
│   │   ├── security.py       # JWT + bcrypt
│   │   ├── exceptions.py     # 自定义异常
│   │   └── response.py       # 统一响应
│   ├── models/               # ORM 模型
│   │   ├── base.py           # Base + Mixin
│   │   ├── user.py           # User/Role/Permission
│   │   └── audit_log.py      # 审计日志
│   ├── repositories/         # 数据访问层
│   ├── schemas/              # Pydantic Schema
│   ├── services/             # 业务逻辑层
│   └── middleware/           # 中间件
├── tests/                    # 测试
├── migrations/               # Alembic 迁移
├── docker-compose.yml        # Docker 编排
├── Dockerfile                # 镜像构建
├── requirements.txt          # 依赖
└── .env.example              # 环境变量模板
```

## 快速启动

### 1. 环境准备

- Python 3.12+
- PostgreSQL 17
- Redis 8

### 2. 安装依赖

```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入实际配置
```

### 4. 启动基础设施

```bash
docker-compose up -d postgres redis
```

### 5. 数据库迁移

```bash
alembic upgrade head
```

### 6. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. 访问

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## API 概览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/register | 注册 |
| POST | /api/v1/auth/login | 登录 |
| POST | /api/v1/auth/refresh | 刷新 Token |
| POST | /api/v1/auth/logout | 登出 |
| GET | /api/v1/auth/me | 当前用户 |
| PUT | /api/v1/auth/me | 更新资料 |

### 管理后台
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/admin/users | 用户列表 |
| PUT | /api/v1/admin/users/{id}/status | 封禁/解封 |
| PUT | /api/v1/admin/users/{id}/role | 修改角色 |
| GET | /api/v1/admin/roles | 角色列表 |
| POST | /api/v1/admin/roles | 创建角色 |
| PUT | /api/v1/admin/roles/{id} | 编辑角色 |
| DELETE | /api/v1/admin/roles/{id} | 删除角色 |
| PUT | /api/v1/admin/roles/{id}/permissions | 设置权限 |
| GET | /api/v1/admin/permissions | 权限列表 |

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "meta": { "page": 1, "page_size": 20, "total": 100, "total_pages": 5 }
}
```