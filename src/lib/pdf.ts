import { jsPDF } from "jspdf";
import type { Config, PdfCaseKey, PdfFontKey, Transaction } from "./types";
import type { Report } from "./reports";
import { byCategory } from "./categories";
import { MONTHS, mondayIndex, ymd } from "./dates";
import { formatAOA, pad } from "./format";

export type PdfFont = PdfFontKey;
export type PdfCase = PdfCaseKey;

export interface PdfOpts {
  font: PdfFont;
  size: number;
  textCase: PdfCase;
}

type RGB = [number, number, number];

export const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

export const kindLabels: Record<Report["kind"], string> = {
  day: "Relatório Diário",
  week: "Relatório Semanal",
  month: "Relatório Mensal",
  quarter: "Relatório Trimestral",
  year: "Relatório Anual",
};

export const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const dayName = (d: Date) => DAY_NAMES[mondayIndex(d)];
export const fullDate = (d: Date) =>
  `${dayName(d)}, ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;

/** Remove caracteres fora do Latin-1 (as fontes padrão do PDF não os suportam). */
const clean = (s: string) =>
  s
    .replace(/[•·|]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/×/g, "x")
    .replace(/→/g, ">")
    .replace(/[^\u0000-\u00FF]/g, "");

export function applyCase(s: string, c: PdfCase): string {
  if (c === "upper") return s.toLocaleUpperCase("pt-PT");
  if (c === "lower") return s.toLocaleLowerCase("pt-PT");
  if (c === "title") {
    return s
      .toLocaleLowerCase("pt-PT")
      .replace(/(^|[\s(\-/])([^\s(\-/])/g, (_m, a: string, b: string) => a + b.toLocaleUpperCase("pt-PT"));
  }
  return s;
}

export const pdfFileName = (house: string, report: Report) => {
  const slug =
    house
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "game-house";
  return `relatorio-${slug}-${report.kind}-${ymd(report.from)}.pdf`;
};

/** Texto resumo para a mensagem do WhatsApp. */
export function reportSummaryText(report: Report, config: Config, now: Date, who?: string) {
  return [
    `*${config.houseName.toUpperCase()}*`,
    ...(who ? [`👤 Funcionário: ${who}`] : []),
    `📄 ${kindLabels[report.kind]} - ${report.title} (${report.subtitle})`,
    `📅 Dia: ${dayName(now)}`,
    `🗓 Data: ${fmtDate(now)}`,
    `🕒 Hora: ${fmtTime(now)}`,
    ``,
    `💰 Receita: ${formatAOA(report.totals.income)}`,
    `📉 Despesas: ${formatAOA(report.totals.expense)}`,
    `✅ Lucro: ${formatAOA(report.totals.net)}`,
    `🔢 Movimentos: ${report.totals.count}`,
    ``,
    `O relatório completo em PDF (A4) segue em anexo.`,
  ].join("\n");
}

export function buildReportPdf(a: {
  report: Report;
  txs: Transaction[];
  config: Config;
  opts: PdfOpts;
  now: Date;
  who?: string;
}) {
  const { report, txs, config, opts, now, who } = a;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const W = 210;
  const H = 297;
  const CX = W / 2;
  const M = 15;
  const BOTTOM = H - 24;
  const S = Math.min(18, Math.max(7, opts.size));
  const font = opts.font;

  const INK: RGB = [22, 22, 22];
  const GRAY: RGB = [105, 105, 105];
  const TEAL: RGB = [0, 112, 132];
  const GREEN: RGB = [8, 128, 78];
  const RED: RGB = [190, 40, 60];

  const T = (s: string) => applyCase(clean(s), opts.textCase);
  let y = 20;

  const setF = (style: "normal" | "bold" | "italic", size: number, c: RGB = INK) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(c[0], c[1], c[2]);
  };
  const lh = (size: number) => size * 0.3528 * 1.4;
  const rule = (x1 = M, x2 = W - M, c = 170) => {
    doc.setDrawColor(c, c, c);
    doc.setLineWidth(0.25);
    doc.line(x1, y, x2, y);
  };

  const newPage = () => {
    doc.addPage();
    y = 18;
    setF("bold", S, GRAY);
    doc.text(T(config.houseName), CX, y, { align: "center" });
    y += lh(S) - 1;
    rule();
    y += 6;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  const centerText = (text: string, size: number, style: "normal" | "bold" | "italic" = "normal", color: RGB = INK, maxW = W - 2 * M) => {
    setF(style, size, color);
    const lines = doc.splitTextToSize(T(text), maxW) as string[];
    lines.forEach((l) => {
      ensure(lh(size));
      doc.text(l, CX, y, { align: "center" });
      y += lh(size);
    });
  };

  const shrinkTo = (text: string, maxW: number, size: number) => {
    let s = size;
    doc.setFontSize(s);
    while (doc.getTextWidth(text) > maxW && s > 6) {
      s -= 0.5;
      doc.setFontSize(s);
    }
  };

  const boxRow = (items: { label: string; value: string; color?: RGB }[], w: number, gap: number, h: number) => {
    ensure(h + 4);
    const total = items.length * w + (items.length - 1) * gap;
    const x0 = (W - total) / 2;
    items.forEach((it, i) => {
      const x = x0 + i * (w + gap);
      doc.setDrawColor(170, 170, 170);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
      setF("normal", Math.max(7, S - 3), GRAY);
      doc.text(T(it.label), x + w / 2, y + 5, { align: "center" });
      setF("bold", S + 1, it.color ?? INK);
      const v = T(it.value);
      shrinkTo(v, w - 4, S + 1);
      doc.text(v, x + w / 2, y + h - 4.5, { align: "center" });
    });
    y += h + 4;
  };

  const section = (title: string) => {
    ensure(18);
    y += 4;
    centerText(title, S + 2, "bold", TEAL);
    y += 0.5;
    rule(CX - 22, CX + 22, 0);
    y += 4;
  };

  const table = (widths: number[], header: string[], rows: string[][], boldLast = false) => {
    const total = widths.reduce((s, n) => s + n, 0);
    const x0 = (W - total) / 2;
    const rowH = lh(S) + 2.2;
    const cell = (text: string, x: number, w: number, base: number, style: "normal" | "bold", color: RGB) => {
      setF(style, S, color);
      let t = T(text);
      const lines = doc.splitTextToSize(t, w - 3) as string[];
      if (lines.length > 1) t = lines[0].replace(/.{0,2}$/, "") + "...";
      doc.text(t, x + w / 2, base, { align: "center" });
    };
    const drawRow = (cells: string[], head: boolean, zebra: boolean, bold: boolean) => {
      if (y + rowH > BOTTOM) {
        newPage();
        drawRow(header, true, false, true);
      }
      if (head) {
        doc.setFillColor(226, 236, 240);
        doc.rect(x0, y, total, rowH, "F");
      } else if (zebra) {
        doc.setFillColor(246, 248, 249);
        doc.rect(x0, y, total, rowH, "F");
      }
      const base = y + rowH / 2 + (S * 0.3528) / 3;
      let x = x0;
      cells.forEach((c, i) => {
        cell(c, x, widths[i], base, head || bold ? "bold" : "normal", head ? TEAL : INK);
        x += widths[i];
      });
      doc.setDrawColor(215, 215, 215);
      doc.setLineWidth(0.15);
      doc.line(x0, y + rowH, x0 + total, y + rowH);
      y += rowH;
    };
    drawRow(header, true, false, true);
    rows.forEach((r, i) => drawRow(r, false, i % 2 === 1, boldLast && i === rows.length - 1));
    y += 2;
  };

  /* ------------------------------ Cabeçalho ------------------------------ */
  centerText(config.houseName || "Game House", S + 10, "bold", INK);
  y += 0.5;
  centerText("Relatório Financeiro", S + 3, "bold", TEAL);
  const contact = [config.address, config.phone, config.email].filter(Boolean).join("  |  ");
  if (contact) centerText(contact, Math.max(7, S - 2), "normal", GRAY);
  y += 2;
  rule();
  y += 7;

  centerText(`${kindLabels[report.kind]}: ${report.title}`, S + 4, "bold");
  centerText(report.subtitle, S, "normal", GRAY);
  y += 4;

  boxRow(
    [
      { label: "Dia", value: dayName(now) },
      { label: "Data", value: fmtDate(now) },
      { label: "Hora", value: fmtTime(now) },
    ],
    52, 4, 15
  );
  if (who) centerText(`Caixa de ${who} (Funcionário) • emitido em ${fullDate(now)}`, Math.max(7, S - 1), "italic", GRAY);
  else if (config.ownerName) centerText(`Emitido por ${config.ownerName} (Proprietário) em ${fullDate(now)}`, Math.max(7, S - 1), "italic", GRAY);
  y += 3;

  /* ------------------------------ Resumo ------------------------------ */
  boxRow(
    [
      { label: "Receita", value: formatAOA(report.totals.income), color: GREEN },
      { label: "Despesas", value: formatAOA(report.totals.expense), color: RED },
    ],
    80, 4, 16
  );
  boxRow(
    [
      { label: "Lucro", value: formatAOA(report.totals.net), color: report.totals.net >= 0 ? GREEN : RED },
      { label: "Movimentos", value: String(report.totals.count) },
    ],
    80, 4, 16
  );
  if (report.prev.income > 0) {
    const pct = ((report.totals.income - report.prev.income) / report.prev.income) * 100;
    centerText(
      `Variação da receita face ao período anterior: ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% (anterior: ${formatAOA(report.prev.income)})`,
      Math.max(7, S - 1), "italic", GRAY
    );
  }

  /* ------------------------------ Resumo por período ------------------------------ */
  const periodTitle =
    report.kind === "day" ? "Receita por hora" : report.kind === "week" ? "Receita por dia da semana" : report.kind === "month" ? "Receita por semana" : "Receita por mês";
  section(periodTitle);
  const buckets = report.kind === "day" ? report.buckets.filter((b) => b.income > 0 || b.expense > 0) : report.buckets;
  if (buckets.length === 0) {
    centerText("Sem movimentos neste período.", S, "italic", GRAY);
  } else {
    const rows = buckets.map((b) => [
      report.kind === "day" ? b.label : `${b.label}${b.sub ? ` (${b.sub})` : ""}`,
      formatAOA(b.income),
      formatAOA(b.expense),
      formatAOA(b.income - b.expense),
    ]);
    rows.push(["TOTAL", formatAOA(report.totals.income), formatAOA(report.totals.expense), formatAOA(report.totals.net)]);
    table([46, 40, 40, 40], ["Período", "Receita", "Despesas", "Saldo"], rows, true);
  }

  /* ------------------------------ Categorias ------------------------------ */
  const cats = byCategory(txs, report.from, report.to);
  if (cats.length > 0) {
    section("Por categoria");
    table(
      [66, 22, 40, 40],
      ["Categoria", "Mov.", "Receita", "Despesa"],
      cats.map((c) => [c.label, String(c.count), formatAOA(c.income), formatAOA(c.expense)])
    );
  }

  /* ------------------------------ Movimentos ------------------------------ */
  const list = txs
    .filter((t) => t.ts >= report.from.getTime() && t.ts < report.to.getTime())
    .sort((p, q) => p.ts - q.ts);
  section("Movimentos");
  if (list.length === 0) {
    centerText("Sem movimentos registados.", S, "italic", GRAY);
  } else {
    const LIMIT = 80;
    table(
      [30, 70, 18, 44],
      ["Data / Hora", "Descrição", "Tipo", "Valor"],
      list.slice(0, LIMIT).map((t) => {
        const d = new Date(t.ts);
        const when = report.kind === "day" ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return [when, `${t.label} ${t.detail}`.trim(), t.type === "in" ? "Entrada" : "Saída", `${t.type === "in" ? "+" : "-"} ${formatAOA(t.value)}`];
      })
    );
    if (list.length > LIMIT) {
      centerText(`... e mais ${list.length - LIMIT} movimentos (consulte a app para o detalhe completo).`, Math.max(7, S - 1), "italic", GRAY);
    }
  }

  /* ------------------------------ Rodapé + barra topo (todas as páginas) ------------------------------ */
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 150, 170);
    doc.rect(0, 0, W, 3.5, "F");
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.25);
    doc.line(M, H - 17, W - M, H - 17);
    setF("normal", Math.max(7, S - 3), GRAY);
    const house = config.houseName.length > 46 ? `${config.houseName.slice(0, 44)}...` : config.houseName;
    doc.text(T(`${house} - Gerado em ${fmtDate(now)} às ${fmtTime(now)}`), CX, H - 12, { align: "center" });
    doc.text(T(`Página ${i} de ${n}`), CX, H - 8, { align: "center" });
  }

  return doc;
}
