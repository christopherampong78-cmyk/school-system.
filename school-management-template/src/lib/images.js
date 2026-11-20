// Resize an uploaded image in the browser so it can be stored in the database.
export function resizeImage(file, { max = 240, square = false, type = 'image/jpeg', quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
      const scale = Math.min(1, max / Math.max(sw, sh));
      const w = Math.round(sw * scale), h = Math.round(sh * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL(type, quality));
    };
    img.onerror = () => reject(new Error('That image could not be read. Try a JPG or PNG.'));
    img.src = URL.createObjectURL(file);
  });
}
