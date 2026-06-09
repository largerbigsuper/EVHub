"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { PageResponse, NotificationItem } from "@/types/api";

const TYPE_MAP: Record<string, { icon: string; label: string }> = {
  comment_reply: { icon: "💬", label: "评论回复" },
  like: { icon: "❤️", label: "点赞" },
  follow: { icon: "👤", label: "关注" },
  system: { icon: "📢", label: "系统通知" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [markedAll, setMarkedAll] = useState(false);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get<PageResponse<NotificationItem>>(
        `/notifications?page=${p}&page_size=20`
      );
      setNotifications(res.data.data || []);
      setMeta(res.data.meta);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/notifications");
      return;
    }
    fetchNotifications(1);
  }, [isAuthenticated, router, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setMarkedAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
    }
  };

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString("zh-CN");
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">请先登录...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/community" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← 返回社区
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知中心</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted">{unreadCount} 条未读</p>
          )}
        </div>
        {unreadCount > 0 && !markedAll && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p className="text-lg">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const typeInfo = TYPE_MAP[n.type] || { icon: "📌", label: n.type };
            return (
              <div
                key={n.id}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  n.is_read ? "border-border" : "border-primary/30 bg-primary/[0.02]"
                } ${n.link ? "cursor-pointer hover:bg-background" : ""}`}
                onClick={() => {
                  if (n.link) router.push(n.link);
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-base">{typeInfo.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.content && (
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.content}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <span>{typeInfo.label}</span>
                      <span>{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {page > 1 && (
            <button onClick={() => fetchNotifications(page - 1)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
              上一页
            </button>
          )}
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                {p === page ? (
                  <span className="rounded bg-primary px-3 py-1.5 text-sm text-white">{p}</span>
                ) : (
                  <button onClick={() => fetchNotifications(p)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
                    {p}
                  </button>
                )}
              </span>
            ))}
          {page < meta.total_pages && (
            <button onClick={() => fetchNotifications(page + 1)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}