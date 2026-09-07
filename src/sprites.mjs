// Preserve the supplied PNG. Build eight draw surfaces from its transparent
// connected figures so a long saber never brings in the neighbouring key pose.
export function swordsmanFrames(image, canvasFactory) {
  const source = canvasFactory(image.width, image.height),
    c = source.getContext("2d");
  c.drawImage(image, 0, 0);
  const rgba = c.getImageData(0, 0, image.width, image.height).data,
    w = image.width,
    h = image.height,
    marks = new Int32Array(w * h),
    queue = new Int32Array(w * h),
    parts = [];
  let label = 0;
  for (let origin = 0; origin < marks.length; origin++) {
    if (marks[origin] || rgba[origin * 4 + 3] < 24) continue;
    const id = ++label;
    let r = 0,
      n = 1,
      x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0;
    queue[0] = origin;
    marks[origin] = id;
    while (r < n) {
      const p = queue[r++],
        x = p % w,
        y = (p / w) | 0;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (const next of [
        x ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ])
        if (next >= 0 && !marks[next] && rgba[next * 4 + 3] >= 24) {
          marks[next] = id;
          queue[n++] = next;
        }
    }
    if (n > 4000)
      parts.push({ id, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  const chosen = parts.sort((a, b) => b.n - a.n).slice(0, 8);
  const top = chosen
      .filter((p) => p.y + p.h / 2 < h * 0.5)
      .sort((a, b) => a.x - b.x),
    bottom = chosen
      .filter((p) => p.y + p.h / 2 >= h * 0.5)
      .sort((a, b) => a.x - b.x);
  if (top.length !== 4 || bottom.length !== 4)
    throw new Error("Expected four upper and four lower sword poses");
  return [...top, ...bottom].map((p, index) => {
    const canvas = canvasFactory(p.w, p.h),
      ctx = canvas.getContext("2d"),
      pixels = ctx.createImageData(p.w, p.h);
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        const at = (p.y + y) * w + p.x + x;
        if (marks[at] === p.id)
          pixels.data.set(rgba.subarray(at * 4, at * 4 + 4), (y * p.w + x) * 4);
      }
    ctx.putImageData(pixels, 0, 0);
    return {
      image: canvas,
      width: p.w,
      height: p.h,
      pivot: [0.42, 0.34, 0.45, 0.4, 0.48, 0.38, 0.45, 0.6][index] * p.w,
      source: [p.x, p.y, p.w, p.h],
    };
  });
}
