export function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function burnAnnotations(imageDataUrl, annotations, canvasWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const scale = img.width / canvasWidth;

      ctx.strokeStyle = '#E53935';
      ctx.lineWidth = 3 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const ann of annotations) {
        if (ann.type === 'circle') {
          const cx = ((ann.startX + ann.endX) / 2) * scale;
          const cy = ((ann.startY + ann.endY) / 2) * scale;
          const rx = (Math.abs(ann.endX - ann.startX) / 2) * scale;
          const ry = (Math.abs(ann.endY - ann.startY) / 2) * scale;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ann.type === 'arrow') {
          const sx = ann.startX * scale;
          const sy = ann.startY * scale;
          const ex = ann.endX * scale;
          const ey = ann.endY * scale;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          // arrowhead
          const angle = Math.atan2(ey - sy, ex - sx);
          const headLen = 15 * scale;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
          ctx.stroke();
        } else if (ann.type === 'freehand') {
          if (ann.points && ann.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
            for (let i = 1; i < ann.points.length; i++) {
              ctx.lineTo(ann.points[i].x * scale, ann.points[i].y * scale);
            }
            ctx.stroke();
          }
        }
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}
