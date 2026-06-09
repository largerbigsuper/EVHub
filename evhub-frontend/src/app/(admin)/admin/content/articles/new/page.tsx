"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import apiClient from "@/lib/api";
import type { BaseResponse, ArticleDetail, CategoryItem } from "@/types/api";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const ARTICLE_STATUS = [
  { label: "草稿", value: "draft" },
  { label: "已发布", value: "published" },
  { label: "待审核", value: "pending" },
  { label: "已拒绝", value: "rejected" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 250);
}

export default function ArticleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string | undefined;
  const isEdit = !!articleId;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    cover_image: "",
    category_id: "",
    tags: [] as string[],
    meta_title: "",
    meta_description: "",
    og_image_url: "",
    status: "draft",
    rejected_reason: "",
  });

  // ---- Autosave ----
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    apiClient.get<BaseResponse<CategoryItem[]>>("/articles/categories").then((res) => {
      const flatList: CategoryItem[] = [];
      const walk = (cats: CategoryItem[]) => {
        for (const c of cats) {
          flatList.push(c);
          if (c.children) walk(c.children);
        }
      };
      walk(res.data.data || []);
      setCategories(flatList);
    });
  }, []);

  useEffect(() => {
    if (!isEdit || !articleId) return;
    setLoading(true);
    apiClient.get<BaseResponse<ArticleDetail>>(`/admin/articles/${articleId}`).then((res) => {
      const a = res.data.data!;
      setForm({
        title: a.title,
        slug: a.slug,
        content: a.content,
        excerpt: a.excerpt || "",
        cover_image: a.cover_image || "",
        category_id: a.category?.id || "",
        tags: a.tags || [],
        meta_title: a.meta_title || "",
        meta_description: a.meta_description || "",
        og_image_url: a.og_image_url || "",
        status: a.status,
        rejected_reason: a.rejected_reason || "",
      });
    }).catch((err) => {
      setError(err?.response?.data?.message || "加载失败");
    }).finally(() => setLoading(false));
  }, [isEdit, articleId]);

  // Autosave draft every 30s
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      const f = formRef.current;
      if (!f.title && !f.content) return;
      const payload = { ...f, category_id: f.category_id || null };
      if (isEdit && articleId) {
        apiClient.put(`/admin/articles/${articleId}`, payload).catch(() => {});
      } else {
        apiClient.post("/admin/articles", payload).catch(() => {});
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isEdit, articleId]);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !isEdit) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }));
  };

  const handleSave = async (action: "save" | "submit" | "publish") => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
      };

      if (isEdit && articleId) {
        await apiClient.put(`/admin/articles/${articleId}`, payload);

        if (action === "submit") {
          await apiClient.post(`/admin/articles/${articleId}/submit`);
        } else if (action === "publish") {
          await apiClient.post(`/admin/articles/${articleId}/publish`);
        }
      } else {
        const res = await apiClient.post<BaseResponse<ArticleDetail>>("/admin/articles", payload);
        const newId = res.data.data?.id;

        if (newId) {
          if (action === "submit") {
            await apiClient.post(`/admin/articles/${newId}/submit`);
          } else if (action === "publish") {
            await apiClient.post(`/admin/articles/${newId}/publish`);
          }
          router.push(`/admin/content/articles/${newId}/edit`);
          return;
        }
      }

      if (action !== "save") {
        router.push("/admin/content");
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="h-96 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{isEdit ? "编辑文章" : "新建文章"}</h1>
        <button onClick={() => router.push("/admin/content")} className="text-sm text-primary hover:underline">
          ← 返回列表
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="flex h-full gap-4">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-3">
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="文章标题..."
              className="w-full rounded-lg border border-border px-4 py-2.5 text-lg font-semibold focus:border-primary focus:outline-none"
            />
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted">
            <span>slug:</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="flex-1 rounded border border-border px-2 py-1 font-mono text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex-1" data-color-mode="light">
            <MDEditor
              value={form.content}
              onChange={(val) => updateField("content", val || "")}
              height="100%"
              preview="live"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleSave("save")}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存草稿"}
            </button>
            <button
              onClick={() => handleSave("submit")}
              disabled={saving}
              className="rounded-lg bg-secondary px-4 py-2 text-sm text-white hover:bg-secondary-light disabled:opacity-50"
            >
              提交审核
            </button>
            <button
              onClick={() => handleSave("publish")}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              直接发布
            </button>
          </div>
        </div>

        {/* Right: Settings Panel */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-lg border border-border bg-surface p-4">
          <h3 className="font-semibold text-sm">发布设置</h3>

          <div>
            <label className="mb-1 block text-xs text-muted">状态</label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none bg-background"
            >
              {ARTICLE_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {form.status === "rejected" && form.rejected_reason && (
            <div className="rounded bg-danger/5 p-2 text-xs text-danger">
              拒绝原因：{form.rejected_reason}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">分类</label>
            <select
              value={form.category_id}
              onChange={(e) => updateField("category_id", e.target.value)}
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none bg-background"
            >
              <option value="">无分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? "  " : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">标签</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="输入后按 Enter"
                className="flex-1 rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
              />
              <button onClick={addTag} className="rounded border border-border px-2 py-1 text-xs hover:bg-background">
                添加
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-danger">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">摘要</label>
            <textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              placeholder="文章摘要..."
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">封面图 URL</label>
            <input
              type="text"
              value={form.cover_image}
              onChange={(e) => updateField("cover_image", e.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <hr className="border-border" />
          <h3 className="font-semibold text-sm">SEO 设置</h3>

          <div>
            <label className="mb-1 block text-xs text-muted">Meta Title</label>
            <input
              type="text"
              value={form.meta_title}
              onChange={(e) => updateField("meta_title", e.target.value)}
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Meta Description</label>
            <textarea
              rows={2}
              value={form.meta_description}
              onChange={(e) => updateField("meta_description", e.target.value)}
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">OG Image URL</label>
            <input
              type="text"
              value={form.og_image_url}
              onChange={(e) => updateField("og_image_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}