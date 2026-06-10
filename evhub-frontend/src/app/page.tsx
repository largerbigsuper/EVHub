import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: { id: string; name: string; slug: string } | null;
  tags: string[] | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  is_featured: boolean;
}

export const metadata: Metadata = {
  title: "EVHub - 两轮电动车专业内容与数据平台",
  description: "品牌库 · 车型参数 · 改装方案 · 专业测评",
};

export default async function HomePage() {
  let hotArticles: ArticleItem[] = [];
  let latestArticles: ArticleItem[] = [];
  let brands: BrandItem[] = [];

  try {
    const results = await Promise.allSettled([
      fetch(`${API_BASE}/brands`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/articles?page=1&page_size=6`, { next: { revalidate: 300 } }),
    ]);

    if (results[0].status === "fulfilled") {
      const json = await results[0].value.json();
      brands = (json.data || []).filter((b: BrandItem) => b.is_featured);
    }

    if (results[1].status === "fulfilled") {
      const json = await results[1].value.json();
      const all: ArticleItem[] = json.data || [];
      // Hot: sort by view_count
      hotArticles = [...all].sort((a, b) => b.view_count - a.view_count).slice(0, 6);
      // Latest: already sorted by published_at desc from API
      latestArticles = all.slice(0, 6);
    }
  } catch {
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-5xl font-extrabold text-primary tracking-tight sm:text-6xl">
            EVHub
          </h1>
          <p className="mb-6 text-xl text-muted">
            两轮电动车专业内容与数据平台
          </p>
          <p className="mb-8 text-muted">
            品牌库 · 车型参数 · 改装方案 · 专业测评
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/vehicles"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark transition-colors"
            >
              查找车型
            </Link>
            <Link
              href="/articles"
              className="rounded-lg border border-primary px-6 py-3 font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              阅读文章
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Brands */}
      {brands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">推荐品牌</h2>
            <Link href="/brands" className="text-sm text-primary hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${b.slug}`}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-background">
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="h-10 w-10 object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-primary">{b.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm font-medium">{b.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hot Articles */}
      {hotArticles.length > 0 && (
        <section className="bg-surface/50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">热门文章</h2>
              <Link href="/articles" className="text-sm text-primary hover:underline">
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hotArticles.map((a) => (
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
                      <span className="text-xs text-muted">{a.view_count} 阅读</span>
                    </div>
                    <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="mt-2 line-clamp-1 text-sm text-muted">{a.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      {latestArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">最新文章</h2>
            <Link href="/articles" className="text-sm text-primary hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((a) => (
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
                  <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="mt-2 line-clamp-1 text-sm text-muted">{a.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-muted">
            EVHub 致力于为电动车用户提供最全面的品牌、车型和改装数据
          </p>
        </div>
      </section>
    </main>
  );
}