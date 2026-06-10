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

### 2-A 后端品牌车型 API ✅
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

### 2-B 后台车型数据管理 ✅
- 8 个页面文件：
  - `/admin/vehicles` 品牌总览页（品牌卡片网格 + 快捷入口）
  - `/admin/vehicles/brands` 品牌管理列表（表格+CRUD弹窗）
  - `/admin/vehicles/brands/[id]` 品牌编辑页（表单+车系列表侧栏）
  - `/admin/vehicles/series` 车系管理列表（并发获取全部车系）
  - `/admin/vehicles/skus` SKU 管理列表（筛选：品牌/电池/续航/驾照 + 分页）
  - `/admin/vehicles/skus/[id]` SKU 编辑页（4 Tab：基础信息/核心参数/动态属性/颜色标签）
  - `/admin/vehicles/skus/new` 新增 SKU（自动跳转编辑页）
  - `/admin/vehicles/attributes` 属性定义管理（属性组展开/折叠 + 属性定义CRUD弹窗）
- 动态属性：按 value_type（text/number/boolean）展示对应输入控件
- 品牌/车系/SKU 三级级联选择
- 颜色和标签支持输入+回车添加，可删除

---

## 模块 2-C：品牌车型前端 ✅

- 5 个公开页面 + 1 个客户端组件：
  - `/brands` 品牌列表页（SSG, revalidate=1h）：推荐品牌置顶 + 按国家/字母搜索筛选
  - `/brands/[slug]` 品牌详情页（SSR）：品牌介绍 + 车系网格 + generateMetadata SEO
  - `/vehicles` 车型筛选页（SSR）：左侧筛选面板(品牌/电池/价格/续航/驾照/排序) + URL参数同步 + 骨架屏
  - `/vehicles/[slug]` 车型详情页（SSR）：核心参数卡片 + 动态属性表格 + 颜色/标签展示 + 收藏按钮 + 同品牌推荐 + JSON-LD Product Schema + generateMetadata+OpenGraph
  - `/compare` 车型对比页（CSR）：搜索添加车型(最多4款) + 属性矩阵对比 + 差异项高亮
- 架构调整：admin 路由统一加 `/admin` 前缀（`(admin)/admin/...`），与 public 路由无冲突
- 全部 SSR/SSG 页面使用 `fetch()` 直接调用后端 API（不依赖 axios）

---

## 模块 3：内容管理

### 3-A 后端文章 API ✅

- 2 个 ORM 模型：`categories`（二级分类，parent_id 自关联）+ `articles`（含 SEO 字段、JSONB tags）
- 公开接口（3 个）：
  - `GET /articles` 文章列表（category_slug/tag/keyword 筛选 + 分页）
  - `GET /articles/{slug}` 文章详情（Redis INCR 浏览量）
  - `GET /articles/categories` 分类树（含子分类嵌套）
- 管理接口（12 个）：
  - 文章 CRUD + 状态流转（submit/publish/reject）+ 待审核列表 + 软删除
  - 分类 CRUD
- 文章工作流：draft → pending(提交审核) → published(发布) / rejected(拒绝，填写原因)
- 浏览量：Redis INCR 实时计数，Celery Beat 每 5 分钟批量落库
- Celery 基础设施：celery_app.py + article_tasks.py（sync_article_view_counts）

### 3-B 内容管理后台 ✅

- 4 个管理页面：
  - `/admin/content` 文章列表（5 个 Tab：全部/草稿/待审核/已发布/已拒绝）+ 待审核角标 + 内联审核操作（通过/拒绝弹窗）+ 分页
  - `/admin/content/articles/new` 新建文章（@uiw/react-md-editor 编辑器 + 右侧发布设置/SEO 面板 + 30s 自动保存草稿）
  - `/admin/content/articles/[id]/edit` 编辑文章（加载已有数据 + 保存/提交审核/发布三按钮）
  - `/admin/content/categories` 分类树形管理（增删改 + 二级限制 + 父分类选择器）
- 新增依赖：@uiw/react-md-editor、react-hook-form、zod、@hookform/resolvers

### 3-C 文章展示前端 ✅

