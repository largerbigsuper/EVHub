"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, BrandItem } from "@/types/api";

export default function AdminVehiclesPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<BaseResponse<BrandItem[]>>("/brands").then((res) => {
      setBrands(res.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">车型数据</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">车型数据</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/vehicles/brands"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary-dark"
          >
            品牌管理
          </Link>
          <Link
            href="/admin/vehicles/series"
            className="rounded-lg bg-secondary px-4 py-2 text-sm text-white transition-colors hover:bg-secondary-light"
          >
            车系管理
          </Link>
          <Link
            href="/admin/vehicles/skus"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors"
          >
            SKU 管理
          </Link>
          <Link
            href="/admin/vehicles/attributes"
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
          >
            属性定义
          </Link>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">品牌总览</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/admin/vehicles/brands/${brand.id}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-background text-2xl">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="h-full w-full rounded-lg object-contain" />
              ) : (
                brand.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{brand.name}</div>
              <div className="text-sm text-muted">
                {brand.country && `${brand.country} · `}{brand.series_count} 个车系
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}