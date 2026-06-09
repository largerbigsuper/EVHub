"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { CommentItem, CommentReplyItem, PageResponse, BaseResponse } from "@/types/api";

interface Props {
  topicId: string;
  initialComments: CommentItem[];
  initialMeta: { total: number; total_pages: number };
}

export function TopicClient({ topicId, initialComments, initialMeta }: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const loadComments = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await apiClient.get<PageResponse<CommentItem>>(
          `/comments?target_type=topic&target_id=${topicId}&page=${p}&page_size=20`
        );
        setComments(res.data.data || []);
        setMeta(res.data.meta);
        setPage(p);
      } finally {
        setLoading(false);
      }
    },
    [topicId]
  );

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated) { router.push("/login"); return; }
    try {
      await apiClient.post("/likes", { target_type: "comment", target_id: commentId });
      const res = await apiClient.get<PageResponse<CommentItem>>(
        `/comments?target_type=topic&target_id=${topicId}&page=${page}&page_size=20`
      );
      setComments(res.data.data || []);
    } catch {
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) { router.push("/login"); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post("/comments", {
        target_type: "topic",
        target_id: topicId,
        content: newComment.trim(),
      });
      setNewComment("");
      await loadComments(1);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发表失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setReplySubmitting(true);
    try {
      await apiClient.post("/comments", {
        target_type: "topic",
        target_id: topicId,
        content: replyContent.trim(),
        parent_id: parentId,
      });
      setReplyTo(null);
      setReplyContent("");
      await loadComments(1);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "回复失败");
    } finally {
      setReplySubmitting(false);
    }
  };

  const toggleReplies = (id: string) => {
    const next = new Set(expandedReplies);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedReplies(next);
  };

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString("zh-CN");
  }

  return (
    <div>
      {/* Comment Input */}
      <div className="mb-6 rounded-xl border border-border p-4">
        <textarea
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAuthenticated ? "写下你的评论..." : "登录后发表评论"}
          disabled={!isAuthenticated}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted">
            {replyTo ? `回复 @${replyTo.username}` : ""}
          </span>
          {!isAuthenticated ? (
            <button
              onClick={() => router.push(`/login?redirect=/community/${topicId}`)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              登录后评论
            </button>
          ) : (
            <button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? "发送中..." : "发表评论"}
            </button>
          )}
        </div>
      </div>

      {/* Comments List */}
      <h3 className="mb-4 text-lg font-bold">评论 ({meta.total})</h3>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {c.user?.avatar ? (
                  <img src={c.user.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
                    {(c.user?.nickname || c.user?.username || "?").charAt(0)}
                  </span>
                )}
                <span className="text-sm font-medium">{c.user?.nickname || c.user?.username}</span>
                {c.floor != null && (
                  <span className="text-xs text-muted">#{c.floor}</span>
                )}
              </div>
              <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
            </div>
            <p className="mb-3 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLike(c.id)}
                className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
              >
                <span>{c.like_count > 0 ? "❤️" : "🤍"}</span>
                {c.like_count > 0 && c.like_count}
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) { router.push("/login"); return; }
                  setReplyTo({ id: c.id, username: c.user?.username || "匿名" });
                  setReplyContent("");
                }}
                className="text-xs text-muted hover:text-primary transition-colors"
              >
                回复
              </button>
              {c.replies.length > 0 && (
                <button
                  onClick={() => toggleReplies(c.id)}
                  className="text-xs text-muted hover:text-primary transition-colors"
                >
                  {expandedReplies.has(c.id) ? "收起回复" : `${c.replies.length} 条回复`}
                </button>
              )}
            </div>

            {/* Reply Input */}
            {replyTo?.id === c.id && (
              <div className="mt-3 rounded-lg border border-border bg-background p-3">
                <textarea
                  rows={2}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`回复 @${replyTo.username}...`}
                  className="w-full rounded border border-border px-2 py-1.5 text-xs focus:border-primary focus:outline-none resize-none"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setReplyTo(null)}
                    className="rounded px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleReply(c.id)}
                    disabled={replySubmitting || !replyContent.trim()}
                    className="rounded bg-primary px-3 py-1 text-xs text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {replySubmitting ? "发送中..." : "回复"}
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {expandedReplies.has(c.id) && c.replies.length > 0 && (
              <div className="mt-3 ml-6 space-y-2 border-l-2 border-border/50 pl-4">
                {c.replies.map((r) => (
                  <div key={r.id} className="rounded bg-background p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium">{r.user?.nickname || r.user?.username}</span>
                      <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                    <div className="mt-1">
                      <button
                        onClick={() => handleLike(r.id)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
                      >
                        <span>{r.like_count > 0 ? "❤️" : "🤍"}</span>
                        {r.like_count > 0 && r.like_count}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {meta.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {page > 1 && (
            <button onClick={() => loadComments(page - 1)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
              上一页
            </button>
          )}
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                {p === page ? (
                  <span className="rounded bg-primary px-3 py-1.5 text-sm text-white">{p}</span>
                ) : (
                  <button onClick={() => loadComments(p)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
                    {p}
                  </button>
                )}
              </span>
            ))}
          {page < meta.total_pages && (
            <button onClick={() => loadComments(page + 1)} className="rounded px-3 py-1.5 text-sm border border-border hover:bg-background">
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}