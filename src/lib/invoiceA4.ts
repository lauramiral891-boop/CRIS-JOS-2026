import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import DEFAULT_LOGO from "./logoDefault";
import { drawRoundLogo } from "./pdfLogo";
import type { InvoicePdfData } from "./invoicePdf";

type RGB = [number, number, number];
const GREEN: RGB = [47, 191, 31];
const LIGHT: RGB = [214, 245, 201];

const money = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 2 })
    .format(n)
    .replace(/[\u202f\u00a0]/g, " ");
const num = (n: number) => money(n).replace(/\s*Kz$/, "");

export async function createProformaA4(inv: InvoicePdfData): Promise<Blob> {
  const c = inv.company ?? {};
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 15, CW = W - M * 2;
  const brand = c.company || inv.houseName || "CrisJose Gamers";
  const ivaRate = c.ivaRate ?? 14;
  const logo = c.logo || DEFAULT_LOGO;
  const font = (bold: boolean, size: number, color: RGB = [0, 0, 0]) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
  };
  const stroke = (color: RGB, w: number) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(w);
  };
  let y = 14;

  /* ---------- Cabeçalho ---------- */
  const r = 16;
  try {
    drawRoundLogo(pdf, logo, M + r, y + r, r);
  } catch (e) {
    console.error("Logo da fatura:", e);
  }
  stroke(GREEN, 0.9);
  pdf.circle(M + r, y + r, r, "S");
  const tx = M + r * 2 + 6;
  font(true, 20, GREEN);
  pdf.text(brand, tx, y + 8, { maxWidth: W - M - tx });
  font(true, 11);
  pdf.text(c.tagline || "Gerenciamento de Máquinas", tx, y + 14);
  font(false, 9);
  const info = [
    c.address ? "Endereço: " + c.address : "",
    c.phone ? "Telefone: " + c.phone : "",
    c.email ? "Email: " + c.email : "",
    c.nif ? "NIF: " + c.nif : "",
  ].filter(Boolean);
  info.forEach((t, i) => pdf.text(t, tx, y + 19 + i * 4.5, { maxWidth: W - M - tx }));
  y += r * 2 + 8;

  font(true, 18);
  pdf.text("FATURA PROFORMA", W - M, y, { align: "right" });
  y += 6;
  font(false, 10);
  pdf.text("Nº Fatura: " + inv.number, W - M, y, { align: "right" });
  y += 5;
  pdf.text("Data: " + new Date(inv.ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }), W - M, y, { align: "right" });
  y += 4;
  stroke(GREEN, 0.5);
  pdf.line(M, y, W - M, y);
  y += 9;

  /* ---------- Cliente ---------- */
  font(true, 11);
  pdf.text("DADOS DO CLIENTE", M, y);
  stroke([0, 0, 0], 0.3);
  pdf.line(M, y + 2, W - M, y + 2);
  y += 8;
  font(false, 10);
  pdf.text("Cliente: " + (inv.customer || "Cliente geral"), M, y);
  y += 6;
  pdf.text("NIF:", M, y);
  stroke([150, 150, 150], 0.2);
  pdf.line(M + 10, y + 0.5, M + 80, y + 0.5);
  y += 6;
  pdf.text("Contato:", M, y);
  pdf.line(M + 17, y + 0.5, M + 80, y + 0.5);
  y += 10;

  /* ---------- Tabela ---------- */
  const cols = [14, 92, 37, 37];
  const heads = ["Qtd", "Descrição do Serviço / Produto", "Preço Unit. (Kz)", "Total (Kz)"];
  const head = () => {
    pdf.setFillColor(0, 0, 0);
    pdf.rect(M, y, CW, 8, "F");
    font(true, 9, [255, 255, 255]);
    let x = M;
    heads.forEach((h, i) => {
      if (i === 1) pdf.text(h, x + 2, y + 5.3);
      else pdf.text(h, x + cols[i] / 2, y + 5.3, { align: "center" });
      x += cols[i];
    });
    y += 8;
  };
  head();
  for (const l of inv.lines) {
    font(false, 9);
    const lines = pdf.splitTextToSize(l.name || "Artigo", cols[1] - 4) as string[];
    const h = Math.max(8, lines.length * 4.2 + 3.6);
    if (y + h > H - 20) {
      pdf.addPage();
      y = 20;
      head();
    }
    stroke(GREEN, 0.3);
    let x = M;
    cols.forEach((w) => {
      pdf.rect(x, y, w, h, "S");
      x += w;
    });
    font(false, 9);
    pdf.text(String(l.qty), M + cols[0] / 2, y + 5.3, { align: "center" });
    pdf.text(lines, M + cols[0] + 2, y + 5.3);
    pdf.text(num(l.unitPrice), M + cols[0] + cols[1] + cols[2] - 2, y + 5.3, { align: "right" });
    pdf.text(num(l.total), W - M - 2, y + 5.3, { align: "right" });
    y += h;
  }

  /* ---------- Totais ---------- */
  if (y + 92 > H - 10) {
    pdf.addPage();
    y = 20;
  }
  y += 8;
  const bx = W - M - 85;
  const base = inv.total / (1 + ivaRate / 100);
  font(false, 10);
  pdf.text("Subtotal", bx, y);
  pdf.text(money(base), W - M, y, { align: "right" });
  y += 6;
  pdf.text("IVA (" + ivaRate + "%)", bx, y);
  pdf.text(money(inv.total - base), W - M, y, { align: "right" });
  y += 4;
  pdf.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  stroke(GREEN, 0.6);
  pdf.rect(bx - 2, y, 87, 11, "FD");
  font(true, 10);
  pdf.text("TOTAL A PAGAR", bx, y + 7);
  pdf.text(money(inv.total), W - M - 2, y + 7, { align: "right" });
  y += 14;
  font(false, 7.5, [110, 110, 110]);
  pdf.text("Preços com IVA incluído.", W - M, y, { align: "right" });
  y += 9;

  /* ---------- Pagamento ---------- */
  const payTop = y;
  font(true, 11);
  pdf.text("DADOS DE PAGAMENTO", M, y);
  stroke(GREEN, 0.4);
  pdf.line(M, y + 2, M + 70, y + 2);
  y += 8;
  font(false, 10);
  [
    "Banco: " + (c.bankName ?? ""),
    "IBAN: " + (c.iban ?? ""),
    "Titular da Conta: " + (c.accountHolder ?? ""),
    "Forma de pagamento: " + (inv.method || "—"),
    "Responsável: " + (inv.actorName || "—"),
  ].forEach((t) => {
    pdf.text(t, M, y, { maxWidth: CW - 40 });
    y += 5.5;
  });
  try {
    const qr = await QRCode.toDataURL(
      JSON.stringify({ tipo: "fatura-proforma", numero: inv.number, total: inv.total, data: inv.ts }),
      { errorCorrectionLevel: "M", margin: 1, width: 240 }
    );
    pdf.addImage(qr, "PNG", W - M - 26, payTop, 26, 26);
  } catch (e) {
    console.error("QR da fatura:", e);
  }
  y += 8;
  font(true, 11);
  pdf.text("Obrigado por escolher a " + brand + "!", W / 2, y, { align: "center", maxWidth: CW });

  /* ---------- Faixa verde e preta em todas as páginas ---------- */
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    pdf.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    pdf.rect(0, H - 6, W, 2, "F");
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, H - 4, W, 4, "F");
  }
  return pdf.output("blob");
}
