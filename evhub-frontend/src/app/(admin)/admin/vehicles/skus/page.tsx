"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import Pagination from "@/components/common/Pagination";
import { useToast } from "@/components/common/Toast";
import type { BaseResponse, PageResponse, BrandItem, SkuSimpleItem } from "@/types/api";

export default function AdminSkusPage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [skus, setSkus] = useState<SkuSimpleItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [filters, setFilters] = useState({
    keyword: searchParams.get("keyword") || "",
    brand_slug: searchParams.get("brand_slug") || "",
    battery_type: searchParams.get("battery_type") || "",
    requires_license: searchParams.get("requires_license") || "",
    range_min: searchParams.get("range_min") || "",
    page: parseInt(searchParams.get("page") || "1"),
  });

  const fetchSkus = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: filters.page, page_size: 20 };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.brand_slug) params.brand_slug = filters.brand_slug;
      if (filters.battery_type) params.battery_type = filters.battery_type;
      if (filters.requires_license) params.requires_license = parseInt(filters.requires_license);
      if (filters.range_min) params.range_min = parseInt(filters.range_min);
      const res = await apiClient.get<PageResponse<SkuSimpleItem>>("/skus", { params });
      setSkus(res.data.data || []);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    apiClient.get<BaseResponse<BrandItem[]>>("/brands").then((res) => setBrands(res.data.data || []));
  }, []);

  useEffect(() => { fetchSkus(); }, [fetchSkus]);

  const applyFilters = () => {
    const p = new URLSearchParams();
    if (filters.keyword) p.set("keyword", filters.keyword);
    if (filters.brand_slug) p.set("brand_slug", filters.brand_slug);
    if (filters.battery_type) p.set("battery_type", filters.battery_type);
    if (filters.requires_license) p.set("requires_license", filters.requires_license);
    if (filters.range_min) p.set("range_min", filters.range_min);
    p.set("page", "1");
    router.push(`/admin/vehicles/skus?${p.toString()}`);
    setFilters({ ...filters, page: 1 });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 SKU「${name}」？`)) return;
    try {
      await apiClient.delete(`/admin/skus/${id}`);
      toast("删除成功", "success");
      await fetchSkus();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败", "error");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SKU 管理</h1>
          <Link href="/admin/vehicles" className="text-sm text-primary hover:underline">← 返回车型数据</Link>
        </div>
        <Link href="/admin/vehicles/skus/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          添加 SKU
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-xs text-muted">关键词</label>
          <input type="text" placeholder="搜索名称/标识..."
            value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            className="w-44 rounded border border-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">品牌</label>
          <select value={filters.brand_slug} onChange={(e) => setFilters({ ...filters, brand_slug: e.target.value })}
            className="rounded border border-border px-2 py-1.5 text-sm">
            <option value="">全部品牌</option>
            {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">电池类型</label>
          <select value={filters.battery_type} onChange={(e) => setFilters({ ...filters, battery_type: e.target.value })}
            className="rounded border border-border px-2 py-1.5 text-sm">
            <option value="">全部</option>
            <option value="铅酸">铅酸</option>
            <option value="锂电">锂电</option>
            <option value="磷酸铁锂">磷酸铁锂</option>
            <option value="三元锂">三元锂</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">续航≥(km)</label>
          <input type="number" value={filters.range_min} onChange={(e) => setFilters({ ...filters, range_min: e.target.value })}
            className="w-24 rounded border border-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">需驾照</label>
          <select value={filters.requires_license} onChange={(e) => setFilters({ ...filters, requires_license: e.target.value })}
            className="rounded border border-border px-2 py-1.5 text-sm">
            <option value="">全部</option>
            <option value="1">是</option>
            <option value="0">否</option>
          </select>
        </div>
        <button onClick={applyFilters} className="rounded bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark">筛选</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">名称</th>
              <th className="px-4 py-3 text-left font-medium">品牌/车系</th>
              <th className="px-4 py-3 text-left font-medium">价格</th>
              <th className="px-4 py-3 text-left font-medium">电池</th>
              <th className="px-4 py-3 text-left font-medium">续航</th>
              <th className="px-4 py-3 text-left font-medium">驾照</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-background" /></td>
                </tr>
              ))
            ) : (
              skus.map((sku) => (
                <tr key={sku.id} className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`/admin/vehicles/skus/${sku.id}`} className="font-medium text-primary hover:underline">
                      {sku.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{sku.brand_name} / {sku.series_name}</td>
                  <td className="px-4 py-3">
                    {sku.price_min != null ? `¥${sku.price_min.toLocaleString()}` : "-"}
                    {sku.price_max != null && sku.price_max !== sku.price_min ? ` ~ ¥${sku.price_max.toLocaleString()}` : ""}
                  </td>
                  <td className="px-4 py-3">{sku.battery_type || "-"}</td>
                  <td className="px-4 py-3">{sku.range_km ? `${sku.range_km}km` : "-"}</td>
                  <td className="px-4 py-3">{sku.requires_license ? "是" : "否"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(sku.id, sku.name)} className="text-danger hover:underline">删除</button>
                  </td>
                </tr>
              ))
            )}
            {!loading && skus.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">暂无 SKU 数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <span className="text-sm text-muted">共 {meta.total} 条</span>
        <Pagination
          page={filters.page}
          totalPages={meta.total_pages}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
        />
      </div>
    </div>
  );
}