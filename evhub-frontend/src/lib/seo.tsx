import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function buildMetadata({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article" | "product";
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${BASE_URL}${image}`
    : `${BASE_URL}/og-default.png`;

  const ogType = type === "product" ? "website" : type;

  return {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: "EVHub",
      locale: "zh_CN",
      type: ogType,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    other: {
      "baidu-site-verification": process.env.NEXT_PUBLIC_BAIDU_VERIFY || "",
    },
  };
}

export function buildJsonLd(type: string, data: Record<string, unknown>) {
  let ld: Record<string, unknown>;

  switch (type) {
    case "WebSite":
      ld = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: data.name || "EVHub",
        url: BASE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      };
      break;

    case "Article":
      ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.title,
        description: data.description,
        datePublished: data.datePublished,
        dateModified: data.dateModified,
        author: {
          "@type": "Person",
          name: data.author,
        },
      };
      break;

    case "Product":
      ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: data.name,
        description: data.description,
        brand: data.brand
          ? { "@type": "Brand", name: data.brand }
          : undefined,
      };
      break;

    case "HowTo":
      ld = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: data.name,
        description: data.description,
      };
      break;

    case "BreadcrumbList":
      ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: (data.items as Array<{ name: string; url: string }>).map(
          (item, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: item.name,
            item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
          })
        ),
      };
      break;

    default:
      ld = { "@context": "https://schema.org", ...data };
  }

  return ld;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}