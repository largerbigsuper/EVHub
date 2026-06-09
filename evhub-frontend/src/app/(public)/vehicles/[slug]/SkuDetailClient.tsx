"use client";

import { useState } from "react";

export function SkuDetailClient({ slug }: { slug: string }) {
  const [favorited, setFavorited] = useState(false);

  return (
    <div className="flex gap-3">
      <button className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
        咨询经销商
      </button>
      <button
        onClick={() => setFavorited(!favorited)}
        className={`rounded-lg border px-6 py-3 text-sm transition-colors ${
          favorited
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted hover:border-primary hover:text-primary"
        }`}
      >
        {favorited ? "❤ 已收藏" : "♡ 收藏"}
      </button>
    </div>
  );
}