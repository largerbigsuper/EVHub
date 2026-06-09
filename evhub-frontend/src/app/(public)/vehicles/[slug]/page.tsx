import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SkuDetailClient } from "./SkuDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface AttributeValueOut {
  name: string;
  code: string;
  value: string | number | boolean | null;
  unit: string | null;
}

interface AttributeGroupOut {
  group_name: string;
  items: AttributeValueOut[];
}

interface SkuDetail {
  id: string;
  series_id: string;
  series_name: string | null;
  series_slug: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  name: string;
  slug: string;
  year: number | null;
  cover_image: string | null;
  price_min: number | null;
  price_max: number | null;
  battery_type: string | null;
  range_km: number | null;
  motor_power_w: number | null;
  top_speed_kmh: number | null;
  weight_kg: number | null;
  requires_license: boolean;
  colors: string[] | null;
  tags: string[] | null;
  is_featured: boolean;
  attribute_groups: AttributeGroupOut[];
}

interface SkuSimpleItem {
  id: string;
  name: string;
  slug: string;
  brand_name: string | null;
  cover_image: string | null;
  price_min: number | null;
  price_max: number | null;
  range_km: number | null;
  battery_type: string | null;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/skus/${slug}`, { next: { revalidate: 3600 } });
    const json = await res.json();
    const sku: SkuDetail | null = json.data || null;
    if (!sku) return { title: "车型未找到 - EVHub" };

    const priceText = sku.price_min != null ? `¥${sku.price_min.toLocaleString()}` : "";
    const rangeText = sku.range_km ? `${sku.range_km}km` : "";

    return {
      title: `${sku.name}_${sku.brand_name || ""}电动车参数价格图片 - EVHub`,
      description: `${sku.brand_name || ""}${sku.name}，${[
        priceText, rangeText, sku.battery_type, sku.top_speed_kmh ? `${sku.top_speed_kmh}km/h` : "",
      ].filter(Boolean).join("，")}。查看详细参数、用户评价。`,
      openGraph: {
        title: `${sku.name} - ${sku.brand_name}`,
        description: `${priceText} ${rangeText}`,
        images: sku.cover_image ? [sku.cover_image] : [],
      },
    };
  } catch {
    return { title: "车型详情 - EVHub" };
  }
}

export default async function VehicleDetailPage({ params }: Props) {
  const { slug } = await params;
  let sku: SkuDetail | null = null;
  let relatedSkus: SkuSimpleItem[] = [];

  try {
    const res = await fetch(`${API_BASE}/skus/${slug}`, { next: { revalidate: 3600 } });
    const json = await res.json();
    sku = json.data || null;

    if (sku?.brand_slug) {
      const relRes = await fetch(`${API_BASE}/skus?brand_slug=${sku.brand_slug}&page_size=6`, { next: { revalidate: 3600 } });
      const relJson = await relRes.json();
      relatedSkus = (relJson.data || []).filter((s: SkuSimpleItem) => s.slug !== slug);
    }
  } catch {
  }

  if (!sku) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sku.name,
    brand: sku.brand_name ? { "@type": "Brand", name: sku.brand_name } : undefined,
    description: `${sku.brand_name || ""} ${sku.name} 电动车`,
    image: sku.cover_image,
    offers: sku.price_min != null ? {
      "@type": "Offer",
      price: sku.price_min,
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
    } : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-muted">
        <Link href="/vehicles" className="hover:text-primary">车型筛选</Link>
        {sku.brand_slug && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/brands/${sku.brand_slug}`} className="hover:text-primary">{sku.brand_name}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-foreground">{sku.name}</span>
      </nav>

      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {sku.cover_image ? (
            <img src={sku.cover_image} alt={sku.name} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-6xl font-bold text-muted/20">
              {sku.brand_name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        <div>
          {sku.brand_name && (
            <div className="mb-2 text-sm text-primary font-medium">{sku.brand_name}</div>
          )}
          <h1 className="mb-4 text-3xl font-bold">{sku.name}</h1>

          <div className="mb-6">
            {sku.price_min != null ? (
              <span className="text-3xl font-bold text-primary">¥{sku.price_min.toLocaleString()}</span>
            ) : (
              <span className="text-2xl text-muted">暂无报价</span>
            )}
            {sku.price_max && sku.price_max !== sku.price_min && (
              <span className="text-xl text-muted"> - ¥{sku.price_max.toLocaleString()}</span>
            )}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-4">
            <SpecBadge label="电池类型" value={sku.battery_type} />
            <SpecBadge label="续航里程" value={sku.range_km ? `${sku.range_km} km` : null} />
            <SpecBadge label="电机功率" value={sku.motor_power_w ? `${sku.motor_power_w} W` : null} />
            <SpecBadge label="最高时速" value={sku.top_speed_kmh ? `${sku.top_speed_kmh} km/h` : null} />
            <SpecBadge label="车重" value={sku.weight_kg ? `${sku.weight_kg} kg` : null} />
            <SpecBadge label="需要驾照" value={sku.requires_license ? "是" : "否"} />
            {sku.year && <SpecBadge label="年份" value={String(sku.year)} />}
          </div>

          {sku.tags && sku.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {sku.tags.map((t, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{t}</span>
              ))}
            </div>
          )}

          {sku.colors && sku.colors.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-sm font-medium text-muted">颜色选项</div>
              <div className="flex flex-wrap gap-2">
                {sku.colors.map((c, i) => (
                  <span key={i} className="rounded-full border border-border px-3 py-1 text-sm">{c}</span>
                ))}
              </div>
            </div>
          )}

          <SkuDetailClient slug={sku.slug} />
        </div>
      </div>

      {sku.attribute_groups.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">详细参数</h2>
          <div className="space-y-6">
            {sku.attribute_groups.map((group, gi) => (
              <div key={gi}>
                <h3 className="mb-3 text-lg font-semibold text-muted">{group.group_name}</h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {group.items.map((item, ii) => (
                        <tr key={ii} className={ii % 2 === 0 ? "bg-surface" : ""}>
                          <td className="w-48 px-4 py-3 text-muted">{item.name}</td>
                          <td className="px-4 py-3 font-medium">
                            {item.value != null ? `${item.value}${item.unit ? ` ${item.unit}` : ""}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedSkus.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {sku.brand_name ? `${sku.brand_name} 其他车型` : "相关车型"}
            </h2>
            <Link href={`/vehicles?brand_slug=${sku.brand_slug || ""}`} className="text-sm text-primary hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {relatedSkus.map((s) => (
              <Link key={s.id} href={`/vehicles/${s.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-surface hover:border-primary">
                <div className="aspect-square overflow-hidden bg-background">
                  {s.cover_image ? (
                    <img src={s.cover_image} alt={s.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-muted/20">
                      {s.brand_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-xs text-muted">{s.brand_name}</div>
                  <div className="text-sm font-medium group-hover:text-primary line-clamp-1">{s.name}</div>
                  <div className="mt-1 text-sm font-bold text-primary">
                    {s.price_min != null ? `¥${s.price_min.toLocaleString()}` : "-"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpecBadge({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}