import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { ArticleToc, ShareButton } from "../ArticleClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ArticleDetailData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; username: string; nickname: string; avatar: string | null } | null;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[`*_~\[\]()]/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fff-]/g, "");
    items.push({ id, text, level });
  }
  return items;
}

function estimateReadingTime(text: string): number {
  const charCount = text.replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(charCount / 300));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/articles/${slug}`);
    const json = await res.json();
    const article: ArticleDetailData | null = json.data;
    if (!article) return { title: "文章未找到 - EVHub" };
    return {
      title: article.meta_title || `${article.title} - EVHub`,
      description: article.meta_description || article.excerpt || `${article.title}，阅读最新电动车资讯。`,
      openGraph: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt || "",
        images: article.og_image_url || article.cover_image ? [{ url: article.og_image_url || article.cover_image! }] : [],
        type: "article",
        publishedTime: article.published_at || undefined,
      },
    };
  } catch {
    return { title: "文章 - EVHub" };
  }
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  let article: ArticleDetailData | null = null;

  try {
    const res = await fetch(`${API_BASE}/articles/${slug}`, { next: { revalidate: 300 } });
    const json = await res.json();
    article = json.data;
  } catch {
  }

  if (!article) notFound();

  const toc = extractToc(article.content);
  const readingTime = estimateReadingTime(article.content);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || article.excerpt || "",
    image: article.og_image_url || article.cover_image || undefined,
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: article.author
      ? {
          "@type": "Person",
          name: article.author.nickname || article.author.username,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
      />

      <article className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/articles" className="mb-6 inline-block text-sm text-primary hover:underline">
          ← 返回文章列表
        </Link>

        {/* Header */}
        <header className="mb-8">
          {article.category && (
            <Link
              href={`/articles?category=${article.category.slug}`}
              className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20"
            >
              {article.category.name}
            </Link>
          )}
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            {article.author && (
              <span className="flex items-center gap-2">
                {article.author.avatar ? (
                  <img src={article.author.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                    {(article.author.nickname || article.author.username).charAt(0)}
                  </span>
                )}
                {article.author.nickname || article.author.username}
              </span>
            )}
            {article.published_at && (
              <span>{new Date(article.published_at).toLocaleDateString("zh-CN", {
                year: "numeric", month: "long", day: "numeric",
              })}</span>
            )}
            <span>约 {readingTime} 分钟阅读</span>
            <span>{article.view_count} 次阅读</span>
            <ShareButton slug={article.slug} title={article.title} />
          </div>
        </header>

        {/* Cover Image */}
        {article.cover_image && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_200px]">
          {/* Content */}
          <div className="min-w-0">
            <div className="prose prose-slate max-w-none dark:prose-invert
              prose-headings:scroll-mt-20
              prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2
              prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl prose-h3:font-semibold
              prose-p:leading-relaxed prose-p:my-4
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:my-6
              prose-code:before:content-none prose-code:after:content-none
              prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:rounded-xl prose-pre:border prose-pre:border-border
              prose-blockquote:border-l-primary prose-blockquote:bg-surface/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-ul:my-4 prose-li:my-1
              prose-table:rounded-lg prose-table:overflow-hidden
              prose-th:bg-surface prose-th:px-4 prose-th:py-2 prose-th:text-sm
              prose-td:px-4 prose-td:py-2 prose-td:text-sm
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug, rehypeHighlight]}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
                {article.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/articles?tag=${t}`}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ArticleToc toc={toc} />
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}