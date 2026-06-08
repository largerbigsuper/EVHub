# EVHub Frontend

两轮电动车专业内容与数据平台 - 前端应用

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: TailwindCSS v4
- **状态管理**: Zustand
- **数据请求**: TanStack React Query v5
- **表单校验**: react-hook-form + zod

## 项目结构

```
evhub-frontend/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # 根布局（含 Providers）
│   │   ├── page.tsx          # 首页
│   │   ├── globals.css       # 全局样式 + TailwindCSS
│   │   ├── (public)/         # 公开路由组
│   │   │   ├── login/        # 登录页
│   │   │   ├── register/     # 注册页
│   │   │   └── ...
│   │   └── (admin)/          # 管理后台路由组
│   │       ├── layout.tsx    # 后台布局（侧边栏）
│   │       ├── dashboard/    # 仪表盘
│   │       ├── users/        # 用户管理
│   │       ├── content/      # 内容管理
│   │       ├── vehicles/     # 车型管理
│   │       └── mod/          # 改装管理
│   ├── components/
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── layout/           # Header/Footer/Sidebar
│   │   ├── common/           # 通用业务组件
│   │   └── Providers.tsx     # QueryClientProvider
│   ├── lib/
│   │   ├── api.ts            # axios 封装（Token 自动刷新）
│   │   ├── auth.ts           # 认证 API
│   │   └── utils.ts          # 工具函数
│   ├── stores/
│   │   └── auth.store.ts     # Zustand 用户状态
│   ├── types/
│   │   └── api.ts            # TypeScript 类型定义
│   └── hooks/
│       └── useAuth.ts        # 认证 Hook
├── public/                   # 静态资源
├── next.config.js
├── tsconfig.json
├── postcss.config.mjs
├── .env.local.example        # 环境变量模板
└── package.json
```

## 快速启动

### 1. 环境准备

- Node.js 20+
- npm 10+

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入实际 API 地址
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 构建生产版本

```bash
npm run build
npm run start
```

## 功能模块

### 已完成
- 项目骨架（Next.js 15 + TailwindCSS v4 + Zustand + React Query）
- axios 封装（自动 Bearer Token + 401 并发刷新队列）
- 后台管理布局（侧边栏导航）
- 用户管理页面（用户列表 + 角色管理）
- 仪表盘页面（占位）

### 待开发
- 登录/注册页面
- 品牌车型展示
- 内容管理
- 改装方案
- 搜索功能

## 主题色

主色调 `#1A56A0`，已通过 TailwindCSS `@theme` 配置为 `--color-primary`。

## 路径别名

`@/` 映射到 `src/`，例如 `import { useAuth } from "@/hooks/useAuth"`。