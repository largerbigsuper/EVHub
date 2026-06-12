"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import Pagination from "@/components/common/Pagination";
import { useToast } from "@/components/common/Toast";
import type { PageResponse, AdminModBuildItem, ModBuildDetail } from "@/types/api";

const TABS = [
  { key: "", label: "全部" },
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

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export default function AdminModPage() {
  const { toast } = useToast();
  const [builds, setBuilds] = useState<AdminModBuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [tab, setTab] = useState("");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [illegalCount, setIllegalCount] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModBuildDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (tab) params.status = tab;
      if (keyword.trim()) params.keyword = keyword.trim();
      const res = await apiClient.get<PageResponse<AdminModBuildItem>>("/admin/mod/builds", { params });
      const data = res.data.data || [];
      setBuilds(data);
      setMeta(res.data.meta);
      if (!tab) {
        setIllegalCount(data.filter((b) => !b.is_legal).length);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page, keyword]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await apiClient.get<PageResponse<AdminModBuildItem>>("/admin/mod/pending", {
        params: { page: 1, page_size: 1 },
      });
      setPendingCount(res.data.meta.total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchBuilds(); }, [fetchBuilds]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const fetchDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiClient.get<{ code: number; message: string; data: ModBuildDetail }>(`/admin/mod/builds/${id}`);
      setDetail(res.data.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
  };

  const handlePublish = async (id: string) => {
    if (!confirm("确定发布此改装方案？")) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/admin/mod/builds/${id}/publish`);
      toast("发布成功", "success");
      fetchBuilds();
      fetchPendingCount();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/admin/mod/builds/${rejectId}/reject`, { reason: rejectReason.trim() });
      toast("已拒绝", "success");
      setRejectId(null);
      setRejectReason("");
      closeDetail();
      fetchBuilds();
      fetchPendingCount();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除方案「${title}」？`)) return;
    try {
      await apiClient.delete(`/admin/mod/builds/${id}`);
      toast("删除成功", "success");
      fetchBuilds();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败", "error");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">改装管理</h1>
          <Link href="/admin" className="text-sm text-primary hover:underline">← 返回管理后台</Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="搜索方案标题/描述..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-64 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {keyword && (
          <button onClick={() => { setKeyword(""); setPage(1); }} className="text-sm text-muted hover:text-foreground">
            清除
          </button>
        )}
      </div>

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

      {illegalCount > 0 && !tab && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <span className="text-base">⚠️</span>
          <span>
            当前列表中有 <strong>{illegalCount}</strong> 个方案标记为违法改装，请优先审核处理
          </span>
        </div>
      )}

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
                  <th className="px-4 py-3 text-left font-medium">方案标题</th>
                  <th className="px-4 py-3 text-left font-medium w-20">状态</th>
                  <th className="px-4 py-3 text-left font-medium w-16">合规</th>
                  <th className="px-4 py-3 text-left font-medium w-16 hidden sm:table-cell">作者</th>
                  <th className="px-4 py-3 text-left font-medium w-20 hidden md:table-cell">车型</th>
                  <th className="px-4 py-3 text-left font-medium w-24 hidden lg:table-cell">提交时间</th>
                  <th className="px-4 py-3 text-right font-medium w-36">操作</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((b) => {
                  const st = STATUS_MAP[b.status] || { label: b.status, className: "bg-gray-100" };
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-border hover:bg-background ${
                        !b.is_legal ? "border-l-2 border-l-danger bg-danger/[0.02]" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!b.is_legal && (
                            <span className="inline-flex items-center rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                              违法
                            </span>
                          )}
                          <div>
                            <button
                              onClick={() => fetchDetail(b.id)}
                              className="font-medium line-clamp-1 text-left hover:text-primary hover:underline"
                            >
                              {b.title}
                            </button>
                            <div className="text-xs text-muted">{b.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.is_legal ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            合规
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                            违法
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">
                        {b.author?.nickname || b.author?.username || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">
                        {b.vehicle_sku?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden lg:table-cell">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString("zh-CN") : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => fetchDetail(b.id)}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                          >
                            详情
                          </button>
                          {b.status === "pending" && (
                            <>
                              <button
                                onClick={() => handlePublish(b.id)}
                                disabled={actionLoading}
                                className="rounded px-2 py-1 text-xs text-success hover:bg-success/10 disabled:opacity-50"
                              >
                                通过
                              </button>
                              <button
                                onClick={() => {
                                  setRejectId(b.id);
                                  setRejectReason("");
                                }}
                                className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
                              >
                                拒绝
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(b.id, b.title)}
                            className="rounded px-2 py-1 text-xs text-muted hover:text-danger"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {builds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted">
                      暂无改装方案
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.total_pages > 1 && (
            <Pagination
              page={page}
              totalPages={meta.total_pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">拒绝改装方案</h2>
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

      {/* Detail Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-10" onClick={closeDetail}>
          <div
            className="mx-4 w-full max-w-2xl rounded-xl bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : detail ? (
              <>
                {/* Compliance Warning */}
                {!detail.is_legal && (
                  <div className="rounded-t-xl border-b border-danger/30 bg-danger/5 px-6 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xl">⚠️</span>
                      <div>
                        <p className="font-medium text-danger">
                          该方案包含可能违法的改装内容，请谨慎审核，不符合规定请拒绝发布
                        </p>
                        {detail.legal_note && (
                          <p className="mt-1 text-sm text-danger/80">
                            合规说明：{detail.legal_note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{detail.title}</h2>
                      <p className="text-sm text-muted">{detail.slug}</p>
                    </div>
                    <button
                      onClick={closeDetail}
                      className="rounded p-1 text-muted hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg bg-background p-4 text-sm">
                    <div>
                      <span className="text-muted">作者：</span>
                      {detail.author?.nickname || detail.author?.username || "-"}
                    </div>
                    <div>
                      <span className="text-muted">车型：</span>
                      {detail.vehicle_sku?.name ? (
                        <span>
                          {detail.vehicle_sku.brand_name} {detail.vehicle_sku.series_name} {detail.vehicle_sku.name}
                        </span>
                      ) : "-"}
                    </div>
                    <div>
                      <span className="text-muted">总费用：</span>
                      {detail.total_cost != null ? `¥${detail.total_cost.toLocaleString()}` : "-"}
                    </div>
                    <div>
                      <span className="text-muted">难度：</span>
                      {detail.difficulty ? DIFFICULTY_MAP[detail.difficulty] || detail.difficulty : "-"}
                    </div>
                    <div>
                      <span className="text-muted">合规：</span>
                      {detail.is_legal ? (
                        <span className="text-success">合规</span>
                      ) : (
                        <span className="font-medium text-danger">违法</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted">浏览量：</span>
                      {detail.view_count}
                    </div>
                    {detail.tags && detail.tags.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted">标签：</span>
                        <span className="flex flex-wrap gap-1 mt-1">
                          {detail.tags.map((tag) => (
                            <span key={tag} className="inline-block rounded-full bg-background px-2 py-0.5 text-xs">
                              {tag}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {detail.cover_image && (
                      <div className="col-span-2">
                        <span className="text-muted">封面图：</span>
                        <img src={detail.cover_image} alt={detail.title} className="mt-1 max-h-48 rounded-lg object-cover" />
                      </div>
                    )}
                    {detail.description && (
                      <div className="col-span-2">
                        <span className="text-muted">简介：</span>
                        <p className="mt-1 text-sm">{detail.description}</p>
                      </div>
                    )}
                    {detail.rejected_reason && (
                      <div className="col-span-2">
                        <span className="text-muted">拒绝原因：</span>
                        <p className="mt-1 rounded bg-danger/5 px-3 py-2 text-sm text-danger">{detail.rejected_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Parts List */}
                  {detail.parts.length > 0 && (
                    <div className="mb-6">
                      <h3 className="mb-3 font-medium">配件清单（{detail.parts.length} 件）</h3>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border bg-background">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">名称</th>
                              <th className="px-3 py-2 text-left font-medium">品牌</th>
                              <th className="px-3 py-2 text-right font-medium">价格</th>
                              <th className="px-3 py-2 text-center font-medium">数量</th>
                              <th className="px-3 py-2 text-center font-medium">合规</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.parts.map((p) => (
                              <tr key={p.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {!p.is_legal && (
                                      <span className="inline-flex items-center rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        违法
                                      </span>
                                    )}
                                    {p.name}
                                  </div>
                                  {p.purchase_url && (
                                    <a
                                      href={p.purchase_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      购买链接 ↗
                                    </a>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted text-xs">{p.brand || "-"}</td>
                                <td className="px-3 py-2 text-right">
                                  {p.price != null ? `¥${p.price.toLocaleString()}` : "-"}
                                </td>
                                <td className="px-3 py-2 text-center">{p.quantity}</td>
                                <td className="px-3 py-2 text-center">
                                  {p.is_legal ? (
                                    <span className="text-xs text-success">合规</span>
                                  ) : (
                                    <span className="text-xs font-medium text-danger">违法</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Content Preview */}
                  {detail.content && (
                    <details className="mb-6">
                      <summary className="cursor-pointer font-medium text-sm text-muted hover:text-foreground">
                        展开查看详细内容
                      </summary>
                      <div className="mt-3 rounded-lg border border-border bg-background p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {detail.content.slice(0, 500)}
                          {detail.content.length > 500 && "..."}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* Review Actions */}
                  {detail.status === "pending" && (
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <button
                        onClick={() => {
                          setRejectId(detail.id);
                          setRejectReason("");
                        }}
                        className="rounded-lg border border-danger px-4 py-2 text-sm text-danger hover:bg-danger/5"
                      >
                        拒绝
                      </button>
                      <button
                        onClick={() => {
                          handlePublish(detail.id);
                          closeDetail();
                        }}
                        disabled={actionLoading}
                        className="rounded-lg bg-success px-4 py-2 text-sm text-white hover:bg-success/80 disabled:opacity-50"
                      >
                        通过
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-muted">无法加载方案详情</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}