import type { Config } from "./types";
import { createProformaA4 } from "./invoiceA4";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface InvoicePdfLine {
  name: string;
  kind: "produto" | "servico";
  qty: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  number: string;
  ts: number;
  customer: string;
  method: string;
  actorName: string;
  lines: InvoicePdfLine[];
  total: number;
  houseName?: string;
  company?: Partial<Config>;
}

const money = (n: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(n);

export async function createInvoicePdf(
  invoice: InvoicePdfData,
  format: "a4" | "thermal" = "a4"
): Promise<Blob> {
  if (format === "a4") return createProformaA4(invoice);
  const thermal = format === "thermal";
  const width = thermal ? 80 : 210;
  const margin = thermal ? 5 : 15;
  const contentWidth = width - margin * 2;
  const nameWidth = contentWidth * 0.52;
  const date = new Date(invoice.ts).toLocaleString("pt-PT");

  // Mede o conteúdo antes de criar o recibo térmico.
  const measure = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 2000],
  });

  const countLines = (
    value: string,
    fontSize: number,
    maxWidth: number
  ) => {
    measure.setFont("helvetica", "normal");
    measure.setFontSize(fontSize);
    return Math.max(
      1,
      measure.splitTextToSize(value || " ", maxWidth).length
    );
  };

  const detailLines = [
    "N.º: " + invoice.number,
    "Data: " + date,
    "Cliente: " + (invoice.customer || "Não identificado"),
    "Pagamento: " + (invoice.method || "Não indicado"),
    "Responsável: " + (invoice.actorName || "Não identificado"),
  ].reduce((sum, value) => sum + countLines(value, 8, contentWidth), 0);

  const itemsHeight = invoice.lines.reduce((sum, line) => {
    const lines = countLines(line.name || "Artigo", 8, nameWidth);
    return sum + Math.max(6, lines * 4) + 12;
  }, 0);

  const thermalHeight = Math.ceil(
    150 + detailLines * 4 + itemsHeight + 45
  );

  const height = thermal
    ? Math.max(170, thermalHeight)
    : 297;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: thermal ? [width, height] : "a4",
  });

  const lineHeight = thermal ? 4 : 4.2;
  let y = 15;

  const wrappedText = (
    value: string,
    x: number,
    currentY: number,
    maxWidth: number,
    fontSize: number,
    bold = false
  ) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(value || " ", maxWidth);
    pdf.text(lines, x, currentY);

    return currentY + Math.max(lineHeight, lines.length * lineHeight);
  };

  const drawItemsHeader = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(thermal ? 8 : 10);
    pdf.text("Descrição", margin, y);
    pdf.text("Qtd.", width - margin - 25, y, { align: "right" });
    pdf.text("Total", width - margin, y, { align: "right" });
    y += 6;
    pdf.setFont("helvetica", "normal");
  };

  const drawContinuationHeader = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(thermal ? 10 : 14);
    pdf.text("FATURA INTERNA", width / 2, y, { align: "center" });
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(thermal ? 8 : 10);
    pdf.text("N.º: " + invoice.number, margin, y);
    y += 7;

    pdf.line(margin, y, width - margin, y);
    y += 6;
    drawItemsHeader();
  };

  // Cabeçalho principal.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(thermal ? 12 : 20);
  pdf.text(
    invoice.houseName || "CJ Gerenciamento",
    width / 2,
    y,
    { align: "center", maxWidth: contentWidth }
  );

  y += 8;
  pdf.setFontSize(thermal ? 10 : 14);
  pdf.text("FATURA INTERNA", width / 2, y, { align: "center" });

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(thermal ? 8 : 10);
  pdf.text("CrisJoséGamers", width / 2, y, { align: "center" });

  y += 8;
  pdf.line(margin, y, width - margin, y);
  y += 7;

  y = wrappedText("N.º: " + invoice.number, margin, y, contentWidth, thermal ? 8 : 10);
  y = wrappedText("Data: " + date, margin, y, contentWidth, thermal ? 8 : 10);
  y = wrappedText(
    "Cliente: " + (invoice.customer || "Não identificado"),
    margin, y, contentWidth, thermal ? 8 : 10
  );
  y = wrappedText(
    "Pagamento: " + (invoice.method || "Não indicado"),
    margin, y, contentWidth, thermal ? 8 : 10
  );
  y = wrappedText(
    "Responsável: " + (invoice.actorName || "Não identificado"),
    margin, y, contentWidth, thermal ? 8 : 10
  );

  y += 3;
  pdf.line(margin, y, width - margin, y);
  y += 6;
  drawItemsHeader();

  // Cada artigo é impresso; no A4, uma nova página repete o cabeçalho da tabela.
  for (const line of invoice.lines) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(thermal ? 8 : 9);

    const label = pdf.splitTextToSize(line.name || "Artigo", nameWidth);
    const rowHeight = Math.max(6, label.length * lineHeight) + 6;
    const unitHeight = 6;
    const footerReserve = thermal ? 48 : 68;

    if (!thermal && y + rowHeight + unitHeight > height - footerReserve) {
      pdf.addPage();
      y = 15;
      drawContinuationHeader();
    }

    pdf.text(label, margin, y);
    pdf.text(String(line.qty), width - margin - 25, y, { align: "right" });
    pdf.text(money(line.total), width - margin, y, { align: "right" });

    y += Math.max(6, label.length * lineHeight);

    pdf.setFontSize(thermal ? 7 : 9);
    pdf.text("Unitário: " + money(line.unitPrice), margin, y);
    y += unitHeight;
  }

  // Mantém o total e o QR Code juntos numa área com espaço suficiente.
  const qrSize = thermal ? 22 : 30;
  const footerNeeded = 2 + 9 + 8 + 6 + qrSize + 8;

  if (!thermal && y + footerNeeded > height - 8) {
    pdf.addPage();
    y = 15;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("FATURA INTERNA — CONTINUAÇÃO", width / 2, y, {
      align: "center",
      maxWidth: contentWidth,
    });
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("N.º: " + invoice.number, margin, y);
    y += 8;
  }

  y += 2;
  pdf.line(margin, y, width - margin, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(thermal ? 12 : 15);
  pdf.text("TOTAL: " + money(invoice.total), width - margin, y, {
    align: "right",
    maxWidth: contentWidth,
  });

  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(thermal ? 8 : 10);
  pdf.text(
    "Guarde este documento para consulta.",
    width / 2,
    y,
    { align: "center", maxWidth: contentWidth }
  );

  const qrPayload = JSON.stringify({
    tipo: "fatura-interna",
    numero: invoice.number,
    total: invoice.total,
    data: invoice.ts,
  });

  const qr = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  const qrY = y + 5;
  pdf.addImage(
    qr,
    "PNG",
    (width - qrSize) / 2,
    qrY,
    qrSize,
    qrSize
  );

  return pdf.output("blob");
}

export async function downloadInvoicePdf(
  invoice: InvoicePdfData,
  format: "a4" | "thermal" = "a4"
): Promise<void> {
  const blob = await createInvoicePdf(invoice, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download =
    invoice.number + (format === "a4" ? "-A4.pdf" : "-termica.pdf");
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
