import { BrandGrid, FilterableBrandList } from "./BrandListClient";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  country: string | null;
  founded_year: number | null;
  is_featured: boolean;
  series_count: number;
}

interface ApiResponse {
  code: number;
  data: Brand[] | null;
}

export const metadata: Metadata = {
  title: "电动车品牌大全 - EVHub",
  description: "浏览国内外知名电动车品牌，了解各品牌旗下车型和最新动态。",
};

export const revalidate = 3600;

export default async function BrandsPage() {
  let brands: Brand[] = [];
  let countries: string[] = [];

  try {
    const res = await fetch(`${API_BASE}/brands`, { next: { revalidate: 3600 } });
    const json: ApiResponse = await res.json();
    brands = json.data || [];
    const countrySet = new Set<string>();
    brands.forEach((b) => { if (b.country) countrySet.add(b.country); });
    countries = Array.from(countrySet).sort();
  } catch {
  }

  const featured = brands.filter((b) => b.is_featured);
  const rest = brands.filter((b) => !b.is_featured);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">电动车品牌大全</h1>

      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-muted">推荐品牌</h2>
          <BrandGrid brands={featured} />
        </section>
      )}

      <FilterableBrandList brands={rest} countries={countries} />
    </div>
  );
}