"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import ImageUpload from "@/components/common/ImageUpload";
import PreviewModal from "@/components/common/PreviewModal";
import type { BaseResponse, SkuDetailItem, BrandItem, SeriesItem } from "@/types/api";

export default function AdminSkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sku, setSku] = useState<SkuDetailItem | null>(null);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    series_id: "",
    year: "",
    cover_image: "",
    price_min: "",
    price_max: "",
    battery_type: "",
    range_km: "",
    motor_power_w: "",
    top_speed_kmh: "",
    weight_kg: "",
    requires_license: false,
    colors: "",
    tags: "",
    is_featured: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const [{ data: skuData }, { data: brandsData }] = await Promise.all([
          apiClient.get<BaseResponse<SkuDetailItem>>(`/admin/skus/${id}`),
          apiClient.get<BaseResponse<BrandItem[]>>("/brands"),
        ]);
        const s = skuData.data!;
        setSku(s);
        setForm({
          name: s.name || "",
          slug: s.slug || "",
          series_id: s.series_id || "",
          year: s.year?.toString() || "",
          cover_image: s.cover_image || "",
          price_min: s.price_min?.toString() || "",
          price_max: s.price_max?.toString() || "",
          battery_type: s.battery_type || "",
          range_km: s.range_km?.toString() || "",
          motor_power_w: s.motor_power_w?.toString() || "",
          top_speed_kmh: s.top_speed_kmh?.toString() || "",
          weight_kg: s.weight_kg?.toString() || "",
          requires_license: s.requires_license ?? false,
          colors: s.colors?.join(", ") || "",
          tags: s.tags?.join(", ") || "",
          is_featured: s.is_featured ?? false,
        });
        setBrands(brandsData.data || []);
        if (s.brand_id) {
          fetchSeries(s.brand_id);
        }
      } catch {
        setError("加载车型数据失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function fetchSeries(brandId: string) {
    try {
      const { data } = await apiClient.get<BaseResponse<SeriesItem[]>>(`/series?brand_id=${brandId}`);
      setSeriesList(data.data || []);
    } catch { /* ignore */ }
  }

  async function handleBrandChange(brandId: string) {
    setForm({ ...form, series_id: "" });
    if (brandId) fetchSeries(brandId);
  }

  function handleChange(field: string, value: string | boolean) {
    setForm({ ...form, [field]: value });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.put(`/admin/skus/${id}`, {
        name: form.name,
        slug: form.slug,
        series_id: form.series_id || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        cover_image: form.cover_image || undefined,
        price_min: form.price_min ? parseFloat(form.price_min) : undefined,
        price_max: form.price_max ? parseFloat(form.price_max) : undefined,
        battery_type: form.battery_type || undefined,
        range_km: form.range_km ? parseInt(form.range_km) : undefined,
        motor_power_w: form.motor_power_w ? parseInt(form.motor_power_w) : undefined,
        top_speed_kmh: form.top_speed_kmh ? parseInt(form.top_speed_kmh) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        requires_license: form.requires_license,
        colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        is_featured: form.is_featured,
      });
      setSuccess("保存成功");
    } catch (err: any) {
      setError(err.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted">加载中...</p>
      </div>
    );
  }

  if (!sku) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted">车型不存在</p>
        <Link href="/admin/vehicles/skus" className="text-primary hover:underline text-sm">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/vehicles/skus" className="text-sm text-primary hover:underline">
          ← 返回车型列表
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-lg font-semibold">编辑车型 - {sku.name}</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">{success}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">车型名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL 标识 (slug) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">品牌</label>
              <select
                value={sku.brand_id || ""}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">选择品牌</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">车系</label>
              <select
                value={form.series_id}
                onChange={(e) => handleChange("series_id", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">选择车系</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">年份</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">最低价 (¥)</label>
              <input
                type="number"
                value={form.price_min}
                onChange={(e) => handleChange("price_min", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">最高价 (¥)</label>
              <input
                type="number"
                value={form.price_max}
                onChange={(e) => handleChange("price_max", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">电池类型</label>
              <input
                type="text"
                value={form.battery_type}
                onChange={(e) => handleChange("battery_type", e.target.value)}
                placeholder="锂电/铅酸"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">续航 (km)</label>
              <input
                type="number"
                value={form.range_km}
                onChange={(e) => handleChange("range_km", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">电机功率 (W)</label>
              <input
                type="number"
                value={form.motor_power_w}
                onChange={(e) => handleChange("motor_power_w", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">最高速度 (km/h)</label>
              <input
                type="number"
                value={form.top_speed_kmh}
                onChange={(e) => handleChange("top_speed_kmh", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">重量 (kg)</label>
              <input
                type="number"
                value={form.weight_kg}
                onChange={(e) => handleChange("weight_kg", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">封面图</label>
              <ImageUpload
                value={form.cover_image}
                onChange={(url) => handleChange("cover_image", url)}
                folder="skus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">颜色 (逗号分隔)</label>
              <input
                type="text"
                value={form.colors}
                onChange={(e) => handleChange("colors", e.target.value)}
                placeholder="红色, 蓝色, 黑色"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">标签 (逗号分隔)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleChange("tags", e.target.value)}
                placeholder="通勤, 长续航"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requires_license}
                onChange={(e) => handleChange("requires_license", e.target.checked)}
                className="rounded"
              />
              需要驾照
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => handleChange("is_featured", e.target.checked)}
                className="rounded"
              />
              精选推荐
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background"
            >
              预览
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <Link
              href="/admin/vehicles/skus"
              className="rounded-lg border border-border px-6 py-2 text-sm hover:bg-background"
            >
              取消
            </Link>
          </div>
        </div>
      </div>

      <PreviewModal
        type="sku"
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={{
          name: form.name,
          cover_image: form.cover_image,
          year: form.year,
          price_min: form.price_min,
          price_max: form.price_max,
          battery_type: form.battery_type,
          range_km: form.range_km,
          motor_power_w: form.motor_power_w,
          top_speed_kmh: form.top_speed_kmh,
          weight_kg: form.weight_kg,
          colors: form.colors,
          tags: form.tags,
        }}
      />
    </div>
  );
}