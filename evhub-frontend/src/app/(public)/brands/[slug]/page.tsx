import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface SeriesItem {
  id: string;
  name: string;
  slug: string;
  cover_image: string | null;
  description: string | null;
  sku_count: number;
}

interface BrandDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  country: string | null;
  founded_year: number | null;
  website: string | null;
  description: string | null;
  series_count: number;
  series: SeriesItem[];
}

interface ApiResponse {
  code: number;
  data: BrandDetail | null;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/brands/${slug}`, { next: { revalidate: 3600 } });
    const json: ApiResponse = await res.json();
    const brand = json.data;
    if (!brand) return { title: "品牌未找到 - EVHub" };
    return {
      title: `${brand.name}电动车品牌_${brand.name}旗下车型大全 - EVHub`,
      description: brand.description || `${brand.name}电动车品牌，共${brand.series_count}个车系，了解最新车型和参数。`,
    };
  } catch {
    return { title: "品牌 - EVHub" };
  }
}

export default async function BrandDetailPage({ params }: Props) {
  const { slug } = await params;
  let brand: BrandDetail | null = null;

  try {
    const res = await fetch(`${API_BASE}/brands/${slug}`, { next: { revalidate: 3600 } });
    const json: ApiResponse = await res.json();
    brand = json.data;
  } catch {
  }

  if (!brand) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/brands" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← 返回品牌列表
      </Link>

      <div className="mb-12 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-background">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="h-16 w-16 object-contain" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{brand.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{brand.name}</h1>
                {brand.country && <p className="text-sm text-muted">{brand.country}</p>}
              </div>
            </div>

            {brand.description && (
              <p className="mb-4 text-sm leading-relaxed text-muted">{brand.description}</p>
            )}

            <dl className="space-y-2 text-sm">
              {brand.founded_year && (
                <>
                  <dt className="text-muted">成立年份</dt>
                  <dd>{brand.founded_year} 年</dd>
                </>
              )}
              {brand.website && (
                <>
                  <dt className="text-muted">官方网站</dt>
                  <dd>
                    <a href={brand.website} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline">{brand.website}</a>
                  </dd>
                </>
              )}
              <dt className="text-muted">车系数</dt>
              <dd>{brand.series_count} 个</dd>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">旗下车系</h2>
          {brand.series.length === 0 ? (
            <p className="text-muted">暂无车系数据</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {brand.series.map((s) => (
                <Link
                  key={s.id}
                  href={`/vehicles?series_slug=${s.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary hover:shadow-lg"
                >
                  <div className="aspect-video overflow-hidden bg-background">
                    {s.cover_image ? (
                      <img src={s.cover_image} alt={s.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">暂无图片</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 font-semibold group-hover:text-primary">{s.name}</h3>
                    <p className="text-sm text-muted">{s.sku_count} 款车型</p>
                    {s.description && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">{s.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}