"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, SkuDetailItem, CompareResult, SkuSimpleItem, PageResponse } from "@/types/api";

export default function ComparePage() {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SkuSimpleItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const maxCompare = 4;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.get<PageResponse<SkuSimpleItem>>("/skus", {
        params: { search: searchQuery, page_size: 10 },
      });
      setSearchResults(res.data.data || []);
    } finally {
      setSearching(false);
    }
  };

  const addToCompare = (slug: string) => {
    if (selectedSlugs.length >= maxCompare) return;
    if (selectedSlugs.includes(slug)) return;
    setSelectedSlugs([...selectedSlugs, slug]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeFromCompare = (slug: string) => {
    setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
  };

  useEffect(() => {
    if (selectedSlugs.length < 2) {
      setCompareData(null);
      return;
    }
    setLoading(true);
    const ids = selectedSlugs.join(",");
    apiClient.get<BaseResponse<CompareResult>>(`/skus/compare?ids=${ids}`)
      .then((res) => setCompareData(res.data.data))
      .finally(() => setLoading(false));
  }, [selectedSlugs]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">车型对比</h1>
          <p className="mt-1 text-sm text-muted">最多对比 {maxCompare} 款车型</p>
        </div>
        <Link href="/vehicles" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
          ← 返回车型筛选
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索车型名称添加到对比..."
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCompare(item.slug)}
                    disabled={selectedSlugs.length >= maxCompare || selectedSlugs.includes(item.slug)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-background disabled:opacity-50"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-background">
                      {item.cover_image ? (
                        <img src={item.cover_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">?</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted">{item.brand_name} · ¥{item.price_min?.toLocaleString()}</div>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted">无匹配结果</div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="rounded-lg bg-primary px-4 py-3 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {searching ? "搜索中..." : "搜索"}
          </button>
        </div>
      </div>

      {selectedSlugs.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4">
          <span className="text-sm font-medium text-muted">已选：</span>
          {selectedSlugs.map((slug, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              {slug}
              <button onClick={() => removeFromCompare(slug)} className="ml-1 text-muted hover:text-danger">×</button>
            </span>
          ))}
          {selectedSlugs.length > 0 && (
            <button onClick={() => setSelectedSlugs([])} className="ml-auto text-sm text-danger hover:underline">
              清空全部
            </button>
          )}
        </div>
      )}

      {loading && <CompareSkeleton selectedCount={selectedSlugs.length} />}

      {compareData && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-36 bg-background px-4 py-3 text-left text-muted"></th>
                {compareData.skus.map((sku) => (
                  <th key={sku.id} className="px-4 py-3 text-center min-w-[200px]">
                    <Link href={`/vehicles/${sku.slug}`} className="group">
                      <div className="mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-background">
                        {sku.cover_image ? (
                          <img src={sku.cover_image} alt={sku.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl font-bold text-muted/20">
                            {sku.brand_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted">{sku.brand_name}</div>
                      <div className="font-semibold group-hover:text-primary">{sku.name}</div>
                      <div className="mt-1 font-bold text-primary">
                        {sku.price_min != null ? `¥${sku.price_min.toLocaleString()}` : "-"}
                      </div>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="品牌" values={compareData.skus.map((s) => s.brand_name || "-")} />
              <CompareRow label="车系" values={compareData.skus.map((s) => s.series_name || "-")} />
              <CompareRow label="年份" values={compareData.skus.map((s) => s.year ? String(s.year) : "-")} />
              <CompareRow label="报价" values={compareData.skus.map((s) =>
                s.price_min != null ? `¥${s.price_min.toLocaleString()}${s.price_max && s.price_max !== s.price_min ? ` - ¥${s.price_max.toLocaleString()}` : ""}` : "-"
              )} />
              <CompareRow label="电池类型" values={compareData.skus.map((s) => s.battery_type || "-")} />
              <CompareRow label="续航" values={compareData.skus.map((s) => s.range_km ? `${s.range_km} km` : "-")} />
              <CompareRow label="电机功率" values={compareData.skus.map((s) => s.motor_power_w ? `${s.motor_power_w} W` : "-")} />
              <CompareRow label="最高时速" values={compareData.skus.map((s) => s.top_speed_kmh ? `${s.top_speed_kmh} km/h` : "-")} />
              <CompareRow label="重量" values={compareData.skus.map((s) => s.weight_kg ? `${s.weight_kg} kg` : "-")} />
              <CompareRow label="需驾照" values={compareData.skus.map((s) => s.requires_license ? "是" : "否")} />

              {compareData.attributes.map((attr) => (
                <CompareRow
                  key={attr.code}
                  label={`${attr.name}${attr.unit ? ` (${attr.unit})` : ""}`}
                  values={attr.values.map((v) => (v != null ? String(v) : "-"))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSlugs.length < 2 && !loading && (
        <div className="rounded-xl border border-border py-16 text-center text-muted">
          请添加至少 2 款车型开始对比
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  const allSame = values.every((v, _, arr) => v === arr[0]);
  return (
    <tr className="border-b border-border hover:bg-background">
      <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-4 py-3 text-center ${allSame ? "" : "font-semibold text-primary"}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}

function CompareSkeleton({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-5 w-28 animate-pulse rounded bg-surface" />
          {Array.from({ length: selectedCount }).map((_, j) => (
            <div key={j} className="h-5 flex-1 animate-pulse rounded bg-surface" />
          ))}
        </div>
      ))}
    </div>
  );
}