- 3 个页面 + 1 个 Client 组件：
  - `/` 首页重写：Hero 区 + 推荐品牌(is_featured) + 热门文章(view_count排序) + 最新文章 + 底部CTA
  - `/articles` 文章列表（SSR）：分类横向 Tab + 12篇/页分页 + URL参数同步(category/tag/page) + 卡片含封面/分类标签/日期/阅读量
  - `/articles/[slug]` 文章详情（SSR）：react-markdown + remarkGfm + rehypeHighlight + rehypeSlug + TOC滚动高亮 + JSON-LD Article Schema + generateMetadata(OGP) + 复制链接分享
  - `ArticleClient.tsx`：客户端交互组件（TOC IntersectionObserver + 复制链接按钮）
- 新增依赖：react-markdown、rehype-highlight、rehype-slug、remark-gfm

---

## 模块 4：改装中心

### 4-A 后端改装 API ✅

- 2 个 ORM 模型：`mod_builds`（方案）+ `mod_parts`（配件清单，一对多，cascade delete-orphan）
- 公开接口（2 个）：
  - `GET /mod/builds` 方案列表（vehicle_sku_id/tag/is_legal 筛选 + 分页）
  - `GET /mod/builds/{slug}` 方案详情（含配件清单 + 作者信息）
- 用户接口（4 个，需登录）：
  - `POST /mod/builds` 创建方案（is_legal 必填 + 配件清单批量写入）
  - `PUT /mod/builds/{id}` 更新方案（rejected→draft 自动重置）
  - `DELETE /mod/builds/{id}` 软删除
  - `POST /mod/builds/{id}/submit` 提交审核
- 管理接口（5 个）：
  - 方案列表/详情/发布/拒绝/删除 + 待审核列表
- 核心业务规则：is_legal 必填校验、已发布方案不可编辑、拒绝原因必填、整套 audit_log 记录

### 4-B 改装审核后台 ✅

- 1 个页面：`/admin/mod`
- 列表页：4 个状态 Tab（全部/待审核/已发布/已拒绝）+ 待审核角标数量
- **违法方案三重醒目提示**：
  - 左侧红色边框 `border-l-2 border-l-danger`
  - 标题旁红色 `违法` 角标 badge
  - 独立 `合规` 列：合规=绿色圆点+文字，违法=红色圆点+加粗文字
- 列表顶部统计条：`⚠️ 当前列表中有 N 个方案标记为违法改装，请优先审核处理`
- 详情模态框：
  - 违法方案顶部红色警示条（含 legal_note 合规说明）
  - 6 字段信息卡片（作者/车型/总费用/难度/合规/浏览量）
  - 配件清单子表格（5 列：名称含违法角标/品牌/价格/数量/合规状态，含购买链接）
  - 内容可折叠预览 + 审核操作按钮（通过/拒绝）
- 拒绝弹窗：原因必填校验，确认后自动刷新列表
- 新增 TypeScript 类型：`AdminModBuildItem`, `ModBuildItem`, `ModBuildDetail`, `ModPartItem`

### 4-C 改装展示前端 ✅

- 3 个页面：
  - `/mod` 方案列表（SSR）：合规说明横幅(⚖️+warning色)、默认只显示合法方案(is_legal=true)、is_legal=false时红色提醒条、方案卡片(封面+难度角标+车型+作者头像+费用+浏览量)、分页
  - `/mod/[slug]` 方案详情（SSR）：合规区块(✅合规 vs ⚠️非合规+legal_note)、4栏统计卡片(总费用/配件数/难度/浏览)、配件清单表格(6列含购买按钮+非合规角标+合计行)、Markdown渲染内容、HowTo Schema.org JSON-LD、generateMetadata(OGP)
  - `/mod/new` 发布方案（客户端+需登录）：车型搜索选择(防抖300ms)、合规声明radio(is_legal选择false触发法律风险警告弹窗—《道路交通安全法》风险清单4条)、配件动态增减行、Markdown内容textarea、自动生成slug
