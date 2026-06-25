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

const pageWidth = 210;
const pageHeight = 297;
const marginX = 12;
const marginTop = 14;
const marginBottom = 14;
const contentWidth = pageWidth - marginX * 2;
const colGap = 10;
const colWidth = (contentWidth - colGap) / 2;
const questionGap = 30; // 题目之间留白，方便手写

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
  const SCALE = 3;
  const PX_PER_MM = 96 / 25.4;
  const PT_TO_MM = 25.4 / 72;

  const fontSizeMm = fontSizePt * PT_TO_MM;
  const pxFont = fontSizeMm * PX_PER_MM * SCALE;
  const pxMaxWidth = Math.ceil(maxWidthMm * PX_PER_MM * SCALE);

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

// 生成 PDF（上下布局：一页尽量放两题）
export async function generatePdf(questions: Question[], options: ExportOptions): Promise<void> {
  const { groupByChapter, onProgress, onStatus } = options;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let questionIndex = 0;

  const groups = groupByChapter ? groupByChapterFn(questions) : [{ name: '', items: questions }];
  const totalQuestions = questions.length;

  for (const group of groups) {
    // 章节标题独占一行
    if (groupByChapter && group.name) {
      await renderChapterTitle(pdf, group.name, group.items.length);
    }

    let yPos = marginTop;

    for (const q of group.items) {
      questionIndex++;
      onStatus?.(`正在生成 PDF（${questionIndex}/${totalQuestions}）`);
      onProgress?.(questionIndex - 1, totalQuestions);

      // 每道题固定预留约半页高度，放不下则换页
      if (yPos > marginTop && yPos + 120 > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }

      const endY = await renderQuestion(pdf, q, questionIndex, marginX, yPos, contentWidth);
      yPos = endY + questionGap;
    }
  }

  const fileName = `错题本_${formatDateForFile(new Date())}.pdf`;
  pdf.save(fileName);

  onProgress?.(totalQuestions, totalQuestions);
  onStatus?.('');
}

// 渲染章节标题
async function renderChapterTitle(pdf: jsPDF, name: string, count: number) {
  let yPos = marginTop;
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
  addTextImage(pdf, name, marginX + 5, yPos + 2, 14, [0x2b, 0x2a, 0x28], contentWidth - 5, 'bold');
  addTextImage(pdf, `${count} 题`, marginX + 5, yPos + 11, 9, [0x8a, 0x87, 0x80], contentWidth - 5);
}

// 渲染单道题目，返回结束 y 坐标
async function renderQuestion(
  pdf: jsPDF,
  q: Question,
  index: number,
  x: number,
  y: number,
  width: number
): Promise<number> {
  let yPos = y;

  // 标题
  if (yPos + 10 > pageHeight - marginBottom) {
    pdf.addPage();
    yPos = marginTop;
  }
  const titleText = `第 ${index} 题${q.source ? `  ${q.source}` : ''}`;
  const titleH = addTextImage(pdf, titleText, x, yPos, 10, [0x2b, 0x2a, 0x28], width, 'bold');
  yPos += Math.max(titleH, 4) + 2;

  // 星级
  const stars = '★'.repeat(q.difficulty) + '☆'.repeat(5 - q.difficulty);
  const subjectColor = q.subject?.color || '#B8472F';
  const r = parseInt(subjectColor.slice(1, 3), 16);
  const g = parseInt(subjectColor.slice(3, 5), 16);
  const b = parseInt(subjectColor.slice(5, 7), 16);
  const starH = addTextImage(pdf, stars, x, yPos, 9, [r, g, b], width);
  yPos += Math.max(starH, 3) + 3;

  // 题目图片（≥2 张时自动上下拼合）
  const maxImageHeight = pageHeight / 2 - 45; // 单张图片最大高度，留出足够空白
  const questionImages = q.images?.filter((i) => i.type === 'question') || [];
  if (questionImages.length >= 2) {
    const urls = questionImages.map((img) => getPublicImageUrl(img.storage_path));
    try {
      const stitchedBase64 = await stitchImageUrls(urls, 'vertical', 0);
      yPos = await addImageToPdf(pdf, stitchedBase64, x, yPos, width, maxImageHeight);
    } catch {
      for (const imgData of questionImages) {
        const url = getPublicImageUrl(imgData.storage_path);
        yPos = await addImageToPdf(pdf, url, x, yPos, width, maxImageHeight);
      }
    }
  } else {
    for (const imgData of questionImages) {
      const url = getPublicImageUrl(imgData.storage_path);
      yPos = await addImageToPdf(pdf, url, x, yPos, width, maxImageHeight);
    }
  }

  // 错因标签
  if (q.error_tags.length > 0) {
    if (yPos + 6 > pageHeight - marginBottom) {
      pdf.addPage();
      yPos = marginTop;
    }
    const tagH = addTextImage(pdf, q.error_tags.join('  '), x, yPos, 7, [0x5c, 0x5a, 0x55], width);
    yPos += Math.max(tagH, 3) + 2;
  }

  return yPos;
}

// 将图片添加到 PDF，自动分页
async function addImageToPdf(
  pdf: jsPDF,
  url: string,
  x: number,
  yPos: number,
  imgWidth: number,
  maxHeight: number = Infinity
): Promise<number> {
  const base64 = await imageUrlToBase64(url);
  const { img, w, h } = await loadImage(base64);

  const ratio = h / w;
  let imgHeight = imgWidth * ratio;

  // 如果图片高度超过限制，等比例缩小
  if (imgHeight > maxHeight) {
    imgHeight = maxHeight;
    imgWidth = imgHeight / ratio;
  }

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

    const clipRatio = drawHeight / imgHeight;
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
