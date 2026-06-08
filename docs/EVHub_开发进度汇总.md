# EVHub 开发进度汇总

## 模块 0：项目骨架初始化 ✅

### 0-A 后端骨架
- FastAPI 项目结构创建，含 CORS/日志/限流/错误处理中间件
- SQLAlchemy 2.0 异步引擎 + Redis 连接池 + JWT 安全模块
- 统一响应格式 `{code, message, data}`
- Docker Compose 配置（PostgreSQL + Redis + Meilisearch）
- 启动命令：`uvicorn app.main:app --reload`

### 0-B 前端骨架
- Next.js 15 App Router + TypeScript + TailwindCSS v4
- 路由组：`(public)` 和 `(admin)` 双 layout
- axios 封装：自动 Bearer Token + 401 并发刷新队列
- Zustand 用户状态管理 + TanStack React Query
- Token 存 httpOnly Cookie，不存 localStorage
- 启动命令：`npm run dev`

---

## 模块 1：用户认证 ✅

### 1-A 后端认证 API
- 6 个接口：`POST /register`、`/login`、`/refresh`、`/logout`、`GET /me`、`PUT /me`
- User / Role / Permission / UserRole / RolePermission 五个 ORM 模型
- RBAC 权限体系，用户可关联多个角色
- 注册：用户名/邮箱唯一校验，bcrypt 哈希 cost=12
- 登录：返回 access_token(RS256, 15min) + refresh_token(UUID, Redis 7天)
- 刷新：旧 refresh_token 立即删除（防重放）
- 所有写操作自动写入 audit_logs 表

### 1-B 后台用户管理
- 后端 Admin API 9 个接口：
  - `GET /admin/users` 用户列表（搜索/分页）
  - `PUT /admin/users/{id}/status` 封禁/解封
  - `PUT /admin/users/{id}/role` 修改角色
  - `GET /admin/roles` 角色列表（含用户数/权限数统计）
  - `GET /admin/roles/{id}` 角色详情（含权限列表）
  - `POST /admin/roles` 创建角色
  - `PUT /admin/roles/{id}` 编辑角色
  - `DELETE /admin/roles/{id}` 删除角色
  - `PUT /admin/roles/{id}/permissions` 设置角色权限
  - `GET /admin/permissions` 权限列表
- 前端用户管理页面：
  - 用户列表 Tab：搜索、分页、角色下拉切换、封禁/解封（确认弹窗）
  - 角色管理 Tab：新增/编辑/删除角色、权限设置（按资源分组复选框）
- 所有管理操作写入审计日志

### 1-C 前端登录/注册页面
- `/login` 登录页：用户名/邮箱 + 密码表单，密码显隐切换，错误提示
- `/register` 注册页：用户名/邮箱/密码/确认密码，密码强度校验（至少8位+字母+数字）
- react-hook-form + zod 表单校验，提交时禁用按钮防重复
- 注册成功后自动登录跳转首页
- admin 路由守卫：未登录自动跳转 `/login`，登出后重定向
- 响应式设计，移动端和桌面端均适配

---

## 模块 2：品牌与车型管理 🟡

### 2-A 后端品牌车型 API
- 6 个 ORM 模型：Brand / VehicleSeries / VehicleSku / AttributeGroup / AttributeDefinition / VehicleAttributeValue
- 三级数据体系：品牌 → 车系 → SKU
- 动态属性系统：属性组 + 属性定义（支持 number/text/boolean 三种值类型）+ SKU 属性值
- 公开接口（7 个）：
  - `GET /brands` 品牌列表（featured 置顶）
  - `GET /brands/{slug}` 品牌详情（含车系列表）
  - `GET /series/{slug}` 车系详情（含 SKU 列表）
  - `GET /skus` SKU 筛选列表（品牌/电池/价格/续航/驾照/排序分页）
  - `GET /skus/{slug}` SKU 详情（含动态属性组）
  - `GET /skus/compare?ids=a,b` 车型对比（最多4款，属性矩阵）
- 管理接口（17 个）：
  - 品牌 CRUD / 车系 CRUD / SKU CRUD + 属性批量设置
  - 属性组 CRUD / 属性定义 CRUD
- 所有写操作写入审计日志