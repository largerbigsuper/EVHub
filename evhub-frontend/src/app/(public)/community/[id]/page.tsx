import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopicClient } from "./TopicClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface AuthorInfo {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
}

interface CommentReplyItem {
  id: string;
  user: AuthorInfo | null;
  content: string;
  parent_id: string | null;
  floor: number | null;
  like_count: number;
  created_at: string | null;
}

interface CommentItem {
  id: string;
  target_type: string;
  target_id: string;
  user: AuthorInfo | null;
  content: string;
  parent_id: string | null;
  floor: number | null;
  like_count: number;
  created_at: string | null;
  replies: CommentReplyItem[];
}

interface TopicDetailData {
  id: string;
  title: string;
  content: string;
  author: AuthorInfo | null;
  tags: string[] | null;
  view_count: number;
  reply_count: number;
  like_count: number;
  is_pinned: boolean;
  is_highlighted: boolean;
  last_reply_at: string | null;
  status: string;
  created_at: string | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/topics/${id}`);
    const json = await res.json();
    const topic: TopicDetailData | null = json.data;
    if (!topic) return { title: "帖子未找到 - EVHub" };
    return {
      title: `${topic.title} - EVHub 社区`,
      description: topic.content.slice(0, 200),
    };
  } catch {
    return { title: "社区 - EVHub" };
  }
}

export default async function TopicDetailPage({ params }: Props) {
  const { id } = await params;

  let topic: TopicDetailData | null = null;
  let comments: CommentItem[] = [];
  let commentsMeta = { total: 0, total_pages: 1 };

  try {
    const [topicRes, commentsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/topics/${id}`),
      fetch(`${API_BASE}/comments?target_type=topic&target_id=${id}&page=1&page_size=20`),
    ]);

    if (topicRes.status === "fulfilled") {
      const json = await topicRes.value.json();
      topic = json.data;
    }
    if (commentsRes.status === "fulfilled") {
      const json = await commentsRes.value.json();
      comments = json.data || [];
      commentsMeta = json.meta || commentsMeta;
    }
  } catch {
  }

  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/community" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← 返回社区
      </Link>

      <article>
        <header className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {topic.is_pinned && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">置顶</span>
            )}
            {topic.is_highlighted && (
              <span className="rounded bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">精华</span>
            )}
            {topic.tags?.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="mb-4 text-2xl font-bold leading-snug sm:text-3xl">{topic.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            {topic.author && (
              <span className="flex items-center gap-2">
                {topic.author.avatar ? (
                  <img src={topic.author.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                    {(topic.author.nickname || topic.author.username).charAt(0)}
                  </span>
                )}
                {topic.author.nickname || topic.author.username}
              </span>
            )}
            {topic.created_at && (
              <span>{new Date(topic.created_at).toLocaleDateString("zh-CN", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}</span>
            )}
            <span>{topic.view_count} 次浏览</span>
          </div>
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert mb-8
          prose-p:leading-relaxed prose-p:my-3
          prose-a:text-primary
          prose-img:rounded-xl
          prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:rounded-xl prose-pre:border prose-pre:border-border
        ">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{topic.content}</div>
        </div>

        <div className="flex items-center gap-4 border-t border-border py-4">
          <span className="text-sm text-muted">{topic.reply_count} 回复 · {topic.like_count} 点赞</span>
        </div>
      </article>

      <TopicClient
        topicId={topic.id}
        initialComments={comments}
        initialMeta={commentsMeta}
      />
    </div>
  );
}