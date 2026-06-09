"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function NewTopicPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/community/new");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("请输入帖子标题"); return; }
    if (!content.trim()) { setError("请输入帖子内容"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
      };
      if (tags.trim()) {
        payload.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }

      const res = await apiClient.post<{ code: number; message: string; data: { id: string } }>(
        "/topics", payload
      );
      const newId = res.data.data?.id;
      if (newId) {
        router.push(`/community/${newId}`);
      } else {
        router.push("/community");
      }
      router.refresh();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发布失败");
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
      <Link href="/community" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← 返回社区
      </Link>
      <h1 className="mb-2 text-3xl font-bold">发布帖子</h1>
      <p className="mb-8 text-muted">分享你的电动车知识和经验</p>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入帖子标题..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">内容 *</label>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的想法..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">标签</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="如：求助, 分享, 改装 （逗号分隔）"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Link href="/community" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors">
            取消
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "发布中..." : "发布帖子"}
          </button>
        </div>
      </div>
    </div>
  );
}