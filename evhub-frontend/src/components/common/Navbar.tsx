"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import SearchBar from "@/components/common/SearchBar";

export default function Navbar() {
  const { isAuthenticated, user, clearUser } = useAuth();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    clearUser();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold text-primary">
          EVHub
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/brands" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
            品牌
          </Link>
          <Link href="/vehicles" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
            车型
          </Link>
          <Link href="/articles" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
            文章
          </Link>
          <Link href="/mod" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
            改装
          </Link>
          <Link href="/community" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
            社区
          </Link>
        </nav>

        <div className="hidden flex-1 justify-center sm:flex">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-background transition-colors sm:hidden">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/notifications" className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-background transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <Link
                href="/community/new"
                className="hidden rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors sm:block"
              >
                发帖
              </Link>
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors sm:flex"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {(user?.nickname || user?.username || "U")[0]}
                  </span>
                  <span>{user?.nickname || user?.username}</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-surface shadow-lg py-1">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="text-sm font-medium">{user?.nickname || user?.username}</div>
                      <div className="text-xs text-muted">{user?.email}</div>
                    </div>
                    {(user?.role === "admin" || user?.role === "editor") && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-background transition-colors"
                      >
                        管理后台
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-danger hover:bg-background transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors">
                登录
              </Link>
              <Link href="/register" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}