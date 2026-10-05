/** Lê uma foto escolhida pelo utilizador, corta ao centro (quadrado) e comprime para JPEG pequeno. */
export function fileToPhoto(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Escolha uma imagem (JPG ou PNG)."));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("A imagem é demasiado grande (máx. 15 MB)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("x");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.82));
      } catch {
        reject(new Error("Não foi possível ler a imagem."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler esta foto. Tente outra (JPG ou PNG) ou tire uma nova.")); };
    img.src = url;
  });
}

/** Foto para banners/capas/galerias: mantém a proporção, reduz ao lado máximo e comprime em JPEG. */
export function fileToImage(file: File, maxSide = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Escolha uma imagem (JPG ou PNG)."));
    if (file.size > 20 * 1024 * 1024) return reject(new Error("A imagem é demasiado grande (máx. 20 MB)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * k));
        const h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("x");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      } catch {
        reject(new Error("Não foi possível ler a imagem."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler esta foto. Tente outra (JPG ou PNG).")); };
    img.src = url;
  });
}
