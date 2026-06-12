"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import ImageUpload from "@/components/common/ImageUpload";
import PreviewModal from "@/components/common/PreviewModal";
import { useToast } from "@/components/common/Toast";
import type { BaseResponse, BrandItem } from "@/types/api";

export default function BrandEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [brand, setBrand] = useState<BrandItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    country: "",
    founded_year: "",
    website: "",
    logo: "",
    description: "",
    is_featured: false,
    sort_order: 0,
  });

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<BaseResponse<BrandItem>>(`/admin/brands/${id}`)
      .then((res) => {
        const b = res.data.data!;
        setBrand(b);
        setForm({
          name: b.name || "",
          slug: b.slug || "",
          country: b.country || "",
          founded_year: b.founded_year?.toString() || "",
          website: b.website || "",
          logo: b.logo || "",
          description: b.description || "",
          is_featured: b.is_featured || false,
          sort_order: b.sort_order || 0,
        });
      })
      .catch(() => setError("品牌不存在"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug,
        country: form.country || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        website: form.website || null,
        logo: form.logo || null,
        description: form.description || null,
        is_featured: form.is_featured,
        sort_order: form.sort_order,
      };
      await apiClient.put(`/admin/brands/${id}`, payload);
      toast("保存成功", "success");
      router.push("/admin/vehicles/brands");
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除此品牌吗？")) return;
    try {
      await apiClient.delete(`/admin/brands/${id}`);
      toast("删除成功", "success");
      router.push("/admin/vehicles/brands");
    } catch {
      setError("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted">加载中...</p>
      </div>
    );
  }

  if (error && !brand) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
        <p className="text-muted">{error}</p>
        <Link href="/admin/vehicles/brands" className="text-sm text-primary hover:underline">
          返回品牌列表
        </Link>
      </div>
    );
  }

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={String(form[key])}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          type={type}
          value={String(form[key])}
          onChange={(e) =>
            setForm({
              ...form,
              [key]: type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value,
            })
          }
          placeholder={placeholder}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">编辑品牌</h1>
          <Link href="/admin/vehicles/brands" className="text-sm text-primary hover:underline">
            ← 返回品牌列表
          </Link>
        </div>
        <button
          onClick={handleDelete}
          className="rounded border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger/10 transition-colors"
        >
          删除品牌
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        {field("名称", "name")}
        {field("标识 (slug)", "slug")}
        {field("国家", "country")}
        <div className="grid grid-cols-2 gap-4">
          {field("成立年份", "founded_year", "number")}
          {field("排序", "sort_order", "number")}
        </div>
        {field("网站", "website")}
        <div>
          <label className="mb-1 block text-sm font-medium">Logo</label>
          <ImageUpload
            value={String(form.logo)}
            onChange={(url) => setForm({ ...form, logo: url })}
            folder="brands"
          />
        </div>
        {field("描述", "description", "textarea")}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="rounded border-border"
          />
          <span className="text-sm">设为精选品牌</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors"
          >
            预览
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <Link
            href="/admin/vehicles/brands"
            className="rounded-lg border border-border px-6 py-2 text-sm hover:bg-background transition-colors"
          >
            取消
          </Link>
        </div>
      </div>

      <PreviewModal
        type="brand"
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={{
          name: String(form.name),
          logo: String(form.logo),
          country: String(form.country),
          founded_year: String(form.founded_year),
          website: String(form.website),
          description: String(form.description),
        }}
      />
    </div>
  );
}