'use client';

import { useRef, useState } from 'react';
import { Plus, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { compressImages } from '@/lib/image/compress';

interface ImageUploaderProps {
  label: string;
  required?: boolean;
  max?: number;
  files: File[];
  onChange: (files: File[]) => void;
  existingUrls?: string[];
}

export function ImageUploader({
  label,
  required = false,
  max = 5,
  files,
  onChange,
  existingUrls = [],
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 生成本地预览
  const generatePreviews = (newFiles: File[]) => {
    const existing = [...previewUrls];
    for (const f of newFiles) {
      existing.push(URL.createObjectURL(f));
    }
    setPreviewUrls(existing);
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const remaining = max - files.length;
    const toAdd = selected.slice(0, remaining);
    if (toAdd.length === 0) return;

    setCompressing(true);
    try {
      const compressed = await compressImages(toAdd, 1200);
      const newFiles = [...files, ...compressed];
      onChange(newFiles);
      generatePreviews(compressed);
    } catch (err) {
      console.error(err);
    } finally {
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    onChange(newFiles);
    setPreviewUrls(newPreviews);
  };

  const total = existingUrls.length + files.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-ink-soft">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <span className="text-[10px] text-ink-muted">{total}/{max}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* 已有图片（编辑模式） */}
        {existingUrls.map((url, i) => (
          <div
            key={`existing-${i}`}
            className="aspect-square rounded-lg overflow-hidden bg-paper relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}

        {/* 新选图片预览 */}
        {files.map((file, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg overflow-hidden bg-paper relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrls[i]} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeFile(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink/70 text-white flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* 添加按钮 */}
        {total < max && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-muted',
              compressing && 'opacity-50'
            )}
          >
            {compressing ? (
              <span className="text-[10px]">压缩中</span>
            ) : (
              <>
                <Plus size={20} />
                <span className="text-[10px] mt-0.5">添加</span>
              </>
            )}
          </button>
        )}
      </div>

      {required && files.length === 0 && existingUrls.length === 0 && (
        <p className="text-[10px] text-danger mt-1">请至少上传一张图片</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
      />
    </div>
  );
}
