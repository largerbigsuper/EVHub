import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import { buildJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "EVHub - 两轮电动车专业内容与数据平台",
    template: "%s | EVHub",
  },
  description: "电动车品牌库、车型参数查询、改装方案、专业测评，打造电动车领域的一站式平台",
  keywords: ["电动车", "两轮电动车", "电动摩托车", "车型参数", "改装方案", "测评"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "EVHub",
    title: "EVHub - 两轮电动车专业内容与数据平台",
    description: "电动车品牌库、车型参数查询、改装方案、专业测评",
  },
  twitter: {
    card: "summary_large_image",
    title: "EVHub - 两轮电动车专业内容与数据平台",
    description: "电动车品牌库、车型参数查询、改装方案、专业测评",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const websiteJsonLd = buildJsonLd("WebSite", { name: "EVHub" });
const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <JsonLd data={websiteJsonLd} />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}