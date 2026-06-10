"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, SearchResult, SearchResultItem } from "@/types/api";

const TABS = [
  { key: "all", label: "全部" },
  { key: "article", label: "文章" },
  { key: "vehicle", label: "车型" },
  { key: "brand", label: "品牌" },
];

interface Props {
  initialQuery: string;
  initialType: string;
  initialResult: SearchResult;
  initialPage: number;
}

export function SearchClient({ initialQuery, initialType, initialResult, initialPage }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType);
  const [result, setResult] = useState<SearchResult>(initialResult);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(
    async (q: string, tab: string, p: number) => {
      if (!q.trim()) return;
      setLoading(true);
      try {
        const res = await apiClient.get<BaseResponse<SearchResult>>(
          `/search?q=${encodeURIComponent(q)}&type=${tab}&page=${p}&page_size=10`
        );
        setResult(res.data.data || { articles: [], vehicles: [], brands: [], total: 0 });
        setPage(p);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/search?q=${encodeURIComponent(query)}&type=${tab}&page=1`, { scroll: false });
    doSearch(query, tab, 1);
  };

  const handlePageChange = (p: number) => {
    router.push(`/search?q=${encodeURIComponent(query)}&type=${activeTab}&page=${p}`, { scroll: false });
    doSearch(query, activeTab, p);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}&type=${activeTab}&page=1`);
    doSearch(query, activeTab, 1);
  };

  const highlight = (text: string, q: string) => {
    if (!q || !text) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-warning/30 text-inherit rounded-sm px-0.5">{part}</mark> : part
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article": return "📄";
      case "vehicle": return "🚗";
      case "brand": return "🏭";
      default: return "📌";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "article": return "文章";
      case "vehicle": return "车型";
      case "brand": return "品牌";
      default: return type;
    }
  };

  const visibleItems = (): SearchResultItem[] => {
    if (activeTab === "article") return result.articles;
    if (activeTab === "vehicle") return result.vehicles;
    if (activeTab === "brand") return result.brands;
    return [...result.articles, ...result.vehicles, ...result.brands];
  };

  const items = visibleItems();
  const totalPages = Math.ceil(result.total / 10);

  return (
    <div>
      {/* Search Input */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索车型、文章、品牌..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-base focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-2 text-white hover:bg-primary-dark transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && items.length === 0 && query && (
        <div className="py-16 text-center">
          <p className="text-lg text-muted">未找到与 &quot;{query}&quot; 相关的结果</p>
          <p className="mt-2 text-sm text-muted">请尝试其他关键词</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.url}
              className="block rounded-xl border border-border p-4 transition-colors hover:border-primary hover:bg-background"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">{getTypeIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {getTypeLabel(item.type)}
                    </span>
                    <h3 className="text-base font-medium line-clamp-1">
                      {highlight(item.title, query)}
                    </h3>
                  </div>
                  {item.excerpt && (
                    <p className="text-sm text-muted line-clamp-2">
                      {highlight(item.excerpt, query)}
                    </p>
                  )}
                  {item.extra?.brand ? (
                    <p className="mt-1 text-xs text-muted">
                      {item.extra.brand as string} {item.extra.series ? `· ${item.extra.series as string}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          {page > 1 && (
            <button
              onClick={() => handlePageChange(page - 1)}
              className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
            >
              上一页
            </button>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 text-muted">...</span>}
                {p === page ? (
                  <span className="rounded bg-primary px-4 py-2 text-sm text-white">{p}</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(p)}
                    className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
                  >
                    {p}
                  </button>
                )}
              </span>
            ))}
          {page < totalPages && (
            <button
              onClick={() => handlePageChange(page + 1)}
              className="rounded px-4 py-2 text-sm border border-border hover:bg-background"
            >
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}