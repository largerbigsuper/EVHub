"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, PageResponse, BrandItem, SkuSimpleItem } from "@/types/api";

export function VehicleFilterPanel({
  brands,
  initialParams,
}: {
  brands: BrandItem[];
  initialParams: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [brandSlug, setBrandSlug] = useState(initialParams.brand_slug || "");
  const [batteryType, setBatteryType] = useState(initialParams.battery_type || "");
  const [priceMin, setPriceMin] = useState(initialParams.price_min || "");
  const [priceMax, setPriceMax] = useState(initialParams.price_max || "");
  const [rangeMin, setRangeMin] = useState(initialParams.range_min || "");
  const [requiresLicense, setRequiresLicense] = useState(initialParams.requires_license || "");
  const [sortBy, setSortBy] = useState(initialParams.sort_by || "created_at");

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams();
    if (brandSlug) p.set("brand_slug", brandSlug);
    if (batteryType) p.set("battery_type", batteryType);
    if (priceMin) p.set("price_min", priceMin);
    if (priceMax) p.set("price_max", priceMax);
    if (rangeMin) p.set("range_min", rangeMin);
    if (requiresLicense) p.set("requires_license", requiresLicense);
    p.set("sort_by", sortBy);
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  }, [brandSlug, batteryType, priceMin, priceMax, rangeMin, requiresLicense, sortBy, pathname, router]);

  const resetFilters = () => {
    setBrandSlug("");
    setBatteryType("");
    setPriceMin("");
    setPriceMax("");
    setRangeMin("");
    setRequiresLicense("");
    setSortBy("created_at");
    router.push(pathname);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">品牌</label>
        <select value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="">全部品牌</option>
          {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">电池类型</label>
        <select value={batteryType} onChange={(e) => setBatteryType(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="">全部</option>
          <option value="铅酸">铅酸</option>
          <option value="锂电">锂电</option>
          <option value="磷酸铁锂">磷酸铁锂</option>
          <option value="三元锂">三元锂</option>
          <option value="钠离子">钠离子</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">价格区间</label>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="¥最低" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm focus:border-primary focus:outline-none" />
          <span className="text-muted">-</span>
          <input type="number" placeholder="¥最高" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
            className="w-full rounded-lg border border-border px-2 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">续航 ≥ (km)</label>
        <input type="number" placeholder="最小续航" value={rangeMin} onChange={(e) => setRangeMin(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">是否需要驾照</label>
        <select value={requiresLicense} onChange={(e) => setRequiresLicense(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="">不限</option>
          <option value="1">需要驾照</option>
          <option value="0">无需驾照</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">排序</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="created_at">最新发布</option>
          <option value="price_min">价格从低到高</option>
          <option value="-price_min">价格从高到低</option>
          <option value="range_km">续航从低到高</option>
          <option value="-range_km">续航从高到低</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button onClick={applyFilters}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark transition-colors">
          筛选
        </button>
        <button onClick={resetFilters}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-background transition-colors">
          重置
        </button>
      </div>
    </div>
  );
}

function SkuCard({ sku }: { sku: SkuSimpleItem }) {
  return (
    <Link
      href={`/vehicles/${sku.slug}`}
      className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary hover:shadow-lg"
    >
      <div className="aspect-[4/3] overflow-hidden bg-background">
        {sku.cover_image ? (
          <img src={sku.cover_image} alt={sku.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-bold text-muted/30">
            {sku.brand_name?.charAt(0) || "?"}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-1 text-xs text-muted">{sku.brand_name}</div>
        <h3 className="mb-2 font-semibold leading-tight group-hover:text-primary">{sku.name}</h3>
        <div className="mb-2 text-lg font-bold text-primary">
          {sku.price_min != null ? `¥${sku.price_min.toLocaleString()}` : "暂无"}
          {sku.price_max && sku.price_max !== sku.price_min ? ` - ¥${sku.price_max.toLocaleString()}` : ""}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sku.battery_type && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">{sku.battery_type}</span>
          )}
          {sku.range_km != null && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">{sku.range_km}km</span>
          )}
          {sku.requires_license && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">需驾照</span>
          )}
          {sku.motor_power_w != null && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">{sku.motor_power_w}W</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkuSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-[4/3] animate-pulse bg-background" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-background" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-background" />
        <div className="h-6 w-24 animate-pulse rounded bg-background" />
      </div>
    </div>
  );
}

export function VehicleList({ searchParams }: { searchParams: Record<string, string> }) {
  const [skus, setSkus] = useState<SkuSimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const page = parseInt(searchParams.page || "1");

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: 20 };
    if (searchParams.brand_slug) params.brand_slug = searchParams.brand_slug;
    if (searchParams.battery_type) params.battery_type = searchParams.battery_type;
    if (searchParams.price_min) params.price_min = parseFloat(searchParams.price_min);
    if (searchParams.price_max) params.price_max = parseFloat(searchParams.price_max);
    if (searchParams.range_min) params.range_min = parseInt(searchParams.range_min);
    if (searchParams.requires_license) params.requires_license = parseInt(searchParams.requires_license);
    if (searchParams.sort_by) params.sort_by = searchParams.sort_by;

    apiClient.get<PageResponse<SkuSimpleItem>>("/skus", { params }).then((res) => {
      setSkus(res.data.data || []);
      setMeta(res.data.meta);
    }).finally(() => setLoading(false));
  }, [page, searchParams.brand_slug, searchParams.battery_type, searchParams.price_min, searchParams.price_max, searchParams.range_min, searchParams.requires_license, searchParams.sort_by]);

  const router = useRouter();
  const pathname = usePathname();

  const goToPage = (p: number) => {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    sp.set("page", String(p));
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div>
      <div className="mb-4 text-sm text-muted">
        共 {meta.total} 款车型
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <SkuSkeleton key={i} />)}
        </div>
      ) : skus.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted">
          暂无匹配的车型
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {skus.map((sku) => <SkuCard key={sku.id} sku={sku} />)}
        </div>
      )}

      {meta.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => goToPage(page - 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background disabled:opacity-50">
            上一页
          </button>
          {Array.from({ length: Math.min(meta.total_pages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => goToPage(p)}
              className={`rounded-lg px-3 py-2 text-sm ${
                p === page ? "bg-primary text-white" : "border border-border hover:bg-background"
              }`}>
              {p}
            </button>
          ))}
          <button disabled={page >= meta.total_pages} onClick={() => goToPage(page + 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background disabled:opacity-50">
            下一页
          </button>
        </div>
      )}
    </div>
  );
}