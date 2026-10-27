import API from './api';

// Address of a seller's or customer's profile photo, or null when they have none
export function profilePhotoUrl(user, version) {
  if (!user) return null;
  const id = typeof user === 'string' ? user : (user.userId || user.id);
  const v = version !== undefined ? version : user.photoVersion;
  return id && v ? `${API.defaults.baseURL}/profile/photo/${id}?v=${v}` : null;
}

// Cuts the middle square out of the chosen picture and shrinks it (JPEG), so it uploads fast and looks the same everywhere
export function squarePhoto(file, size = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(size, side);
      canvas.height = canvas.width;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('type'));
    };
    img.src = url;
  });
}

// Captures a square snapshot from an active HTML <video> element.
// If mirror is true, the horizontal axis is flipped so it matches a selfie mirror preview.
export function captureVideoSnapshot(videoElement, { size = 480, mirror = false } = {}) {
  if (!videoElement) return null;
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  if (!width || !height) return null;

  const side = Math.min(width, height);
  const target = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (mirror) {
    ctx.translate(target, 0);
    ctx.scale(-1, 1);
  }

  const sx = (width - side) / 2;
  const sy = (height - side) / 2;
  ctx.drawImage(videoElement, sx, sy, side, side, 0, 0, target, target);
  return canvas.toDataURL('image/jpeg', 0.88);
}

// Captures the full un-cropped frame from an active HTML <video> element for interactive cropping
export function captureFullVideoSnapshot(videoElement, { mirror = false } = {}) {
  if (!videoElement) return null;
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Performs the crop and rotation transformation on an image source to produce a clean 480x480 square JPEG data URL
export function cropImageToSquare(source, {
  targetSize = 480,
  viewportSize = 280,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
  rotation = 0
} = {}) {
  return new Promise((resolve, reject) => {
    const process = (img) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;
        const isRotated = rotation === 90 || rotation === 270;
        const rotW = isRotated ? h0 : w0;
        const rotH = isRotated ? w0 : h0;

        const baseScale = Math.max(viewportSize / rotW, viewportSize / rotH);
        const R = targetSize / viewportSize;
        const finalScale = baseScale * zoom * R;

        ctx.translate(targetSize / 2, targetSize / 2);
        ctx.translate(offsetX * R, offsetY * R);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.drawImage(
          img,
          (-w0 * finalScale) / 2,
          (-h0 * finalScale) / 2,
          w0 * finalScale,
          h0 * finalScale
        );

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof source === 'string') {
      const img = new window.Image();
      img.onload = () => process(img);
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = source;
    } else if (source && typeof window !== 'undefined' && source instanceof window.HTMLImageElement) {
      if (source.complete) process(source);
      else {
        source.onload = () => process(source);
        source.onerror = () => reject(new Error('Failed to load image for cropping'));
      }
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}


