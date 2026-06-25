/**
 * 将多张图片拼合为一张
 * @param files - 图片文件数组（按顺序）
 * @param direction - 'vertical' 上下拼合 | 'horizontal' 左右拼合
 * @param gap - 间距像素数（0 / 4 / 8）
 * @param gapColor - 间距颜色，默认 '#FFFFFF'
 * @returns 拼合后的 File 对象
 */
export async function stitchImages(
  files: File[],
  direction: 'vertical' | 'horizontal',
  gap: number = 0,
  gapColor: string = '#FFFFFF'
): Promise<File> {
  const images = await Promise.all(files.map(fileToImage));

  if (direction === 'vertical') {
    return stitchVertical(images, gap, gapColor);
  } else {
    return stitchHorizontal(images, gap, gapColor);
  }
}

// 上下拼合
function stitchVertical(
  images: HTMLImageElement[],
  gap: number,
  gapColor: string
): Promise<File> {
  // 目标宽度 = 所有图片中最大的宽度
  const maxWidth = Math.max(...images.map((img) => img.naturalWidth));
  // 每张图片等比例缩放到目标宽度
  const scaled = images.map((img) => {
    const ratio = maxWidth / img.naturalWidth;
    return { img, w: maxWidth, h: Math.round(img.naturalHeight * ratio) };
  });
  // Canvas 高度 = 所有缩放后图片高度之和 + gap * (图片数 - 1)
  const totalHeight = scaled.reduce((sum, s) => sum + s.h, 0) + gap * (scaled.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  // 白色背景
  ctx.fillStyle = gapColor;
  ctx.fillRect(0, 0, maxWidth, totalHeight);

  let y = 0;
  for (let i = 0; i < scaled.length; i++) {
    const { img, w, h } = scaled[i];
    ctx.drawImage(img, 0, y, w, h);
    y += h;
    // 填充间距
    if (i < scaled.length - 1 && gap > 0) {
      ctx.fillStyle = gapColor;
      ctx.fillRect(0, y, maxWidth, gap);
      y += gap;
    }
  }

  return canvasToFile(canvas);
}

// 左右拼合
function stitchHorizontal(
  images: HTMLImageElement[],
  gap: number,
  gapColor: string
): Promise<File> {
  // 目标高度 = 所有图片中最大的高度
  const maxHeight = Math.max(...images.map((img) => img.naturalHeight));
  // 每张图片等比例缩放到目标高度
  const scaled = images.map((img) => {
    const ratio = maxHeight / img.naturalHeight;
    return { img, w: Math.round(img.naturalWidth * ratio), h: maxHeight };
  });
  // Canvas 宽度 = 所有缩放后图片宽度之和 + gap * (图片数 - 1)
  const totalWidth = scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = gapColor;
  ctx.fillRect(0, 0, totalWidth, maxHeight);

  let x = 0;
  for (let i = 0; i < scaled.length; i++) {
    const { img, w, h } = scaled[i];
    ctx.drawImage(img, x, 0, w, h);
    x += w;
    if (i < scaled.length - 1 && gap > 0) {
      ctx.fillStyle = gapColor;
      ctx.fillRect(x, 0, gap, maxHeight);
      x += gap;
    }
  }

  return canvasToFile(canvas);
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob 失败'));
          return;
        }
        const file = new File([blob], `stitched_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(file);
      },
      'image/jpeg',
      0.9
    );
  });
}

// 将图片 URL 转为 File（用于编辑模式下拼合已上传图片）
export async function urlToFile(url: string, filename?: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`图片下载失败: ${res.status}`);
  }
  const blob = await res.blob();
  const name = filename || `image_${Date.now()}.jpg`;
  return new File([blob], name, { type: blob.type || 'image/jpeg', lastModified: Date.now() });
}

// 混合拼合：支持 File 与 URL 混用
export async function stitchFilesOrUrls(
  items: (File | string)[],
  direction: 'vertical' | 'horizontal',
  gap: number = 0,
  gapColor: string = '#FFFFFF'
): Promise<File> {
  const files = await Promise.all(
    items.map((item) => (typeof item === 'string' ? urlToFile(item) : item))
  );
  return stitchImages(files, direction, gap, gapColor);
}

/**
 * 将多个图片 URL 拼合为一张（用于 PDF 导出）
 * @returns 拼合后的 base64 data URL
 */
export async function stitchImageUrls(
  urls: string[],
  direction: 'vertical' | 'horizontal' = 'vertical',
  gap: number = 0
): Promise<string> {
  const images = await Promise.all(urls.map(urlToImage));

  if (direction === 'vertical') {
    return stitchUrlsVertical(images, gap);
  } else {
    return stitchUrlsHorizontal(images, gap);
  }
}

function urlToImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`));
    img.src = src;
  });
}

function stitchUrlsVertical(images: HTMLImageElement[], gap: number): string {
  const maxWidth = Math.max(...images.map((img) => img.naturalWidth));
  const scaled = images.map((img) => {
    const ratio = maxWidth / img.naturalWidth;
    return { img, w: maxWidth, h: Math.round(img.naturalHeight * ratio) };
  });
  const totalHeight = scaled.reduce((sum, s) => sum + s.h, 0) + gap * (scaled.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, maxWidth, totalHeight);

  let y = 0;
  for (let i = 0; i < scaled.length; i++) {
    const { img, w, h } = scaled[i];
    ctx.drawImage(img, 0, y, w, h);
    y += h;
    if (i < scaled.length - 1 && gap > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, y, maxWidth, gap);
      y += gap;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function stitchUrlsHorizontal(images: HTMLImageElement[], gap: number): string {
  const maxHeight = Math.max(...images.map((img) => img.naturalHeight));
  const scaled = images.map((img) => {
    const ratio = maxHeight / img.naturalHeight;
    return { img, w: Math.round(img.naturalWidth * ratio), h: maxHeight };
  });
  const totalWidth = scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, maxHeight);

  let x = 0;
  for (let i = 0; i < scaled.length; i++) {
    const { img, w, h } = scaled[i];
    ctx.drawImage(img, x, 0, w, h);
    x += w;
    if (i < scaled.length - 1 && gap > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, 0, gap, maxHeight);
      x += gap;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
