import jsPDF from 'jspdf';
import type { Question } from '@/types';
import { getPublicImageUrl } from '@/lib/supabase/client';

interface ExportOptions {
  groupByChapter: boolean;
  includeAnalysis: boolean;
  onProgress?: (done: number, total: number) => void;
  onStatus?: (msg: string) => void;
}

// 将图片 URL 转为 base64 data URL（解决 iOS Safari 跨域问题）
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // fetch 失败则直接返回原始 URL，让 jsPDF 尝试加载
    return url;
  }
}

// 加载图片并获取尺寸
async function loadImage(src: string): Promise<{ img: HTMLImageElement; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ img, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`));
    img.src = src;
  });
}

// 生成 PDF（iOS Safari 兼容方案：fetch base64 + jsPDF addImage）
export async function generatePdf(questions: Question[], options: ExportOptions): Promise<void> {
  const { groupByChapter, includeAnalysis, onProgress, onStatus } = options;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const marginTop = 14;
  const marginBottom = 14;
  const contentWidth = pageWidth - marginX * 2;
  const maxContentHeight = pageHeight - marginTop - marginBottom;
  let yPos = marginTop;
  let questionIndex = 0;

  // 按章节分组
  const groups = groupByChapter ? groupByChapterFn(questions) : [{ name: '', items: questions }];

  const totalQuestions = questions.length;

  for (const group of groups) {
    // 章节标题
    if (groupByChapter && group.name) {
      const titleHeight = 18;
      if (yPos + titleHeight > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }
      pdf.setFillColor(0xf5, 0xf4, 0xee);
      pdf.rect(marginX, yPos, contentWidth, titleHeight, 'F');
      pdf.setDrawColor(0xb8, 0x47, 0x2f);
      pdf.setLineWidth(0.8);
      pdf.line(marginX, yPos, marginX, yPos + titleHeight);
      pdf.setFontSize(14);
      pdf.setTextColor(0x2b, 0x2a, 0x28);
      pdf.text(group.name, marginX + 5, yPos + 8);
      pdf.setFontSize(9);
      pdf.setTextColor(0x8a, 0x87, 0x80);
      pdf.text(`${group.items.length} 题`, marginX + 5, yPos + 14);
      yPos += titleHeight + 4;
    }

    for (const q of group.items) {
      questionIndex++;
      onStatus?.(`正在生成 PDF（${questionIndex}/${totalQuestions}）`);
      onProgress?.(questionIndex - 1, totalQuestions);

      // 题目标题
      const titleText = `第 ${questionIndex} 题${q.source ? `  ${q.source}` : ''}`;
      if (yPos + 10 > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }
      pdf.setFontSize(11);
      pdf.setTextColor(0x2b, 0x2a, 0x28);
      pdf.text(titleText, marginX, yPos + 4);
      yPos += 8;

      // 题目图片
      const questionImages = q.images?.filter((i) => i.type === 'question') || [];
      for (const imgData of questionImages) {
        const url = getPublicImageUrl(imgData.storage_path);
        yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, maxContentHeight, marginTop, marginBottom);
      }

      // 错因标签
      if (q.error_tags.length > 0) {
        if (yPos + 6 > pageHeight - marginBottom) {
          pdf.addPage();
          yPos = marginTop;
        }
        pdf.setFontSize(8);
        pdf.setTextColor(0x5c, 0x5a, 0x55);
        pdf.text(q.error_tags.join('  '), marginX, yPos + 3);
        yPos += 6;
      }

      // 解析
      if (includeAnalysis) {
        const analysisImages = q.images?.filter((i) => i.type === 'analysis') || [];
        if (analysisImages.length > 0 || q.analysis_supplement) {
          if (yPos + 6 > pageHeight - marginBottom) {
            pdf.addPage();
            yPos = marginTop;
          }
          pdf.setFontSize(9);
          pdf.setTextColor(0x8a, 0x87, 0x80);
          pdf.text('解析：', marginX, yPos + 3);
          yPos += 6;

          for (const imgData of analysisImages) {
            const url = getPublicImageUrl(imgData.storage_path);
            yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, maxContentHeight, marginTop, marginBottom);
          }

          if (q.analysis_supplement) {
            if (yPos + 10 > pageHeight - marginBottom) {
              pdf.addPage();
              yPos = marginTop;
            }
            pdf.setFontSize(9);
            pdf.setTextColor(0x5c, 0x5a, 0x55);
            const lines = pdf.splitTextToSize(q.analysis_supplement, contentWidth);
            for (const line of lines) {
              if (yPos + 4 > pageHeight - marginBottom) {
                pdf.addPage();
                yPos = marginTop;
              }
              pdf.text(line, marginX, yPos + 3);
              yPos += 4;
            }
          }
        }
      }

      // 分隔线
      if (yPos + 4 > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }
      pdf.setDrawColor(0xe2, 0xe0, 0xd8);
      pdf.setLineWidth(0.3);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(marginX, yPos, marginX + contentWidth, yPos);
      pdf.setLineDashPattern([], 0);
      yPos += 6;
    }
  }

  // 下载
  const fileName = `错题本_${formatDateForFile(new Date())}.pdf`;
  pdf.save(fileName);

  onProgress?.(totalQuestions, totalQuestions);
  onStatus?.('');
}

// 将图片添加到 PDF，自动分页
async function addImageToPdf(
  pdf: jsPDF,
  url: string,
  x: number,
  yPos: number,
  contentWidth: number,
  maxContentHeight: number,
  marginTop: number,
  marginBottom: number
): Promise<number> {
  const base64 = await imageUrlToBase64(url);
  const { img, w, h } = await loadImage(base64);

  // 计算缩放后的尺寸
  const ratio = h / w;
  const imgWidth = contentWidth;
  const imgHeight = imgWidth * ratio;
  const pageHeight = maxContentHeight + marginTop + marginBottom;

  // 如果图片高度超过一页，按页拆分
  let remainingHeight = imgHeight;
  let sourceY = 0;

  while (remainingHeight > 0) {
    const availableHeight = pageHeight - marginBottom - yPos;
    const drawHeight = Math.min(remainingHeight, availableHeight);

    if (drawHeight < 5) {
      // 空间太小，换新页
      pdf.addPage();
      yPos = marginTop;
      continue;
    }

    // 计算源图裁剪比例
    const clipRatio = drawHeight / imgHeight;

    // 创建临时 canvas 裁剪
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = Math.round(h * clipRatio);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, sourceY * (h / imgHeight), w, canvas.height, 0, 0, w, canvas.height);
      const sliceData = canvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(sliceData, 'JPEG', x, yPos, imgWidth, drawHeight);
    }

    yPos += drawHeight;
    remainingHeight -= drawHeight;
    sourceY += drawHeight;

    if (remainingHeight > 0.5) {
      pdf.addPage();
      yPos = marginTop;
    }
  }

  return yPos + 2;
}

function groupByChapterFn(questions: Question[]) {
  const map = new Map<string, { name: string; items: Question[] }>();
  for (const q of questions) {
    const key = q.chapter_id;
    if (!map.has(key)) {
      map.set(key, {
        name: `${q.subject?.name || ''} · ${q.chapter?.name || '未分类'}`,
        items: [],
      });
    }
    map.get(key)!.items.push(q);
  }
  return Array.from(map.values());
}

function formatDateForFile(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
