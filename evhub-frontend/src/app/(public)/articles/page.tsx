import Link from "next/link";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  children: CategoryItem[] | null;
  article_count: number;
}

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: CategoryItem | null;
  tags: string[] | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export const metadata: Metadata = {
  title: "电动车资讯 - EVHub",
  description: "最新电动车资讯、购车指南、评测文章、改装方案和技术解读。",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const categorySlug = sp.category || "";
  const tag = sp.tag || "";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 12;

  let categories: CategoryItem[] = [];
  let articles: ArticleItem[] = [];
  let meta: PageMeta = { page: 1, page_size: pageSize, total: 0, total_pages: 0 };
  const activeCategory = categorySlug || "";

  try {
    const [catRes, artRes] = await Promise.allSettled([
      fetch(`${API_BASE}/articles/categories`),
      fetch(`${API_BASE}/articles?category_slug=${categorySlug}&tag=${tag}&page=${page}&page_size=${pageSize}`),
    ]);

    if (catRes.status === "fulfilled") {
      const catJson = await catRes.value.json();
      categories = catJson.data || [];
    }

    if (artRes.status === "fulfilled") {
      const artJson = await artRes.value.json();
      articles = artJson.data || [];
      meta = artJson.meta || meta;
    }
  } catch {
    // silent
  }

  // Build category tabs for flat display
  const tabList: { slug: string; name: string }[] = [{ slug: "", name: "全部" }];
  const walk = (cats: CategoryItem[]) => {
    for (const c of cats) {
      tabList.push({ slug: c.slug, name: c.name });
      if (c.children) walk(c.children);
    }
  };
  walk(categories);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">电动车资讯</h1>
      <p className="mb-8 text-muted">最新购车指南、评测文章、改装方案和技术解读</p>

      {/* Category Tabs */}
      {tabList.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {tabList.map((t) => {
            const isActive = activeCategory === t.slug;
            const href = t.slug
              ? `/articles?category=${t.slug}`
              : "/articles";
            return (
              <Link
                key={t.slug}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-border text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {t.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Article Grid */}
      {articles.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p className="text-lg">暂无文章</p>
          {activeCategory && <p className="mt-1 text-sm">该分类下还没有文章，换个分类看看</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/articles/${a.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="aspect-[16/9] overflow-hidden bg-background">
                {a.cover_image ? (
                  <img
                    src={a.cover_image}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <span className="text-4xl font-bold text-primary/30">EV</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  {a.category && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {a.category.name}
                    </span>
                  )}
                  {a.published_at && (
                    <span className="text-xs text-muted">
                      {new Date(a.published_at).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>
                <h2 className="mb-2 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted">{a.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{a.view_count} 次阅读</span>
                  {a.tags && a.tags.length > 0 && (
                    <div className="flex gap-1">
                      {a.tags.slice(0, 2).map((t) => (
                        <Link
                          key={t}
                          href={`/articles?tag=${t}`}
                          className="rounded border border-border px-1.5 py-0.5 hover:border-primary hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  )}
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
              href={`/articles?${activeCategory ? `category=${activeCategory}&` : ""}page=${page - 1}`}
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
                    href={`/articles?${activeCategory ? `category=${activeCategory}&` : ""}page=${p}`}
                    className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
                  >
                    {p}
                  </Link>
                )}
              </span>
            ))}
          {page < meta.total_pages && (
            <Link
              href={`/articles?${activeCategory ? `category=${activeCategory}&` : ""}page=${page + 1}`}
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