- 合规声明横幅：`⚖️ 本平台仅展示合法改装方案。改装前请了解当地法规，超标改装属违法行为。`
- 非合规警告弹窗：4条法律风险(违反交法/无法上牌年检/影响保险理赔/安全隐患)+ 两个按钮(改为合规方案/我已知晓风险)

---

## 模块 5：社区功能

### 5-A 后端社区 API ✅

- 5 个 ORM 模型：`topics`(置顶/精华/回复数冗余) + `comments`(通用 target_type+target_id/二级回复/楼层号) + `likes`(联合PK幂等) + `favorites` + `notifications`
- 5 个 Repo + 1 个 Service：TopicRepo(浏览量自增+回复计数更新)、CommentRepo(楼层号COALESCE MAX+1)、LikeRepo(toggle幂等)、FavoriteRepo(toggle幂等)、NotificationRepo(未读优先排序)
- 14 个 API：
  - 帖子：GET/POST `/topics`(置顶优先+last_reply_at降序) | GET/DELETE `/topics/{id}`
  - 评论：GET/POST `/comments`(通用) | DELETE `/comments/{id}`
  - 点赞/收藏：POST toggle幂等 | GET `/user/favorites`
  - 通知：GET `/notifications`(未读优先) | POST `/notifications/read-all`
- 业务规则：评论二级限制(parent.parent_id存在→400)、楼层号自增、点赞收藏重复操作不报错、通知自动生成(评论→被回复者/帖子作者，点赞→帖子作者，自己操作不通知)

### 5-B 社区前端 ✅

