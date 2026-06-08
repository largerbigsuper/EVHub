"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, clearUser } = useAuth();
  const router = useRouter();

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

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-surface p-4">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-xl font-bold text-primary">
            EVHub Admin
          </Link>
        </div>
        <nav className="space-y-1">
          <NavItem href="/admin/dashboard" label="仪表盘" />
          <NavItem href="/admin/content" label="内容管理" />
          <NavItem href="/admin/vehicles" label="车型数据" />
          <NavItem href="/admin/mod" label="改装管理" />
          <NavItem href="/admin/users" label="用户管理" />
        </nav>
        <div className="mt-auto pt-4">
          <div className="text-sm text-muted">{user?.username}</div>
          <button
            onClick={() => {
              clearUser();
              router.push("/login");
            }}
            className="mt-2 text-sm text-danger hover:underline"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded px-3 py-2 text-sm text-muted transition-colors hover:bg-background hover:text-foreground"
    >
      {label}
    </Link>
  );
}