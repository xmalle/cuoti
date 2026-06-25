'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { compressImages } from '@/lib/image/compress';
import { stitchFilesOrUrls } from '@/lib/image/stitch';
import { toast } from '@/store/toast';

interface ImageUploaderProps {
  label: string;
  required?: boolean;
  max?: number;
  files: File[];
  onChange: (files: File[] | ((prev: File[]) => File[])) => void;
  existingUrls?: string[];
  onExistingChange?: (urls: string[]) => void;
}

type StitchDirection = 'vertical' | 'horizontal';
type GapOption = 0 | 4 | 8;

export function ImageUploader({
  label,
  required = false,
  max = 5,
  files,
  onChange,
  existingUrls = [],
  onExistingChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 拼合抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [direction, setDirection] = useState<StitchDirection>('vertical');
  const [gap, setGap] = useState<GapOption>(0);
  const [order, setOrder] = useState<number[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [stitching, setStitching] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    const remaining = max - files.length;
    const toAdd = selected.slice(0, remaining);
    if (toAdd.length === 0) return;

    setCompressing(true);
    try {
      const compressed = await compressImages(toAdd, 1200);
      onChange((prev) => {
        const combined = [...prev, ...compressed];
        return combined.slice(0, max);
      });
      const objectUrls = compressed.map((f) => URL.createObjectURL(f));
      setPreviewUrls((prev) => [...prev, ...objectUrls]);
    } catch (err) {
      console.error(err);
    } finally {
      setCompressing(false);
    }
  };

  const removeFile = (index: number) => {
    onChange((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  type DisplayItem =
    | { kind: 'existing'; index: number; src: string }
    | { kind: 'file'; index: number; src: string };

  const displayItems: DisplayItem[] = useMemo(() => {
    const items: DisplayItem[] = [];
    existingUrls.forEach((url, i) => items.push({ kind: 'existing', index: i, src: url }));
    files.forEach((_, i) => items.push({ kind: 'file', index: i, src: previewUrls[i] }));
    return items;
  }, [existingUrls, files, previewUrls]);

  const total = displayItems.length;

  // 打开拼合抽屉
  const openDrawer = () => {
    setOrder(displayItems.map((_, i) => i));
    setDirection('vertical');
    setGap(0);
    setDrawerOpen(true);
    requestAnimationFrame(() => setDrawerVisible(true));
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setTimeout(() => setDrawerOpen(false), 200);
  };

  // 调整顺序
  const moveItem = (index: number, dir: -1 | 1) => {
    const newOrder = [...order];
    const pos = newOrder.indexOf(index);
    if (pos < 0) return;
    const target = pos + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[pos], newOrder[target]] = [newOrder[target], newOrder[pos]];
    setOrder(newOrder);
  };

  // 实时预览
  const updatePreview = useCallback(async () => {
    if (order.length < 2) { setPreviewDataUrl(''); return; }
    try {
      const orderedItems = order.map((i) => {
        const item = displayItems[i];
        return item.kind === 'existing' ? item.src : files[item.index];
      });
      const result = await stitchFilesOrUrls(orderedItems, direction, gap);
      const url = URL.createObjectURL(result);
      setPreviewDataUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch {
      setPreviewDataUrl('');
    }
  }, [order, direction, gap, displayItems, files]);

  useEffect(() => {
    if (!drawerOpen) return;
    const timer = setTimeout(updatePreview, 100);
    return () => clearTimeout(timer);
  }, [drawerOpen, updatePreview]);

  // 确认拼合
  const handleConfirmStitch = async () => {
    setStitching(true);
    try {
      const orderedItems = order.map((i) => {
        const item = displayItems[i];
        return item.kind === 'existing' ? item.src : files[item.index];
      });
      const result = await stitchFilesOrUrls(orderedItems, direction, gap);
      // 压缩拼合结果
      const compressed = await compressImages([result], 1200);
      // 用拼合后的单张图替换整个列表
      onChange(compressed);
      onExistingChange?.([]);
      setPreviewUrls([URL.createObjectURL(compressed[0])]);
      toast.success('已拼合为 1 张图片');
      closeDrawer();
    } catch {
      toast.error('拼合失败，请重试');
    } finally {
      setStitching(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-ink-soft">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <span className="text-[10px] text-ink-muted">{total}/{max}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {displayItems.map((item, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg overflow-hidden bg-paper relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt="" className="w-full h-full object-cover" />
            {item.kind === 'file' && (
              <button
                onClick={() => removeFile(item.index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink/70 text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            )}
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

      {/* 拼合按钮 */}
      {total >= 2 && (
        <button
          onClick={openDrawer}
          className="mt-2 px-3 py-1.5 rounded-[10px] border text-xs flex items-center gap-1"
          style={{ borderColor: '#DEDACD', color: '#5C7385' }}
        >
          ⬛ 拼合为一张
        </button>
      )}

      {required && total === 0 && (
        <p className="text-[10px] text-danger mt-1">请至少上传一张图片</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
        className="hidden"
      />

      {/* 拼合抽屉 */}
      {drawerOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-[100]"
            style={{ backgroundColor: 'rgba(31,47,61,0.4)' }}
            onClick={closeDrawer}
          />
          {/* 面板 */}
          <div
            className="fixed left-0 right-0 bottom-0 z-[101] rounded-t-2xl overflow-hidden"
            style={{
              backgroundColor: '#FBFAF6',
              maxHeight: '60vh',
              transform: drawerVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 200ms ease',
            }}
          >
            {/* 拖拽指示条 */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm font-semibold text-ink">拼合预览</span>
              <button onClick={closeDrawer} className="text-ink-muted p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 60px)' }}>
              {/* 拼合方向 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDirection('vertical')}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={direction === 'vertical'
                    ? { backgroundColor: '#1F2F3D', color: '#fff' }
                    : { backgroundColor: 'transparent', border: '1px solid #DEDACD', color: '#5C7385' }
                  }
                >
                  ↕ 上下拼合
                </button>
                <button
                  onClick={() => setDirection('horizontal')}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={direction === 'horizontal'
                    ? { backgroundColor: '#1F2F3D', color: '#fff' }
                    : { backgroundColor: 'transparent', border: '1px solid #DEDACD', color: '#5C7385' }
                  }
                >
                  ↔ 左右拼合
                </button>
              </div>

              {/* 图片顺序调整 */}
              <div className="mb-3">
                <span className="text-[10px] text-ink-muted mb-1 block">调整顺序</span>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {order.map((itemIdx, pos) => (
                    <div key={itemIdx} className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveItem(itemIdx, -1)}
                        disabled={pos === 0}
                        className="w-5 h-5 rounded flex items-center justify-center text-ink-muted disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-paper flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={displayItems[itemIdx]?.src} alt="" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => moveItem(itemIdx, 1)}
                        disabled={pos === order.length - 1}
                        className="w-5 h-5 rounded flex items-center justify-center text-ink-muted disabled:opacity-30"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 间距选项 */}
              <div className="mb-3">
                <span className="text-[10px] text-ink-muted mb-1 block">拼合间距</span>
                <div className="flex gap-2">
                  {([0, 4, 8] as GapOption[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGap(g)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={gap === g
                        ? { backgroundColor: '#1F2F3D', color: '#fff' }
                        : { backgroundColor: 'transparent', border: '1px solid #DEDACD', color: '#5C7385' }
                      }
                    >
                      {g === 0 ? '无间距' : `白色间距 ${g}px`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 实时预览 */}
              <div
                className="rounded-[10px] p-2 mb-3 overflow-auto"
                style={{ backgroundColor: '#EFEEE7', maxHeight: 200 }}
              >
                {previewDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewDataUrl}
                    alt="拼合预览"
                    className="w-full h-auto"
                    style={{ maxHeight: 184, objectFit: 'contain' }}
                  />
                ) : (
                  <div className="h-20 flex items-center justify-center text-xs text-ink-muted">
                    预览生成中...
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={closeDrawer}
                  className="flex-1 py-2.5 rounded-lg border border-line text-ink-soft text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmStitch}
                  disabled={stitching}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#1F2F3D' }}
                >
                  {stitching ? '拼合中...' : '确认拼合'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
