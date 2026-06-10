"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import type { BaseResponse, HotKeyword } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchHotKeywords = useCallback(async () => {
    try {
      const res = await apiClient.get<BaseResponse<{ keywords: HotKeyword[] }>>("/search/hot");
      setHotKeywords(res.data.data?.keywords || []);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchHotKeywords();
  }, [fetchHotKeywords]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await apiClient.get<BaseResponse<{ suggestions: string[] }>>(`/search/suggest?q=${encodeURIComponent(q)}`);
      setSuggestions(res.data.data?.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSearch = (q?: string) => {
    const searchQuery = q || query.trim();
    if (!searchQuery) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query ? suggestions : hotKeywords.map((k) => k.keyword);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < items.length) {
        handleSearch(items[selectedIdx]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-warning/30 text-inherit rounded-sm px-0.5">{part}</mark> : part
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索车型、文章、品牌..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2 pr-10 text-sm focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-primary transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg">
          {query && suggestions.length > 0 ? (
            <div className="p-2">
              <div className="px-2 py-1 text-xs text-muted">搜索建议</div>
              {suggestions.map((s, idx) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    idx === selectedIdx ? "bg-primary/10 text-primary" : "hover:bg-background"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {highlight(s, query)}
                </button>
              ))}
            </div>
          ) : query && !loading && suggestions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              未找到匹配结果，按回车搜索 &quot;{query}&quot;
            </div>
          ) : (
            <div className="p-2">
              <div className="px-2 py-1 text-xs text-muted">热搜</div>
              {hotKeywords.length > 0 ? (
                hotKeywords.map((kw, idx) => (
                  <button
                    key={kw.keyword}
                    onClick={() => handleSearch(kw.keyword)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      idx === selectedIdx ? "bg-primary/10 text-primary" : "hover:bg-background"
                    }`}
                  >
                    <span>{kw.keyword}</span>
                    <span className="text-xs text-muted">{kw.search_count}次</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-center text-sm text-muted">暂无热搜</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}