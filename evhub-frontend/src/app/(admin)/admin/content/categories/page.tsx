"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useToast } from "@/components/common/Toast";
import type { BaseResponse, CategoryItem } from "@/types/api";

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
  article_count: number;
  depth: number;
}

function flattenTree(cats: CategoryItem[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const c of cats) {
    result.push({
      id: c.id, name: c.name, slug: c.slug,
      parent_id: c.parent_id, description: c.description,
      sort_order: c.sort_order, article_count: c.article_count,
      depth,
    });
    if (c.children) {
      result.push(...flattenTree(c.children, depth + 1));
    }
  }
  return result;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", parent_id: "", description: "", icon: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Parent options (only top-level, to enforce max 2 levels)
  const [parentOptions, setParentOptions] = useState<FlatCategory[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<BaseResponse<CategoryItem[]>>("/articles/categories");
      const flat = flattenTree(res.data.data || []);
      setCategories(flat);
      // Only allow selecting top-level categories as parent
      const topLevel = flat.filter((c) => c.depth === 0 && c.id !== editId);
      setParentOptions(topLevel);
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = (parentId: string = "") => {
    setForm({ name: "", slug: "", parent_id: parentId, description: "", icon: "", sort_order: 0 });
    setEditId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (c: FlatCategory) => {
    setForm({
      name: c.name, slug: c.slug,
      parent_id: c.parent_id || "",
      description: c.description || "",
      icon: "",
      sort_order: c.sort_order,
    });
    setEditId(c.id);
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
        parent_id: form.parent_id || null,
      };
      if (editId) {
        await apiClient.put(`/admin/categories/${editId}`, payload);
      } else {
        await apiClient.post("/admin/categories", payload);
      }
      toast(editId ? "保存成功" : "创建成功", "success");
      setShowForm(false);
      setLoading(true);
      await fetchCategories();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除分类「${name}」？\n该分类下的文章将不会受到影响。`)) return;
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      toast("删除成功", "success");
      await fetchCategories();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败", "error");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">分类管理</h1>
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
          <h1 className="text-2xl font-bold">分类管理</h1>
          <button onClick={() => router.push("/admin/content")} className="text-sm text-primary hover:underline">
            ← 返回内容管理
          </button>
        </div>
        <button onClick={() => openCreate()} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
          添加分类
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">名称</th>
              <th className="px-4 py-3 text-left font-medium w-48">标识</th>
              <th className="px-4 py-3 text-left font-medium w-20">文章数</th>
              <th className="px-4 py-3 text-left font-medium w-20">排序</th>
              <th className="px-4 py-3 text-right font-medium w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-border hover:bg-background">
                <td className="px-4 py-3">
                  <span style={{ paddingLeft: c.depth * 20 }}>
                    {c.depth > 0 && <span className="mr-1 text-muted">└</span>}
                    <span className={c.depth === 0 ? "font-medium" : ""}>{c.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{c.slug}</td>
                <td className="px-4 py-3 text-muted">{c.article_count}</td>
                <td className="px-4 py-3 text-muted">{c.sort_order}</td>
                <td className="px-4 py-3 text-right">
                  {c.depth === 0 && (
                    <button
                      onClick={() => openCreate(c.id)}
                      className="mr-2 text-accent hover:underline text-xs"
                    >
                      添加子分类
                    </button>
                  )}
                  <button onClick={() => openEdit(c)} className="mr-2 text-primary hover:underline text-xs">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-danger hover:underline text-xs">
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  暂无分类
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editId ? "编辑分类" : "添加分类"}</h2>
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
                <label className="mb-1 block text-sm text-muted">父分类（最多二级）</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-background"
                >
                  <option value="">无（顶级）</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">描述</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">排序</label>
                <input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-20 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
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
    </div>
  );
}