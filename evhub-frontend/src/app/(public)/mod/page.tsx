import Link from "next/link";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ModBuildItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  is_legal: boolean;
  status: string;
  difficulty: string | null;
  total_cost: number | null;
  tags: string[] | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  author: { id: string; username: string; nickname: string; avatar: string | null } | null;
  vehicle_sku: { id: string; name: string } | null;
}

interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export const metadata: Metadata = {
  title: "改装方案 - EVHub",
  description: "电动车改装方案分享，合法的改装清单、配件推荐和改装教程。",
};

export default async function ModListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const vehicleSkuId = sp.vehicle_sku_id || "";
  const tag = sp.tag || "";
  const isLegal = sp.is_legal !== "false";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 12;

  let builds: ModBuildItem[] = [];
  let meta: PageMeta = { page: 1, page_size: pageSize, total: 0, total_pages: 0 };

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (isLegal) params.set("is_legal", "true");
  if (vehicleSkuId) params.set("vehicle_sku_id", vehicleSkuId);
  if (tag) params.set("tag", tag);

  try {
    const res = await fetch(`${API_BASE}/mod/builds?${params.toString()}`);
    const json = await res.json();
    builds = json.data || [];
    meta = json.meta || meta;
  } catch {
    // silent
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Compliance Banner */}
      <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-base">⚖️</span>
          <span>
            本平台仅展示合法改装方案。改装前请了解当地法规，超标改装属违法行为。
            {!isLegal && (
              <span className="mt-1 block font-medium text-danger">
                ⚠️ 当前显示所有方案（含非合规），请注意甄别
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">改装方案</h1>
          <p className="mt-1 text-muted">发现和分享靠谱的电动车改装方案</p>
        </div>
        <Link
          href="/mod/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          发布方案
        </Link>
      </div>

      {/* Build Grid */}
      {builds.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p className="text-lg">暂无可展示的改装方案</p>
          <Link href="/mod/new" className="mt-2 inline-block text-sm text-primary hover:underline">
            成为第一个分享方案的人 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <Link
              key={b.id}
              href={`/mod/${b.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="aspect-[16/9] overflow-hidden bg-background relative">
                {b.cover_image ? (
                  <img
                    src={b.cover_image}
                    alt={b.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <span className="text-4xl font-bold text-primary/30">MOD</span>
                  </div>
                )}
                {b.difficulty && (
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                    {DIFFICULTY_MAP[b.difficulty] || b.difficulty}
                  </span>
                )}
                {!b.is_legal && (
                  <span className="absolute right-3 top-3 rounded bg-danger px-2 py-0.5 text-xs font-medium text-white">
                    非合规
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  {b.vehicle_sku?.name && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {b.vehicle_sku.name}
                    </span>
                  )}
                  {b.published_at && (
                    <span className="text-xs text-muted">
                      {new Date(b.published_at).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>
                <h2 className="mb-2 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                  {b.title}
                </h2>
                {b.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted">{b.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1">
                    {b.author?.avatar ? (
                      <img src={b.author.avatar} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                        {(b.author?.nickname || "?").charAt(0)}
                      </span>
                    )}
                    {b.author?.nickname || b.author?.username || "匿名"}
                  </span>
                  <span className="flex items-center gap-2">
                    {b.total_cost != null && (
                      <span>¥{b.total_cost.toLocaleString()}</span>
                    )}
                    <span>{b.view_count} 次浏览</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.total_pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-1">
          {page > 1 && (
            <Link
              href={`/mod?page=${page - 1}${isLegal ? "" : "&is_legal=false"}`}
              className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
            >
              上一页
            </Link>
          )}
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-2 text-muted">...</span>
                )}
                {p === page ? (
                  <span className="rounded bg-primary px-4 py-2 text-sm text-white">{p}</span>
                ) : (
                  <Link
                    href={`/mod?page=${p}${isLegal ? "" : "&is_legal=false"}`}
                    className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
                  >
                    {p}
                  </Link>
                )}
              </span>
            ))}
          {page < meta.total_pages && (
            <Link
              href={`/mod?page=${page + 1}${isLegal ? "" : "&is_legal=false"}`}
              className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  );
}