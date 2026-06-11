"use client";

import { useRouter } from "next/navigation";

interface TagLinksProps {
  tags: string[];
}

export function TagLinks({ tags }: TagLinksProps) {
  const router = useRouter();

  return (
    <>
      {tags.map((t) => (
        <button
          key={t}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/articles?tag=${encodeURIComponent(t)}`);
          }}
          className="rounded border border-border px-1.5 py-0.5 hover:border-primary hover:text-primary text-xs cursor-pointer"
        >
          {t}
        </button>
      ))}
    </>
  );
}