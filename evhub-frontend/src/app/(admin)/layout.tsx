"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "仪表盘", icon: "📊" },
  { href: "/admin/content", label: "内容管理", icon: "📝" },
  { href: "/admin/vehicles", label: "车型数据", icon: "🚗" },
  { href: "/admin/mod", label: "改装管理", icon: "🔧" },
  { href: "/admin/users", label: "用户管理", icon: "👤" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, clearUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && user === null) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">验证中...</p>
      </div>
    );
  }

  const breadcrumbSegments = pathname.split("/").filter(Boolean).slice(1);

  return (
    <div className="flex min-h-screen">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-surface transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/admin/dashboard" className="text-xl font-bold text-primary">
              EVHub Admin
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-muted hover:text-foreground lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border pt-4">
            <div className="mb-1 text-sm font-medium">{user?.nickname || user?.username}</div>
            <button
              onClick={() => {
                clearUser();
                router.push("/login");
              }}
              className="text-sm text-muted hover:text-danger transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-1 text-muted hover:text-foreground lg:hidden"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/admin/dashboard" className="text-muted hover:text-foreground">
              首页
            </Link>
            {breadcrumbSegments.map((seg, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <span className="text-border">/</span>
                <span className={idx === breadcrumbSegments.length - 1 ? "font-medium" : "text-muted"}>
                  {seg === "dashboard" ? "仪表盘" :
                   seg === "content" ? "内容管理" :
                   seg === "vehicles" ? "车型数据" :
                   seg === "mod" ? "改装管理" :
                   seg === "users" ? "用户管理" :
                   seg === "articles" ? "文章" :
                   seg === "categories" ? "分类" :
                   seg === "brands" ? "品牌" :
                   seg === "series" ? "车系" :
                   seg === "skus" ? "车型" :
                   seg === "attributes" ? "属性" :
                   seg === "new" ? "新建" :
                   seg === "edit" ? "编辑" :
                   seg}
                </span>
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-muted hover:text-primary transition-colors"
              target="_blank"
            >
              查看前台 →
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}