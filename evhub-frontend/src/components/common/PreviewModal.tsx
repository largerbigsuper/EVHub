"use client";

import { useEffect } from "react";

interface ArticlePreviewData {
  title: string;
  content: string;
  excerpt: string;
  cover_image: string;
  tags: string[];
}

interface BrandPreviewData {
  name: string;
  logo: string;
  country: string;
  founded_year: string;
  website: string;
  description: string;
}

interface SeriesPreviewData {
  name: string;
  cover_image: string;
  description: string;
}

interface SkuPreviewData {
  name: string;
  cover_image: string;
  year: string;
  price_min: string;
  price_max: string;
  battery_type: string;
  range_km: string;
  motor_power_w: string;
  top_speed_kmh: string;
  weight_kg: string;
  colors: string;
  tags: string;
}

type PreviewData = ArticlePreviewData | BrandPreviewData | SeriesPreviewData | SkuPreviewData;

interface PreviewModalProps {
  type: "article" | "brand" | "series" | "sku";
  data: PreviewData;
  open: boolean;
  onClose: () => void;
}

export default function PreviewModal({ type, data, open, onClose }: PreviewModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">预览</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6">
          {type === "article" && <ArticlePreview data={data as ArticlePreviewData} />}
          {type === "brand" && <BrandPreview data={data as BrandPreviewData} />}
          {type === "series" && <SeriesPreview data={data as SeriesPreviewData} />}
          {type === "sku" && <SkuPreview data={data as SkuPreviewData} />}
        </div>
      </div>
    </div>
  );
}

