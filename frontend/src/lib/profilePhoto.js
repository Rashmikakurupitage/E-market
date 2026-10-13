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
