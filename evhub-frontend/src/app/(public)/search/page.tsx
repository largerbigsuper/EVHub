import Link from "next/link";
import type { Metadata } from "next";
import { SearchClient } from "./SearchClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  type: string;
  extra: Record<string, unknown> | null;
}

interface SearchResultData {
  articles: SearchResultItem[];
  vehicles: SearchResultItem[];
  brands: SearchResultItem[];
  total: number;
}

export const metadata: Metadata = {
  title: "搜索 - EVHub",
  description: "搜索电动车车型、文章、品牌和改装方案",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const q = sp.q || "";
  const type = sp.type || "all";
  const page = parseInt(sp.page || "1", 10);

  let result: SearchResultData = { articles: [], vehicles: [], brands: [], total: 0 };

  if (q) {
    try {
      const res = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}&page_size=10`
      );
      const json = await res.json();
      result = json.data || result;
    } catch {
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">搜索</h1>
      {q && (
        <p className="mb-6 text-muted">
          搜索 &quot;{q}&quot; 共找到 {result.total} 个结果
        </p>
      )}

      <SearchClient
        initialQuery={q}
        initialType={type}
        initialResult={result}
        initialPage={page}
      />
    </div>
  );
}