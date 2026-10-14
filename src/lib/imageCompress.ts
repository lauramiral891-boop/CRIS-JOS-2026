function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error("img"));
    im.src = src;
  });
}

function toBlob(c: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((ok, fail) =>
    c.toBlob((b) => (b ? ok(b) : fail(new Error("blob"))), "image/jpeg", q),
  );
}

export async function compressFile(file: File, max = 1280, q = 0.72): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url);
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.width * k));
    c.height = Math.max(1, Math.round(im.height * k));
    c.getContext("2d")?.drawImage(im, 0, 0, c.width, c.height);
    return await toBlob(c, q);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function thumbFromDataUrl(src: string, side = 96): Promise<string> {
  const im = await loadImg(src);
  const s = Math.min(im.width, im.height);
  const c = document.createElement("canvas");
  c.width = side;
  c.height = side;
  c.getContext("2d")?.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, side, side);
  return c.toDataURL("image/jpeg", 0.7);
}
