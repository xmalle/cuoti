import jsPDF from 'jspdf';
import type { Question } from '@/types';
import { getPublicImageUrl } from '@/lib/supabase/client';
import { stitchImageUrls } from '@/lib/image/stitch';

interface ExportOptions {
  groupByChapter: boolean;
  includeAnalysis: boolean;
  onProgress?: (done: number, total: number) => void;
  onStatus?: (msg: string) => void;
}

// 中文字体栈（覆盖主流平台）
const FONT_STACK = 'system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

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

// 将文本渲染到 Canvas 并返回逐行 data URL（解决 jsPDF 中文乱码）
function renderTextLines(
  text: string,
  fontSizePt: number,
  color: [number, number, number],
  maxWidthMm: number,
  fontWeight: 'normal' | 'bold' = 'normal'
): { dataUrl: string; heightMm: number }[] {
  const SCALE = 3; // 渲染倍率，提高清晰度
  const PX_PER_MM = 96 / 25.4;
  const PT_TO_MM = 25.4 / 72;

  const fontSizeMm = fontSizePt * PT_TO_MM;
  const pxFont = fontSizeMm * PX_PER_MM * SCALE;
  const pxMaxWidth = Math.ceil(maxWidthMm * PX_PER_MM * SCALE);

  // 测量文本换行
  const mCanvas = document.createElement('canvas');
  const mCtx = mCanvas.getContext('2d')!;
  mCtx.font = `${fontWeight} ${pxFont}px ${FONT_STACK}`;

  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (mCtx.measureText(test).width > pxMaxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (!lines.length) return [];

  const lineHPx = pxFont * 1.5;
  const lineHMm = lineHPx / (SCALE * PX_PER_MM);

  // 逐行渲染到 Canvas
  return lines.map((line) => {
    const canvas = document.createElement('canvas');
    canvas.width = pxMaxWidth;
    canvas.height = Math.ceil(lineHPx);
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontWeight} ${pxFont}px ${FONT_STACK}`;
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.textBaseline = 'top';
    ctx.fillText(line, 0, lineHPx * 0.15);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      heightMm: lineHMm,
    };
  });
}

// 将单行文本渲染为图片添加到 PDF，返回占用高度
function addTextImage(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSizePt: number,
  color: [number, number, number],
  maxWidthMm: number,
  fontWeight: 'normal' | 'bold' = 'normal'
): number {
  const rendered = renderTextLines(text, fontSizePt, color, maxWidthMm, fontWeight);
  if (rendered.length === 0) return 0;
  const { dataUrl, heightMm } = rendered[0];
  if (dataUrl) {
    pdf.addImage(dataUrl, 'PNG', x, y, maxWidthMm, heightMm);
  }
  return heightMm;
}

// 生成 PDF（中文 Canvas 渲染 + 图片 addImage 方案）v20250624
export async function generatePdf(questions: Question[], options: ExportOptions): Promise<void> {
  const { groupByChapter, includeAnalysis, onProgress, onStatus } = options;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const marginTop = 14;
  const marginBottom = 14;
  const contentWidth = pageWidth - marginX * 2;
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
      // 背景色块
      pdf.setFillColor(0xf5, 0xf4, 0xee);
      pdf.rect(marginX, yPos, contentWidth, titleHeight, 'F');
      // 左侧色条
      pdf.setDrawColor(0xb8, 0x47, 0x2f);
      pdf.setLineWidth(0.8);
      pdf.line(marginX, yPos, marginX, yPos + titleHeight);
      // 章节名（Canvas 渲染中文）
      addTextImage(pdf, group.name, marginX + 5, yPos + 2, 14, [0x2b, 0x2a, 0x28], contentWidth - 5, 'bold');
      // 题数
      addTextImage(pdf, `${group.items.length} 题`, marginX + 5, yPos + 11, 9, [0x8a, 0x87, 0x80], contentWidth - 5);
      yPos += titleHeight + 4;
    }

    for (const q of group.items) {
      questionIndex++;
      onStatus?.(`正在生成 PDF（${questionIndex}/${totalQuestions}）`);
      onProgress?.(questionIndex - 1, totalQuestions);

      // 题目标题 + 星级
      const titleText = `第 ${questionIndex} 题${q.source ? `  ${q.source}` : ''}`;
      if (yPos + 10 > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }
      const titleH = addTextImage(pdf, titleText, marginX, yPos, 11, [0x2b, 0x2a, 0x28], contentWidth, 'bold');
      // 星级
      const stars = '★'.repeat(q.difficulty) + '☆'.repeat(5 - q.difficulty);
      const subjectColor = q.subject?.color || '#B8472F';
      const r = parseInt(subjectColor.slice(1, 3), 16);
      const g = parseInt(subjectColor.slice(3, 5), 16);
      const b = parseInt(subjectColor.slice(5, 7), 16);
      addTextImage(pdf, stars, marginX, yPos + Math.max(titleH, 5), 10, [r, g, b], contentWidth);
      yPos += Math.max(titleH, 5) + 6;

      // 题目图片（≥2 张时自动上下拼合）
      const questionImages = q.images?.filter((i) => i.type === 'question') || [];
      if (questionImages.length >= 2) {
        onStatus?.(`正在处理第 ${questionIndex} 题图片（共 ${totalQuestions} 题）…`);
        const urls = questionImages.map((img) => getPublicImageUrl(img.storage_path));
        try {
          const stitchedBase64 = await stitchImageUrls(urls, 'vertical', 0);
          yPos = await addImageToPdf(pdf, stitchedBase64, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
        } catch {
          // 拼合失败则逐张写入
          for (const imgData of questionImages) {
            const url = getPublicImageUrl(imgData.storage_path);
            yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
          }
        }
        onStatus?.(`正在生成 PDF（${questionIndex}/${totalQuestions}）`);
      } else {
        for (const imgData of questionImages) {
          const url = getPublicImageUrl(imgData.storage_path);
          yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
        }
      }

      // 错因标签
      if (q.error_tags.length > 0) {
        if (yPos + 6 > pageHeight - marginBottom) {
          pdf.addPage();
          yPos = marginTop;
        }
        const tagH = addTextImage(pdf, q.error_tags.join('  '), marginX, yPos, 8, [0x5c, 0x5a, 0x55], contentWidth);
        yPos += Math.max(tagH, 4) + 2;
      }

      // 解析
      if (includeAnalysis) {
        const analysisImages = q.images?.filter((i) => i.type === 'analysis') || [];
        if (analysisImages.length > 0 || q.analysis_supplement) {
          if (yPos + 6 > pageHeight - marginBottom) {
            pdf.addPage();
            yPos = marginTop;
          }
          const labelH = addTextImage(pdf, '解析：', marginX, yPos, 9, [0x8a, 0x87, 0x80], contentWidth);
          yPos += Math.max(labelH, 4) + 2;

          // 解析图片（≥2 张时自动上下拼合）
          if (analysisImages.length >= 2) {
            const urls = analysisImages.map((img) => getPublicImageUrl(img.storage_path));
            try {
              const stitchedBase64 = await stitchImageUrls(urls, 'vertical', 0);
              yPos = await addImageToPdf(pdf, stitchedBase64, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
            } catch {
              for (const imgData of analysisImages) {
                const url = getPublicImageUrl(imgData.storage_path);
                yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
              }
            }
          } else {
            for (const imgData of analysisImages) {
              const url = getPublicImageUrl(imgData.storage_path);
              yPos = await addImageToPdf(pdf, url, marginX, yPos, contentWidth, pageHeight, marginTop, marginBottom);
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
  pageHeight: number,
  marginTop: number,
  marginBottom: number
): Promise<number> {
  const base64 = await imageUrlToBase64(url);
  const { img, w, h } = await loadImage(base64);

  // 计算缩放后的尺寸
  const ratio = h / w;
  const imgWidth = contentWidth;
  const imgHeight = imgWidth * ratio;

  // 如果图片高度超过一页，按页拆分
  let remainingHeight = imgHeight;
  let sourceY = 0;

  while (remainingHeight > 0) {
    const availableHeight = pageHeight - marginBottom - yPos;
    const drawHeight = Math.min(remainingHeight, availableHeight);

    if (drawHeight < 5) {
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
