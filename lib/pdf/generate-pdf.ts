import jsPDF from 'jspdf';
import type { Question } from '@/types';
import { getPublicImageUrl } from '@/lib/supabase/client';
import { stitchImageUrls } from '@/lib/image/stitch';

interface ExportOptions {
  groupByChapter: boolean;
  includeAnalysis: boolean;
  maxImageHeight?: number;
  questionGap?: number;
  onProgress?: (done: number, total: number) => void;
  onStatus?: (msg: string) => void;
}

// 中文字体栈（覆盖主流平台）
const FONT_STACK = 'system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

const pageWidth = 210;
const pageHeight = 297;
const marginX = 15;
const marginTop = 15;
const marginBottom = 15;
const contentWidth = pageWidth - marginX * 2;
const defaultMaxImageHeight = 110; // 默认单张图片最大高度
const imageBottomGap = 6; // 图片与下方内容间距
const defaultQuestionGap = 30; // 默认题目之间留白

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

// 生成 PDF（单题流式布局，控制图片尺寸）
export async function generatePdf(questions: Question[], options: ExportOptions): Promise<void> {
  const {
    groupByChapter,
    onProgress,
    onStatus,
    maxImageHeight = defaultMaxImageHeight,
    questionGap = defaultQuestionGap,
  } = options;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let questionIndex = 0;

  const groups = groupByChapter ? groupByChapterFn(questions) : [{ name: '', items: questions }];
  const totalQuestions = questions.length;

  for (const group of groups) {
    let yPos = marginTop;

    if (groupByChapter && group.name) {
      yPos = await renderChapterTitle(pdf, group.name, group.items.length, yPos);
    }

    for (const q of group.items) {
      questionIndex++;
      onStatus?.(`正在生成 PDF（${questionIndex}/${totalQuestions}）`);
      onProgress?.(questionIndex - 1, totalQuestions);

      // 如果剩余空间不足以容纳一个最小题目块，换页
      if (yPos > marginTop && pageHeight - marginBottom - yPos < 40) {
        pdf.addPage();
        yPos = marginTop;
      }

      yPos = await renderQuestion(pdf, q, questionIndex, marginX, yPos, contentWidth, maxImageHeight);
      yPos += questionGap;
    }
  }

  const fileName = `错题本_${formatDateForFile(new Date())}.pdf`;
  pdf.save(fileName);

  onProgress?.(totalQuestions, totalQuestions);
  onStatus?.('');
}

// 渲染章节标题，返回新的 y 坐标
async function renderChapterTitle(
  pdf: jsPDF,
  name: string,
  count: number,
  yPos: number
): Promise<number> {
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
  return yPos + titleHeight + 8;
}

// 渲染单道题目，返回结束 y 坐标
async function renderQuestion(
  pdf: jsPDF,
  q: Question,
  index: number,
  x: number,
  y: number,
  width: number,
  maxImageHeight: number
): Promise<number> {
  let yPos = y;

  // 标题
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
    const tagH = addTextImage(pdf, q.error_tags.join('  '), x, yPos, 7, [0x5c, 0x5a, 0x55], width);
    yPos += Math.max(tagH, 3) + 2;
  }

  return yPos;
}

// 将图片添加到 PDF，自动分页与尺寸限制
async function addImageToPdf(
  pdf: jsPDF,
  url: string,
  x: number,
  yPos: number,
  imgWidth: number,
  maxImageHeight: number
): Promise<number> {
  const base64 = await imageUrlToBase64(url);
  const { img, w, h } = await loadImage(base64);

  const ratio = h / w;
  let imgHeight = imgWidth * ratio;

  // 高度超过限制时等比例缩小
  if (imgHeight > maxImageHeight) {
    imgHeight = maxImageHeight;
    imgWidth = imgHeight / ratio;
  }

  // 剩余空间不足则换页
  if (yPos + imgHeight + 10 > pageHeight - marginBottom) {
    pdf.addPage();
    yPos = marginTop;
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

  return yPos + imageBottomGap;
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
