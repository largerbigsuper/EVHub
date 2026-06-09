"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  country: string | null;
  series_count: number;
}

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary hover:shadow-lg"
    >
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-background">
        {brand.logo ? (
          <img src={brand.logo} alt={brand.name} className="h-12 w-12 object-contain" />
        ) : (
          <span className="text-2xl font-bold text-primary">{brand.name.charAt(0)}</span>
        )}
      </div>
      <h3 className="mb-1 font-semibold group-hover:text-primary">{brand.name}</h3>
      <p className="text-sm text-muted">
        {brand.country && `${brand.country} · `}{brand.series_count} 个车系
      </p>
    </Link>
  );
}

export function BrandGrid({ brands }: { brands: Brand[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {brands.map((b) => (
        <BrandCard key={b.id} brand={b} />
      ))}
    </div>
  );
}

export function FilterableBrandList({ brands, countries }: { brands: Brand[]; countries: string[] }) {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const filtered = useMemo(() => {
    return brands.filter((b) => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (countryFilter && b.country !== countryFilter) return false;
      return true;
    });
  }, [brands, search, countryFilter]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((b) => set.add(b.name.charAt(0).toUpperCase()));
    return Array.from(set).sort();
  }, [filtered]);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold text-muted">全部品牌</h2>
        <input
          type="text"
          placeholder="搜索品牌..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">全部国家</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-sm text-muted">{filtered.length} 个品牌</span>
      </div>

      {letters.map((letter) => {
        const list = filtered.filter((b) => b.name.charAt(0).toUpperCase() === letter);
        if (list.length === 0) return null;
        return (
          <div key={letter} className="mb-8">
            <h3 className="mb-3 border-b border-border pb-1 text-xl font-bold text-muted">{letter}</h3>
            <BrandGrid brands={list} />
          </div>
        );
      })}
    </section>
  );
}