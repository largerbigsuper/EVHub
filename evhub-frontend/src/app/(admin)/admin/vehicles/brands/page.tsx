"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import ImageUpload from "@/components/common/ImageUpload";
import PreviewModal from "@/components/common/PreviewModal";
import type { BaseResponse, BrandItem } from "@/types/api";

export default function AdminBrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", logo: "", country: "", founded_year: "", website: "", description: "", is_featured: false, sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBrands = useCallback(async () => {
    const params: Record<string, string> = {};
    if (keyword.trim()) params.keyword = keyword.trim();
    const res = await apiClient.get<BaseResponse<BrandItem[]>>("/brands", { params });
    setBrands(res.data.data || []);
    setLoading(false);
  }, [keyword]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openCreate = () => {
    setForm({ name: "", slug: "", logo: "", country: "", founded_year: "", website: "", description: "", is_featured: false, sort_order: 0 });
    setEditId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (b: BrandItem) => {
    setForm({
      name: b.name, slug: b.slug, logo: b.logo || "", country: b.country || "",
      founded_year: b.founded_year ? String(b.founded_year) : "",
      website: b.website || "", description: b.description || "",
      is_featured: b.is_featured, sort_order: b.sort_order,
    });
    setEditId(b.id);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      };
      if (editId) {
        await apiClient.put(`/admin/brands/${editId}`, payload);
      } else {
        await apiClient.post("/admin/brands", payload);
      }
      setShowForm(false);
      await fetchBrands();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除品牌「${name}」？`)) return;
    try {
      await apiClient.delete(`/admin/brands/${id}`);
      await fetchBrands();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || "删除失败");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">品牌管理</h1>
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
          <h1 className="text-2xl font-bold">品牌管理</h1>
          <Link href="/admin/vehicles" className="text-sm text-primary hover:underline">← 返回车型数据</Link>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          添加品牌
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="搜索品牌名称/标识/国家..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-64 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {keyword && (
          <button onClick={() => setKeyword("")} className="text-sm text-muted hover:text-foreground">清除</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Logo</th>
              <th className="px-4 py-3 text-left font-medium">名称</th>
              <th className="px-4 py-3 text-left font-medium">标识</th>
              <th className="px-4 py-3 text-left font-medium">国家</th>
              <th className="px-4 py-3 text-left font-medium">车系</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-border hover:bg-background">
                <td className="px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-background text-lg font-bold">
                    {b.logo ? <img src={b.logo} alt="" className="h-full w-full rounded object-contain" /> : b.name.charAt(0)}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/vehicles/brands/${b.id}`} className="text-primary hover:underline">
                    {b.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{b.slug}</td>
                <td className="px-4 py-3 text-muted">{b.country || "-"}</td>
                <td className="px-4 py-3">{b.series_count}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(b)} className="mr-2 text-primary hover:underline">编辑</button>
                  <button onClick={() => handleDelete(b.id, b.name)} className="text-danger hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">暂无品牌数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editId ? "编辑品牌" : "添加品牌"}</h2>
            {error && <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
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
                <label className="mb-1 block text-sm text-muted">Logo</label>
                <ImageUpload
                  value={form.logo}
                  onChange={(url) => setForm({ ...form, logo: url })}
                  folder="brands"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded" />
                  置顶显示
                </label>
                <div className="flex items-center gap-2 text-sm text-muted">
                  排序：
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-20 rounded-lg border border-border px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
                  预览
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
                  取消
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50">
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PreviewModal
        type="brand"
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={{
          name: form.name,
          logo: form.logo,
          country: form.country,
          founded_year: form.founded_year,
          website: form.website,
          description: form.description,
        }}
      />
    </div>
  );
}