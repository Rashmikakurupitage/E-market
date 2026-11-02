import API from './api';

// Address of a customer's profile photo, or null when they have none
export function profilePhotoUrl(user) {
  return user?.id && user?.photoVersion ? `${API.defaults.baseURL}/profile/photo/${user.id}?v=${user.photoVersion}` : null;
}

// Cuts the middle square out of the chosen picture and shrinks it (JPEG), so it uploads fast and looks the same everywhere
export function squarePhoto(file, size = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const side = Math.min(img.width, img.height);
      let outputSize = Math.min(size, side);
      const encode = (quality) => new Promise((done, fail) => {
        canvas.toBlob((blob) => blob ? done(blob) : fail(new Error('type')), 'image/jpeg', quality);
      });
      const readDataUrl = (blob) => new Promise((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result);
        reader.onerror = () => fail(new Error('type'));
        reader.readAsDataURL(blob);
      });

      const process = async () => {
        while (outputSize >= 120) {
          canvas.width = Math.max(1, Math.round(outputSize));
          canvas.height = canvas.width;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('type');
          context.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            canvas.width,
            canvas.height
          );
          for (const quality of [0.85, 0.75, 0.65, 0.55]) {
            const blob = await encode(quality);
            if (blob.size <= 480 * 1024) return readDataUrl(blob);
          }
          outputSize *= 0.8;
        }
        throw new Error('size');
      };

      process()
        .then(resolve, reject)
        .finally(() => URL.revokeObjectURL(url));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('type')); };
    img.src = url;
  });
}
