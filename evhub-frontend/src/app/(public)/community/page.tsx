import Link from "next/link";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface AuthorInfo {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
}

interface TopicItem {
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

interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export const metadata: Metadata = {
  title: "社区 - EVHub",
  description: "电动车爱好者社区，分享改装经验、购车心得和技术讨论。",
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 20;

  let topics: TopicItem[] = [];
  let meta: PageMeta = { page: 1, page_size: pageSize, total: 0, total_pages: 0 };

  try {
    const res = await fetch(`${API_BASE}/topics?page=${page}&page_size=${pageSize}`);
    const json = await res.json();
    topics = json.data || [];
    meta = json.meta || meta;
  } catch {
  }

  const pinned = topics.filter((t) => t.is_pinned);
  const normal = topics.filter((t) => !t.is_pinned);

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">社区</h1>
          <p className="mt-1 text-muted">电动车爱好者交流社区</p>
        </div>
        <Link
          href="/community/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          发布帖子
        </Link>
      </div>

      {topics.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p className="text-lg">暂无帖子</p>
          <Link href="/community/new" className="mt-2 inline-block text-sm text-primary hover:underline">
            成为第一个发帖的人 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pinned Topics */}
          {pinned.map((t) => (
            <TopicRow key={t.id} topic={t} pinned timeAgo={timeAgo} />
          ))}

          {/* Normal Topics */}
          {normal.map((t) => (
            <TopicRow key={t.id} topic={t} timeAgo={timeAgo} />
          ))}

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-6">
              {page > 1 && (
                <Link href={`/community?page=${page - 1}`} className="rounded px-4 py-2 text-sm border border-border hover:bg-background">
                  上一页
                </Link>
              )}
              {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 text-muted">...</span>}
                    {p === page ? (
                      <span className="rounded bg-primary px-4 py-2 text-sm text-white">{p}</span>
                    ) : (
                      <Link href={`/community?page=${p}`} className="rounded px-4 py-2 text-sm border border-border hover:bg-background">
                        {p}
                      </Link>
                    )}
                  </span>
                ))}
              {page < meta.total_pages && (
                <Link href={`/community?page=${page + 1}`} className="rounded px-4 py-2 text-sm border border-border hover:bg-background">
                  下一页
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, pinned, timeAgo }: { topic: TopicItem; pinned?: boolean; timeAgo: (d: string | null) => string }) {
  return (
    <Link
      href={`/community/${topic.id}`}
      className={`flex items-start gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary hover:bg-background ${
        pinned ? "border-primary/30 bg-primary/[0.02]" : ""
      }`}
    >
      <div className="shrink-0 pt-0.5 text-center w-8 hidden sm:block">
        {topic.author?.avatar ? (
          <img src={topic.author.avatar} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {(topic.author?.nickname || topic.author?.username || "?").charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {pinned && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              置顶
            </span>
          )}
          {topic.is_highlighted && (
            <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              精华
            </span>
          )}
          <h2 className="text-base font-medium line-clamp-1">{topic.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{topic.author?.nickname || topic.author?.username || "匿名"}</span>
          {topic.tags && topic.tags.length > 0 && (
            <div className="flex gap-1">
              {topic.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-background px-1.5 py-0.5 text-[10px]">#{tag}</span>
              ))}
            </div>
          )}
          <span>{timeAgo(topic.created_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-muted self-center">
        <div className="text-center">
          <div className="font-medium text-foreground">{topic.reply_count}</div>
          <div>回复</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-foreground">{topic.like_count}</div>
          <div>点赞</div>
        </div>
        <div className="text-center hidden sm:block">
          <div className="font-medium text-foreground">{topic.view_count}</div>
          <div>浏览</div>
        </div>
      </div>
    </Link>
  );
}