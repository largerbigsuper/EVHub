"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { BaseResponse, PageResponse, SkuSimpleItem } from "@/types/api";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

export default function NewModBuildPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [isLegal, setIsLegal] = useState(true);
  const [legalNote, setLegalNote] = useState("");
  const [tags, setTags] = useState("");
  const [showLegalWarning, setShowLegalWarning] = useState(false);

  const [selectedSku, setSelectedSku] = useState<SkuSimpleItem | null>(null);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuResults, setSkuResults] = useState<SkuSimpleItem[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);

  const [parts, setParts] = useState<{
    name: string;
    brand: string;
    price: string;
    purchase_url: string;
    is_legal: boolean;
    quantity: string;
    notes: string;
  }[]>([
    { name: "", brand: "", price: "", purchase_url: "", is_legal: true, quantity: "1", notes: "" },
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/mod/new");
    }
  }, [isAuthenticated, router]);

  const searchSkus = useCallback(async () => {
    if (skuSearch.length < 1) { setSkuResults([]); return; }
    setSkuLoading(true);
    try {
      const res = await apiClient.get<PageResponse<SkuSimpleItem>>(`/vehicles/skus?q=${encodeURIComponent(skuSearch)}&page_size=10`);
      setSkuResults(res.data.data || []);
    } catch {
      setSkuResults([]);
    } finally {
      setSkuLoading(false);
    }
  }, [skuSearch]);

  useEffect(() => {
    const timer = setTimeout(searchSkus, 300);
    return () => clearTimeout(timer);
  }, [searchSkus]);

  const addPart = () => {
    setParts([...parts, { name: "", brand: "", price: "", purchase_url: "", is_legal: true, quantity: "1", notes: "" }]);
  };

  const removePart = (idx: number) => {
    if (parts.length <= 1) return;
    setParts(parts.filter((_, i) => i !== idx));
  };

  const updatePart = (idx: number, field: string, value: string | boolean) => {
    const newParts = [...parts];
    (newParts[idx] as Record<string, string | boolean>)[field] = value;
    setParts(newParts);
  };

  const handleIsLegalChange = (val: boolean) => {
    setIsLegal(val);
    if (!val) {
      setShowLegalWarning(true);
    }
  };

  const autoSlug = (val: string) => {
    const s = val
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 250);
    return s;
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("请输入方案标题"); return; }
    if (!content.trim()) { setError("请输入改装内容"); return; }
    if (!slug.trim()) { setError("请输入URL标识"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        is_legal: isLegal,
      };
      if (description) payload.description = description.trim();
      if (coverImage) payload.cover_image = coverImage.trim();
      if (difficulty) payload.difficulty = difficulty;
      if (totalCost) payload.total_cost = parseFloat(totalCost);
      if (isLegal === false && legalNote.trim()) payload.legal_note = legalNote.trim();
      if (tags.trim()) payload.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (selectedSku) payload.vehicle_sku_id = selectedSku.id;

      const validParts = parts
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          brand: p.brand.trim() || undefined,
          price: p.price ? parseFloat(p.price) : undefined,
          purchase_url: p.purchase_url.trim() || undefined,
          is_legal: p.is_legal,
          quantity: parseInt(p.quantity, 10) || 1,
          notes: p.notes.trim() || undefined,
        }));
      payload.parts = validParts;

      await apiClient.post("/mod/builds", payload);
      router.push(`/mod/${slug.trim()}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发布失败";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">请先登录...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/mod" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← 返回方案列表
      </Link>
      <h1 className="mb-2 text-3xl font-bold">发布改装方案</h1>
      <p className="mb-8 text-muted">分享你的电动车改装经验，帮助更多人</p>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Title & Slug */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">方案标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug || slug === autoSlug(title)) {
                setSlug(autoSlug(e.target.value));
              }
            }}
            placeholder="如：九号E300P 外观升级方案"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">URL标识</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e300p-look-upgrade"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">用于生成URL，如 /mod/e300p-look-upgrade</p>
        </div>

        {/* Cover Image */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">封面图 URL</label>
          <input
            type="text"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Vehicle SKU */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">关联车型</label>
          {selectedSku ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="flex-1 text-sm">
                {selectedSku.brand_name} {selectedSku.series_name} {selectedSku.name}
              </span>
              <button
                onClick={() => setSelectedSku(null)}
                className="text-xs text-muted hover:text-danger"
              >
                移除
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder="搜索车型名称..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {skuSearch && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                  {skuLoading ? (
                    <div className="px-3 py-2 text-sm text-muted">搜索中...</div>
                  ) : skuResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted">未找到匹配车型</div>
                  ) : (
                    skuResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSku(s);
                          setSkuSearch("");
                          setSkuResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-background transition-colors"
                      >
                        {s.brand_name} {s.series_name} <span className="font-medium">{s.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">方案简介</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简单描述这个改装方案..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Content (Markdown) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">改装内容 *（Markdown格式）</label>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`## 改装步骤\n\n1. 第一步...\n2. 第二步...\n\n## 注意事项\n\n...`}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
          />
        </div>

        {/* Difficulty & Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">改装难度</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-surface"
            >
              <option value="">请选择</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">总费用（元）</label>
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="如 5000"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">标签</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="外观, 性能, 灯光 （逗号分隔）"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-border p-4">
          <label className="mb-2 block text-sm font-medium">合规声明 *</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_legal"
                checked={isLegal}
                onChange={() => handleIsLegalChange(true)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">合法改装</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_legal"
                checked={!isLegal}
                onChange={() => handleIsLegalChange(false)}
                className="h-4 w-4 text-danger"
              />
              <span className="text-sm text-danger">非合规改装</span>
            </label>
          </div>
          {isLegal === false && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="text-sm text-danger">
                ⚠️ 非合规方案将在审核时被重点审查，可能被拒绝发布。请确保你了解相关法律风险。
              </p>
              <label className="mt-2 block text-sm text-muted">合规说明</label>
              <textarea
                rows={2}
                value={legalNote}
                onChange={(e) => setLegalNote(e.target.value)}
                placeholder="请说明为什么此方案可能不符合规定，以及适用场景..."
                className="mt-1 w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Parts */}
        <div className="rounded-xl border border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">配件清单</h2>
            <button
              type="button"
              onClick={addPart}
              className="rounded-lg border border-primary px-3 py-1 text-xs text-primary hover:bg-primary/5 transition-colors"
            >
              + 添加配件
            </button>
          </div>
          <div className="space-y-4">
            {parts.map((p, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">配件 #{idx + 1}</span>
                  {parts.length > 1 && (
                    <button
                      onClick={() => removePart(idx)}
                      className="text-xs text-muted hover:text-danger"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-xs text-muted">名称</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePart(idx, "name", e.target.value)}
                      placeholder="如：LED大灯"
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-xs text-muted">品牌</label>
                    <input
                      type="text"
                      value={p.brand}
                      onChange={(e) => updatePart(idx, "brand", e.target.value)}
                      placeholder="如：海拉"
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">单价（元）</label>
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => updatePart(idx, "price", e.target.value)}
                      placeholder="500"
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">数量</label>
                    <input
                      type="number"
                      value={p.quantity}
                      onChange={(e) => updatePart(idx, "quantity", e.target.value)}
                      min="1"
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-muted">购买链接</label>
                    <input
                      type="text"
                      value={p.purchase_url}
                      onChange={(e) => updatePart(idx, "purchase_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-muted">备注</label>
                    <input
                      type="text"
                      value={p.notes}
                      onChange={(e) => updatePart(idx, "notes", e.target.value)}
                      placeholder="安装注意事项..."
                      className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.is_legal}
                        onChange={(e) => updatePart(idx, "is_legal", e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs">该配件为合规配件</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Link href="/mod" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors">
            取消
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "发布中..." : "提交方案"}
          </button>
        </div>
      </div>

      {/* Legal Warning Dialog */}
      {showLegalWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLegalWarning(false)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-danger">法律风险提示</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  非合规改装方案存在以下风险：
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
                  <li>可能违反《道路交通安全法》</li>
                  <li>可能导致车辆无法上牌或年检</li>
                  <li>可能影响保险理赔</li>
                  <li>可能造成安全隐患</li>
                </ul>
                <p className="mt-3 text-sm">
                  请确认此方案仅用于非道路使用的展示场景（如赛道、展览等），并请在合规说明中注明。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsLegal(true);
                  setShowLegalWarning(false);
                }}
                className="rounded-lg bg-success px-4 py-2 text-sm text-white hover:bg-success/80"
              >
                改为合规方案
              </button>
              <button
                onClick={() => setShowLegalWarning(false)}
                className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:bg-danger/80"
              >
                我已知晓风险
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}