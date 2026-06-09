"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, BrandItem, SeriesItem } from "@/types/api";

export default function AdminSeriesPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ brand_id: "", name: "", slug: "", cover_image: "", description: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const brandsRes = await apiClient.get<BaseResponse<BrandItem[]>>("/brands");
    const brandList = brandsRes.data.data || [];
    setBrands(brandList);

    const results = await Promise.allSettled(
      brandList.map((b) => apiClient.get<BaseResponse<BrandItem & { series: SeriesItem[] }>>(`/brands/${b.slug}`))
    );
    const allSeries: SeriesItem[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.data.data?.series) {
        allSeries.push(...r.value.data.data.series);
      }
    });
    setSeries(allSeries);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setForm({ brand_id: brands[0]?.id || "", name: "", slug: "", cover_image: "", description: "", sort_order: 0 });
    setEditId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (s: SeriesItem) => {
    setForm({
      brand_id: s.brand_id, name: s.name, slug: s.slug,
      cover_image: s.cover_image || "", description: s.description || "",
      sort_order: s.sort_order,
    });
    setEditId(s.id);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await apiClient.put(`/admin/series/${editId}`, form);
      } else {
        await apiClient.post("/admin/series", form);
      }
      setShowForm(false);
      await fetchData();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除车系「${name}」？`)) return;
    try {
      await apiClient.delete(`/admin/series/${id}`);
      await fetchData();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">车系管理</h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">车系管理</h1>
          <Link href="/admin/vehicles" className="text-sm text-primary hover:underline">← 返回车型数据</Link>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          添加车系
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">封面</th>
              <th className="px-4 py-3 text-left font-medium">名称</th>
              <th className="px-4 py-3 text-left font-medium">所属品牌</th>
              <th className="px-4 py-3 text-left font-medium">SKU数</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id} className="border-b border-border hover:bg-background">
                <td className="px-4 py-3">
                  <div className="h-10 w-16 overflow-hidden rounded bg-background">
                    {s.cover_image ? (
                      <img src={s.cover_image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">无</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted">{s.brand_name || "-"}</td>
                <td className="px-4 py-3">{s.sku_count}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="mr-2 text-primary hover:underline">编辑</button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-danger hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {series.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">暂无车系数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editId ? "编辑车系" : "添加车系"}</h2>
            {error && <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted">所属品牌 *</label>
                <select required value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">请选择品牌</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <label className="mb-1 block text-sm text-muted">封面图 URL</label>
                <input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">描述</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">取消</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}