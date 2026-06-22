// 图片压缩工具：将图片压缩到最大边 maxSize，输出 JPEG

export async function compressImage(
  file: File,
  maxSize = 1200,
  quality = 0.85
): Promise<File> {
  // 非图片直接返回
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const img = await loadImage(file);
  let { width, height } = img;

  // 计算缩放比例
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  // 白色背景，避免透明 PNG 变黑
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(compressed);
      },
      'image/jpeg',
      quality
    );
  });
}

// 批量压缩
export async function compressImages(
  files: File[],
  maxSize = 1200,
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  const results: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i], maxSize);
    results.push(compressed);
    onProgress?.(i + 1, files.length);
  }
  return results;
}

function loadImage(file: File): Promise<HTMLImageElement> {
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