function ArticlePreview({ data }: { data: ArticlePreviewData }) {
  return (
    <article className="mx-auto max-w-none">
      {data.cover_image && (
        <div className="mb-6 overflow-hidden rounded-xl">
          <img src={data.cover_image} alt="" className="w-full max-h-72 object-cover" />
        </div>
      )}
      <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900">{data.title || "未命名文章"}</h1>
      {data.excerpt && (
        <p className="mb-6 text-base leading-relaxed text-gray-500">{data.excerpt}</p>
      )}
      <div
        className="prose prose-slate max-w-none
          prose-headings:scroll-mt-20
          prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-2xl prose-h2:font-bold prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
          prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-xl prose-h3:font-semibold
          prose-p:leading-relaxed prose-p:my-4
          prose-img:rounded-xl prose-img:my-6
          prose-blockquote:border-l-indigo-500 prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          prose-ul:my-4 prose-li:my-1
          prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200
          prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-code:before:content-none prose-code:after:content-none
        "
        dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(data.content || "") }}
      />
      {data.tags && data.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-gray-200 pt-6">
          {data.tags.map((t) => (
            <span key={t} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function BrandPreview({ data }: { data: BrandPreviewData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-8">
      <div className="mb-6 flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white shadow-sm">
          {data.logo ? (
            <img src={data.logo} alt="" className="h-16 w-16 object-contain" />
          ) : (
            <span className="text-3xl font-bold text-gray-300">{data.name?.charAt(0) || "?"}</span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.name || "未命名品牌"}</h2>
          {data.country && <p className="text-sm text-gray-500">{data.country}{data.founded_year ? ` · 成立于 ${data.founded_year}` : ""}</p>}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener" className="text-sm text-indigo-600 hover:underline">{data.website}</a>
          )}
        </div>
      </div>
      {data.description && (
        <p className="text-sm leading-relaxed text-gray-600">{data.description}</p>
      )}
    </div>
  );
}

function SeriesPreview({ data }: { data: SeriesPreviewData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="aspect-[2/1] bg-gray-100 flex items-center justify-center">
        {data.cover_image ? (
          <img src={data.cover_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-300 text-sm">暂无封面</span>
        )}
      </div>
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{data.name || "未命名车系"}</h2>
        {data.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{data.description}</p>
        )}
      </div>
    </div>
  );
}

function SkuPreview({ data }: { data: SkuPreviewData }) {
  const specs = [
    { label: "年份", value: data.year },
    { label: "价格", value: [data.price_min, data.price_max].filter(Boolean).join(" - ") + (data.price_min || data.price_max ? " ¥" : "") },
    { label: "电池类型", value: data.battery_type },
    { label: "续航", value: data.range_km ? `${data.range_km} km` : "" },
    { label: "电机功率", value: data.motor_power_w ? `${data.motor_power_w} W` : "" },
    { label: "最高速度", value: data.top_speed_kmh ? `${data.top_speed_kmh} km/h` : "" },
    { label: "重量", value: data.weight_kg ? `${data.weight_kg} kg` : "" },
  ].filter((s) => s.value);

  const colorList = data.colors ? data.colors.split(",").map((c) => c.trim()).filter(Boolean) : [];
  const tagList = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="aspect-[2/1] bg-gray-100 flex items-center justify-center">
        {data.cover_image ? (
          <img src={data.cover_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-300 text-sm">暂无封面</span>
        )}
      </div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{data.name || "未命名车型"}</h2>
        {specs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {specs.map((s) => (
              <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-400">{s.label}</span>
                <p className="text-sm font-medium text-gray-700">{s.value || "-"}</p>
              </div>
            ))}
          </div>
        )}
        {colorList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {colorList.map((c) => (
              <span key={c} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{c}</span>
            ))}
          </div>
        )}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((t) => (
              <span key={t} className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-600">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function simpleMarkdownToHtml(md: string): string {
  if (!md) return "";
  return md
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^#{1,6}\s/.test(trimmed)) {
        const level = (trimmed.match(/^#+/) as RegExpMatchArray)[0].length;
        const text = trimmed.replace(/^#+\s*/, "");
        const sizes = ["", "text-3xl font-bold", "text-2xl font-bold", "text-xl font-semibold", "text-lg font-semibold", "text-base font-semibold", "text-sm font-semibold"];
        const mt = level <= 2 ? "mt-8 mb-4" : "mt-6 mb-3";
        const borderBottom = level <= 2 ? " border-b border-gray-200 pb-2" : "";
        return `<h${level} class="${sizes[level]} ${mt}${borderBottom}">${text}</h${level}>`;
      }
      if (/^[-*]\s/.test(trimmed) && block.split("\n").every((l) => /^[-*]\s/.test(l.trim()))) {
        const items = block.split("\n").map((l) => `<li class="my-1">${l.replace(/^[-*]\s/, "")}</li>`).join("");
        return `<ul class="list-disc pl-6 my-4 space-y-1">${items}</ul>`;
      }
      if (/^\d+\.\s/.test(trimmed) && block.split("\n").every((l) => /^\d+\.\s/.test(l.trim()))) {
        const items = block.split("\n").map((l) => `<li class="my-1">${l.replace(/^\d+\.\s/, "")}</li>`).join("");
        return `<ol class="list-decimal pl-6 my-4 space-y-1">${items}</ol>`;
      }
      if (/^>\s/.test(trimmed)) {
        const content = trimmed.replace(/^>\s?/, "");
        return `<blockquote class="border-l-4 border-indigo-500 bg-gray-50 py-2 px-4 rounded-r-lg my-4 text-gray-600">${content}</blockquote>`;
      }
      if (/^```/.test(trimmed)) {
        const code = trimmed.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
        return `<pre class="rounded-xl border border-gray-200 bg-gray-900 text-gray-100 p-4 my-4 overflow-x-auto"><code>${escapeHtml(code)}</code></pre>`;
      }
      const processed = trimmed
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code class=\"bg-gray-100 px-1.5 py-0.5 rounded text-sm\">$1</code>")
        .replace(/\[(.+?)\]\((.+?)\)/g, "<a href=\"$2\" class=\"text-indigo-600 hover:underline\" target=\"_blank\">$1</a>")
        .replace(/!\[(.*?)\]\((.+?)\)/g, "<img src=\"$2\" alt=\"$1\" class=\"rounded-xl my-6 max-w-full\" />");
      return `<p class="leading-relaxed my-4">${processed}</p>`;
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}