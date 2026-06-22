import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Question } from '@/types';
import { getPublicImageUrl } from '@/lib/supabase/client';

interface ExportOptions {
  groupByChapter: boolean;
  includeAnalysis: boolean;
  onProgress?: (done: number, total: number) => void;
}

// 生成 PDF
export async function generatePdf(questions: Question[], options: ExportOptions): Promise<void> {
  const { groupByChapter, includeAnalysis, onProgress } = options;

  // 1. 构建渲染容器
  const container = document.createElement('div');
  container.className = 'pdf-render-container';
  container.innerHTML = await buildHtml(questions, groupByChapter, includeAnalysis);
  document.body.appendChild(container);

  // 等待图片加载
  await waitForImages(container);

  // 2. 渲染为 canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  document.body.removeChild(container);

  // 3. 用 jsPDF 拼接 A4 竖版
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // 分页
  let heightLeft = imgHeight;
  let position = margin;
  let pageData = canvas.toDataURL('image/jpeg', 0.92);

  pdf.addImage(pageData, 'JPEG', margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(pageData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  // 4. 下载
  const fileName = `错题本_${formatDateForFile(new Date())}.pdf`;
  pdf.save(fileName);

  onProgress?.(questions.length, questions.length);
}

async function buildHtml(
  questions: Question[],
  groupByChapter: boolean,
  includeAnalysis: boolean
): Promise<string> {
  if (!groupByChapter) {
    return questions.map((q, i) => renderQuestion(q, i + 1, includeAnalysis)).join('');
  }

  // 按章节分组
  const groups = new Map<string, { chapterName: string; subjectName: string; items: Question[] }>();
  for (const q of questions) {
    const key = q.chapter_id;
    if (!groups.has(key)) {
      groups.set(key, {
        chapterName: q.chapter?.name || '未分类',
        subjectName: q.subject?.name || '',
        items: [],
      });
    }
    groups.get(key)!.items.push(q);
  }

  let html = '';
  let index = 1;
  for (const [, group] of groups) {
    html += `<div style="margin-top:24px;padding:12px;background:#F5F4EE;border-left:4px solid #B8472F;">
      <div style="font-size:18px;font-weight:bold;color:#2B2A28;">${escapeHtml(group.chapterName)}</div>
      <div style="font-size:12px;color:#8A8780;margin-top:4px;">${escapeHtml(group.subjectName)} · ${group.items.length} 题</div>
    </div>`;
    for (const q of group.items) {
      html += renderQuestion(q, index++, includeAnalysis);
    }
  }
  return html;
}

function renderQuestion(q: Question, index: number, includeAnalysis: boolean): string {
  const questionImages = q.images?.filter((i) => i.type === 'question') || [];
  const analysisImages = q.images?.filter((i) => i.type === 'analysis') || [];

  let html = `<div style="margin-top:20px;padding-bottom:16px;border-bottom:1px dashed #E2E0D8;">
    <div style="font-size:14px;font-weight:600;color:#2B2A28;margin-bottom:8px;">
      第 ${index} 题
      ${q.source ? `<span style="font-weight:normal;color:#8A8780;font-size:12px;margin-left:8px;">${escapeHtml(q.source)}</span>` : ''}
    </div>`;

  // 题目图片
  for (const img of questionImages) {
    const url = getPublicImageUrl(img.storage_path);
    html += `<img src="${url}" style="display:block;width:100%;margin-bottom:8px;border-radius:4px;" crossorigin="anonymous" />`;
  }

  // 错因标签
  if (q.error_tags.length > 0) {
    html += `<div style="margin:8px 0;">`;
    for (const tag of q.error_tags) {
      html += `<span style="display:inline-block;padding:2px 8px;margin-right:4px;background:#EFEEE7;color:#5C5A55;font-size:11px;border-radius:10px;">${escapeHtml(tag)}</span>`;
    }
    html += `</div>`;
  }

  // 解析图片
  if (includeAnalysis) {
    if (analysisImages.length > 0) {
      html += `<div style="font-size:12px;color:#8A8780;margin-top:12px;margin-bottom:4px;">解析：</div>`;
      for (const img of analysisImages) {
        const url = getPublicImageUrl(img.storage_path);
        html += `<img src="${url}" style="display:block;width:100%;margin-bottom:8px;border-radius:4px;" crossorigin="anonymous" />`;
      }
    }
    if (q.analysis_supplement) {
      html += `<div style="font-size:12px;color:#5C5A55;margin-top:8px;padding:8px;background:#F5F4EE;border-radius:4px;">${escapeHtml(q.analysis_supplement)}</div>`;
    }
  }

  html += `</div>`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  ).then(() => undefined);
}

function formatDateForFile(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
