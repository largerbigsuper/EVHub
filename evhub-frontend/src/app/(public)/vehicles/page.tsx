import { VehicleFilterPanel, VehicleList } from "./VehicleClient";
import type { BrandItem } from "@/types/api";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const metadata: Metadata = {
  title: "电动车车型筛选 - EVHub",
  description: "按品牌、电池类型、价格、续航等条件筛选电动车车型，对比参数，找到最适合你的电动车。",
};

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  let brands: BrandItem[] = [];

  try {
    const res = await fetch(`${API_BASE}/brands`, { next: { revalidate: 3600 } });
    const json = await res.json();
    brands = json.data || [];
  } catch {
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">电动车车型筛选</h1>

      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">筛选条件</h2>
            <VehicleFilterPanel brands={brands} initialParams={sp} />
          </div>
        </aside>

        <main className="lg:col-span-3">
          <VehicleList searchParams={sp} />
        </main>
      </div>
    </div>
  );
}