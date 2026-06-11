"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import Pagination from "@/components/common/Pagination";
import type { PageResponse, ArticleItem, ArticleDetail } from "@/types/api";

const TABS = [
  { key: "", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "pending", label: "待审核" },
  { key: "published", label: "已发布" },
  { key: "rejected", label: "已拒绝" },
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-gray-100 text-gray-700" },
  pending: { label: "待审核", className: "bg-yellow-100 text-yellow-700" },
  published: { label: "已发布", className: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", className: "bg-red-100 text-red-700" },
};

export default function AdminContentListPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [tab, setTab] = useState("");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [catId, setCatId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (tab) params.status = tab;
      if (keyword.trim()) params.keyword = keyword.trim();
      if (catId) params.category_id = catId;
      const res = await apiClient.get<PageResponse<ArticleItem>>("/admin/articles", { params });
      setArticles(res.data.data || []);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }, [tab, page, keyword, catId]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await apiClient.get<PageResponse<ArticleItem>>("/admin/articles/pending", {
        params: { page: 1, page_size: 1 },
      });
      setPendingCount(res.data.meta.total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);
  useEffect(() => {
    apiClient.get<{ data: { id: string; name: string }[] }>("/articles/categories").then(
      (res) => setCategories(res.data.data || []),
    ).catch(() => {});
  }, []);

  const handlePublish = async (id: string) => {
    if (!confirm("确定发布此文章？")) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/admin/articles/${id}/publish`);
      fetchArticles();
      fetchPendingCount();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/admin/articles/${rejectId}/reject`, { reason: rejectReason.trim() });
      setRejectId(null);
      setRejectReason("");
      fetchArticles();
      fetchPendingCount();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectId(id);
    setRejectReason("");
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除文章「${title}」？`)) return;
    try {
      await apiClient.delete(`/admin/articles/${id}`);
      fetchArticles();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">内容管理</h1>
          <Link href="/admin" className="text-sm text-primary hover:underline">← 返回管理后台</Link>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content/categories" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
            分类管理
          </Link>
          <Link href="/admin/content/articles/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
            新建文章
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜索标题/摘要..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-64 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <select
          value={catId}
          onChange={(e) => { setCatId(e.target.value); setPage(1); }}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(keyword || catId) && (
          <button
            onClick={() => { setKeyword(""); setCatId(""); setPage(1); }}
            className="text-sm text-muted hover:text-foreground"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs text-white">
                {pendingCount}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">标题</th>
                  <th className="px-4 py-3 text-left font-medium w-20">状态</th>
                  <th className="px-4 py-3 text-left font-medium w-16 hidden sm:table-cell">分类</th>
                  <th className="px-4 py-3 text-left font-medium w-16 hidden md:table-cell">作者</th>
                  <th className="px-4 py-3 text-left font-medium w-24 hidden lg:table-cell">发布时间</th>
                  <th className="px-4 py-3 text-right font-medium w-36">操作</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const st = STATUS_MAP[a.status] || { label: a.status, className: "bg-gray-100" };
                  return (
                    <tr key={a.id} className="border-b border-border hover:bg-background">
                      <td className="px-4 py-3">
                        <div className="font-medium line-clamp-1">{a.title}</div>
                        <div className="text-xs text-muted">{a.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">
                        {a.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">
                        {a.author?.nickname || a.author?.username || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden lg:table-cell">
                        {a.published_at ? new Date(a.published_at).toLocaleDateString("zh-CN") : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/content/articles/${a.id}/edit`}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                          >
                            编辑
                          </Link>
                          {a.status === "pending" && (
                            <>
                              <button
                                onClick={() => handlePublish(a.id)}
                                disabled={actionLoading}
                                className="rounded px-2 py-1 text-xs text-success hover:bg-success/10 disabled:opacity-50"
                              >
                                通过
                              </button>
                              <button
                                onClick={() => openRejectDialog(a.id)}
                                className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
                              >
                                拒绝
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(a.id, a.title)}
                            className="rounded px-2 py-1 text-xs text-muted hover:text-danger"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted">
                      暂无文章
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">拒绝文章</h2>
            <label className="mb-1 block text-sm text-muted">拒绝原因 *</label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写拒绝原因..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectId(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:bg-danger/80 disabled:opacity-50"
              >
                {actionLoading ? "处理中..." : "确认拒绝"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}