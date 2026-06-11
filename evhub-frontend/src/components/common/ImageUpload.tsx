"use client";

import { useState, useRef, useCallback } from "react";
import apiClient from "@/lib/api";
import type { BaseResponse } from "@/types/api";

interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function ImageUpload({ value, onChange, folder = "images" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const { data } = await apiClient.post<BaseResponse<UploadResult>>(
          "/upload/image",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const url = data.data?.url || "";
        setPreviewUrl(url);
        onChange(url);
      } catch {
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const displayUrl = previewUrl || value;

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative group">
          <img
            src={displayUrl}
            alt="提示"
            className="w-full max-h-48 rounded-lg border border-border object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded bg-white/90 px-3 py-1 text-xs text-black hover:bg-white"
            >
              更换
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded bg-white/90 px-3 py-1 text-xs text-danger hover:bg-white"
            >
              移除
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={"flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors " +
            (dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-background") +
            (uploading ? " pointer-events-none opacity-50" : "")}
        >
          {uploading ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="mt-2 text-xs text-muted">上传中...</span>
            </>
          ) : (
            <>
              <svg className="mb-2 h-8 w-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-muted">点击或拖拽图片到此处</span>
              <span className="mt-1 text-xs text-muted/60">支持 JPG、PNG、GIF、WebP，找到 10MB</span>
            </>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {displayUrl && (
        <input
          type="text"
          value={displayUrl}
          readOnly
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-muted font-mono"
        />
      )}
    </div>
  );
}