- 4 个页面：
  - `/community` 首页(SSR)：帖子列表(置顶帖primary色边框+标签)+ 回复/点赞/浏览三栏统计 + relative time(刚刚/分钟前/小时前/天前) + 分页
  - `/community/[id]` 详情(SSR)：帖子内容 + TopicClient客户端组件(评论列表/二级回复折叠/楼层号#1/点赞/回复输入框) + 未登录跳转login
  - `/community/new` 发帖(需登录)：标题/内容/标签输入 + 发布后跳转新帖子
  - `/notifications` 通知中心(需登录)：未读蓝色左侧边框+圆点 + 类型图标映射(💬评论/❤️点赞/👤关注/📢系统) + 全部已读 + 点击link跳转
- 新增 TypeScript 类型：`TopicItem`, `AuthorInfo`, `CommentItem`, `CommentReplyItem`, `NotificationItem`

---

## 模块 6：搜索功能

### 6-A 后端搜索 API ✅

- `SearchServiceInterface` 抽象接口（ABC）：`search()`/`suggest()`/`sync_document()`/`remove_document()`，当前 PgSearchService 实现，预留 MeilisearchSearchService 替换
- 3 个 API：
  - `GET /search?q=&type=all&page=1`：分组结果 `{articles[], vehicles[], brands[], total}`，ILIKE+pg_trgm similarity 加权排序(title 0 > excerpt 1 > similarity 2)，分类型独立计数+JOIN品牌/车系名
  - `GET /search/suggest?q=`：联想补全（热词前缀匹配→品牌名→车型名，最多10条）
  - `GET /search/hot`：热搜榜 TOP 10（search_count DESC）
- `search_keywords` 表：关键词+搜索次数+最近搜索时间，每次搜索自动 upsert

### 6-B 搜索前端 & 导航栏 ✅

- 3 个文件：
  - `SearchBar` 组件：debounce 300ms 联想建议 + 热搜榜下拉 + 键盘导航(↑↓选中/Enter跳转/Escape关闭) + 搜索词 `<mark>` 高亮 + 点击外部关闭
  - `/search` 搜索页（SSR+Client）：Tab 切换(全部/文章/车型/品牌) + 类型图标(📄/🚗/🏭) + 品牌/车系extra信息 + 搜索词 `<mark>` 高亮 + 分页
  - `Navbar` 导航栏（全局公共布局）：品牌/车型/文章/改装/社区链接 + 居中搜索框 + 右侧登录态(铃铛图标通知入口+发帖按钮/用户昵称) 或 登录/注册按钮 + 移动端搜索图标
- 新增 TypeScript 类型：`SearchResultItem`, `SearchResult`, `HotKeyword`
- 修改：`(public)/layout.tsx` 集成 Navbar + `src/types/api.ts` 新增搜索类型

---

## 模块 7：SEO 与性能优化

### 7-A 后端 SEO API ✅

- `services/seo_service.py`：sitemap 动态生成(首页priority=1.0 daily、车型0.9 monthly、文章0.8 weekly含lastmod、品牌0.7 monthly、改装0.6 weekly)、Redis 缓存 1h TTL、>5万条目自动拆分为 sitemap_index.xml + sitemap_{n}.xml 分片、`invalidate_sitemap_cache()` 供文章发布后调用
- JSON-LD Schema 生成：`build_jsonld_vehicle`(Product)→`build_jsonld_article`(Article)→`build_jsonld_brand`(Organization)→`build_jsonld_modbuild`(HowTo)
- `GET /sitemap.xml`（main.py 直接路由）：从 Redis 读取缓存，按 `?part=N` 获取分片
- `GET /robots.txt`：Allow / + Disallow /api/和/admin/ + Sitemap 指向
- `GET /api/v1/seo/schema/{type}/{id}`：返回指定资源 JSON-LD
- 修改：`main.py` 新增 sitemap/robots 路由 + `app/api/v1/` 注册 seo 路由

### 7-B 前端 SEO 与性能 ✅

- `lib/seo.tsx`：
  - `buildMetadata()`：canonical url + OGP(title/description/url/type/images/publishedTime/modifiedTime) + Twitter Card + Baidu 验证
  - `buildJsonLd()`：WebSite(含SearchAction)/Article/Product/HowTo/BreadcrumbList
  - `JsonLd` 组件：`<script type="application/ld+json">`
- 根布局 `layout.tsx`：robots index/follow + WebSite JSON-LD(SearchAction urlTemplate) + GA4(Script afterInteractive)
- 首页 `page.tsx`：ISR `revalidate = 3600`
- TypeScript 类型兼容：OGP type 仅支持 website/article，product 自动 fallback 为 website

---

## 模块 8：系统管理与收尾

### 8-A 后台 Dashboard ✅

- 后端 3 个 API（`GET /admin/stats` + `GET /admin/trends` + `GET /admin/audit-logs`）：
  - `dashboard_service.py`：stats(Redis缓存5min计数字段含今日today+待审核pending+违法方案illegal_mod)、trends(7天折线数据articles+缓存)、audit-logs(最近10条操作日志)
  - `dashboard.py` API路由 + `schemas/dashboard.py` 响应Schema
- 前端 Dashboard 页 `admin/dashboard/page.tsx`：
  - 4 色统计卡片(用户蓝/文章绿/车型紫/待处理橙 × border-l-4 + 今日同比)
  - 待处理事项(待审核文章+待审核改装→链接跳转 + 违法方案⚠️红色背景独立行)
  - Recharts 折线图(7天文章发布趋势+ResponsiveContainer+CartesianGrid+Tooltip)
  - 操作日志表格(操作类型中文映射13个+资源名+JSON详情截断60字符+timeAgo)
- npm 新增依赖：recharts

### 8-B 导航与路由守卫 ✅

- AdminLayout 重构 `(admin)/layout.tsx`：
  - 左侧菜单 active 高亮(primary色bg+字体)/图标📊📝🚗🔧👤
  - 移动端抽屉式 sidebar(toggle+遮罩层+点击导航关闭)
  - 顶部栏(汉堡按钮mobile+面包屑中文化映射13个路径段+最右"查看前台→"新标签)
  - 底部栏(用户名+退出登录hover红色)
- `middleware.ts` 路由守卫：
  - `/admin/*` 和 `/community/new/*` 校验 access_token cookie
  - admin 路径额外校验 user_role cookie(admin/editor)
  - 无token跳转 `/login?redirect=原路径`
- `Toast` 全局通知组件：
  - 3 种类型(success绿/error红/info蓝) + 图标 ✓/✕/ℹ
  - auto-dismiss 3.5s + 点击手动关闭
  - 集成到 Providers + useToast() hook