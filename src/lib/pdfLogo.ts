import type { jsPDF } from "jspdf";

/** Desenha o logo num círculo: a imagem quadrada + uma máscara branca que tapa os cantos. */
export function drawRoundLogo(doc: jsPDF, src: string, cx: number, cy: number, r: number) {
  const fmt = /^data:image\/png/i.test(src) ? "PNG" : "JPEG";
  doc.addImage(src, fmt, cx - r, cy - r, r * 2, r * 2);
  const w = r * 0.9;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(w);
  doc.circle(cx, cy, r + w / 2, "S");
}
