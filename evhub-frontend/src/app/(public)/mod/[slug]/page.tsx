import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ModPartData {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  purchase_url: string | null;
  is_legal: boolean;
  quantity: number;
  notes: string | null;
}

interface ModBuildDetailData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  is_legal: boolean;
  legal_note: string | null;
  status: string;
  difficulty: string | null;
  total_cost: number | null;
  tags: string[] | null;
  parts: ModPartData[];
  view_count: number;
  published_at: string | null;
  created_at: string;
  author: { id: string; username: string; nickname: string; avatar: string | null } | null;
  vehicle_sku: {
    id: string;
    name: string;
    series_name: string | null;
    brand_name: string | null;
  } | null;
}

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/mod/builds/${slug}`);
    const json = await res.json();
    const build: ModBuildDetailData | null = json.data;
    if (!build) return { title: "方案未找到 - EVHub" };
    return {
      title: `${build.title} - EVHub 改装方案`,
      description: build.description || `${build.title}，电动车改装方案，${build.total_cost ? `总费用约¥${build.total_cost}` : ""}`,
      openGraph: {
        title: build.title,
        description: build.description || "",
        images: build.cover_image ? [{ url: build.cover_image }] : [],
        type: "article",
      },
    };
  } catch {
    return { title: "改装方案 - EVHub" };
  }
}

export default async function ModDetailPage({ params }: Props) {
  const { slug } = await params;
  let build: ModBuildDetailData | null = null;

  try {
    const res = await fetch(`${API_BASE}/mod/builds/${slug}`, { next: { revalidate: 300 } });
    const json = await res.json();
    build = json.data;
  } catch {
  }

  if (!build) notFound();

  // JSON-LD HowTo Schema
  const totalCost = build.total_cost || build.parts.reduce((sum, p) => sum + (p.price || 0) * p.quantity, 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: build.title,
    description: build.description || "",
    image: build.cover_image || undefined,
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "CNY",
      value: String(totalCost),
    },
    supply: build.parts.map((p) => ({
      "@type": "HowToSupply",
      name: p.name,
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    })),
    tool: [],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "改装步骤",
        text: build.content.slice(0, 500),
      },
    ],
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
        <Link href="/mod" className="mb-6 inline-block text-sm text-primary hover:underline">
          ← 返回方案列表
        </Link>

        {/* Compliance Section */}
        {build.is_legal ? (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            <span className="text-base">✅</span>
            <span>
              <strong>合规方案</strong> — 此改装方案符合相关法规要求
              {build.legal_note && <span className="block mt-0.5 opacity-80">说明：{build.legal_note}</span>}
            </span>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-base">⚠️</span>
              <div className="text-sm text-danger">
                <strong className="font-medium">非合规方案</strong> — 此改装方案可能不符合部分地区的法规要求，请自行判断并了解当地规定
                {build.legal_note && <p className="mt-1 opacity-80">说明：{build.legal_note}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {build.difficulty && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                {DIFFICULTY_MAP[build.difficulty] || build.difficulty}
              </span>
            )}
            {build.vehicle_sku && (
              <Link
                href={`/vehicles/${build.vehicle_sku.id}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
              >
                {build.vehicle_sku.brand_name} {build.vehicle_sku.series_name} {build.vehicle_sku.name}
              </Link>
            )}
            {build.tags?.map((t) => (
              <Link
                key={t}
                href={`/mod?tag=${t}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {build.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            {build.author && (
              <span className="flex items-center gap-2">
                {build.author.avatar ? (
                  <img src={build.author.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                    {(build.author.nickname || build.author.username).charAt(0)}
                  </span>
                )}
                {build.author.nickname || build.author.username}
              </span>
            )}
            {build.published_at && (
              <span>
                {new Date(build.published_at).toLocaleDateString("zh-CN", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            )}
            <span>{build.view_count} 次浏览</span>
            <Link
              href="/mod/new"
              className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
            >
              发布我的方案
            </Link>
          </div>
        </header>

        {/* Cover Image */}
        {build.cover_image && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={build.cover_image}
              alt={build.title}
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {build.total_cost != null ? `¥${build.total_cost.toLocaleString()}` : "-"}
            </div>
            <div className="text-xs text-muted">总费用</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{build.parts.length}</div>
            <div className="text-xs text-muted">配件数量</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {build.difficulty ? DIFFICULTY_MAP[build.difficulty] || build.difficulty : "-"}
            </div>
            <div className="text-xs text-muted">改装难度</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{build.view_count}</div>
            <div className="text-xs text-muted">浏览</div>
          </div>
        </div>

        {/* Parts List */}
        {build.parts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold">配件清单</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">配件名称</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">品牌</th>
                    <th className="px-4 py-3 text-right font-medium">单价</th>
                    <th className="px-4 py-3 text-center font-medium">数量</th>
                    <th className="px-4 py-3 text-right font-medium">小计</th>
                    <th className="px-4 py-3 text-center font-medium">购买</th>
                  </tr>
                </thead>
                <tbody>
                  {build.parts.map((p) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${
                      !p.is_legal ? "bg-danger/[0.03]" : ""
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!p.is_legal && (
                            <span className="inline-flex items-center rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                              非合规
                            </span>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                        {p.notes && (
                          <p className="mt-0.5 text-xs text-muted">{p.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted hidden sm:table-cell">{p.brand || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {p.price != null ? `¥${p.price.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {p.price != null ? `¥${(p.price * p.quantity).toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.purchase_url ? (
                          <a
                            href={p.purchase_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                          >
                            购买
                          </a>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-background">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-medium">合计</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      ¥{totalCost.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Description */}
        {build.description && (
          <div className="mb-8 rounded-xl border border-border bg-surface p-4">
            <p className="leading-relaxed text-sm">{build.description}</p>
          </div>
        )}

        {/* Content */}
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
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug, rehypeHighlight]}
          >
            {build.content}
          </ReactMarkdown>
        </div>

        {/* Tags */}
        {build.tags && build.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {build.tags.map((t) => (
              <Link
                key={t}
                href={`/mod?tag=${t}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </article>
    </>
  );
}