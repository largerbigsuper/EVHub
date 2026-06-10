"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, BrandDetail, SeriesItem } from "@/types/api";

export default function AdminBrandEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", logo: "", country: "", founded_year: "", website: "", description: "", is_featured: false, sort_order: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<BaseResponse<BrandDetail>>(`/brands?detail=1`);
        const brands = res.data.data;
        if (brands) {
          setBrand(brands);
          setSeries(brands.series || []);
          setForm({
            name: brands.name, slug: brands.slug, logo: brands.logo || "", country: brands.country || "",
            founded_year: brands.founded_year ? String(brands.founded_year) : "",
            website: brands.website || "", description: brands.description || "",
            is_featured: brands.is_featured, sort_order: brands.sort_order,
          });
        }
      } catch {
        setError("加载品牌信息失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      };
      await apiClient.put(`/admin/brands/${id}`, payload);
      setSuccess("保存成功");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="h-96 animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/vehicles/brands" className="text-sm text-primary hover:underline">← 返回品牌列表</Link>
        <h1 className="text-2xl font-bold">编辑品牌</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-surface p-6">
            {error && <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
            {success && <div className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted">名称 *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted">标识(slug) *</label>
                  <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Logo URL</label>
                <div className="flex items-center gap-3">
                  {form.logo && (
                    <img src={form.logo} alt="Preview" className="h-12 w-12 rounded-lg object-contain bg-background" />
                  )}
                  <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted">国家</label>
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted">成立年份</label>
                  <input type="number" value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">官网</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">描述</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded" /> 置顶显示
                </label>
                <div className="flex items-center gap-2 text-sm text-muted">
                  排序：<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-20 rounded-lg border border-border px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-primary px-6 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
                  {saving ? "保存中..." : "保存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">旗下车系 ({series.length})</h3>
            <Link href="/admin/vehicles/series" className="text-xs text-primary hover:underline">管理车系 →</Link>
          </div>
          {series.length === 0 ? (
            <p className="text-sm text-muted">暂无车系</p>
          ) : (
            <ul className="space-y-2">
              {series.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted">{s.sku_count} 款</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}