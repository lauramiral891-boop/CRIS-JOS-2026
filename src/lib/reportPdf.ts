import { jsPDF } from "jspdf";
import type { Config, Shift, Transaction } from "./types";
import type { Report } from "./reports";
import { applyCase, dayName, fmtDate, fmtTime, kindLabels } from "./pdf";
import { formatAOA } from "./format";
import DEFAULT_LOGO from "./logoDefault";
import { drawRoundLogo } from "./pdfLogo";

type RGB = [number, number, number];
type Style = "normal" | "bold" | "italic";

export const PDF_COLORS: Record<string, { name: string; rgb: RGB }> = {
  verde: { name: "Verde", rgb: [47, 191, 31] },
  azul: { name: "Azul", rgb: [30, 136, 229] },
  roxo: { name: "Roxo", rgb: [126, 87, 194] },
  laranja: { name: "Laranja", rgb: [245, 124, 0] },
  vermelho: { name: "Vermelho", rgb: [229, 57, 53] },
  dourado: { name: "Dourado", rgb: [201, 162, 39] },
  rosa: { name: "Rosa", rgb: [233, 30, 99] },
  ciano: { name: "Ciano", rgb: [0, 172, 193] },
};

export const PDF_MODELS = [
  { id: "detalhado", name: "Detalhado", sub: "Tabelas completas" },
  { id: "resumo", name: "Resumo", sub: "Uma página" },
  { id: "graficos", name: "Gráficos", sub: "Barras e colunas" },
  { id: "lista", name: "Lista", sub: "Estilo recibo" },
] as const;

export const pdfAccentCss = (c: Config) =>
  `rgb(${(PDF_COLORS[c.pdfColor ?? "verde"] ?? PDF_COLORS.verde).rgb.join(",")})`;

const tint = (c: RGB, k: number): RGB => [0, 1, 2].map((i) => Math.round(255 - (255 - c[i]) * k)) as RGB;
const shade = (c: RGB, k: number): RGB => c.map((v) => Math.round(v * k)) as RGB;
const pad2 = (n: number) => String(n).padStart(2, "0");
const hm = (ts: number) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export function buildReportPdf2(a: {
  report: Report;
  txs: Transaction[];
  config: Config;
  now: Date;
  who?: string;
  opts?: unknown;
  shifts?: Shift[];
}): jsPDF {
  const { report, txs, config, now, who } = a;
  const shifts = a.shifts ?? [];
  const scope = (report as { scope?: string }).scope === "sales" ? "sales" : "house";
  const accent = (PDF_COLORS[config.pdfColor ?? "verde"] ?? PDF_COLORS.verde).rgb;
  const layout = ["detalhado", "resumo", "graficos", "lista"].includes(config.pdfModel ?? "") ? (config.pdfModel as string) : "detalhado";
  const model: "tabela" | "claro" | "linhas" = layout === "resumo" ? "claro" : layout === "graficos" ? "linhas" : "tabela";
  const S = Math.min(13, Math.max(9, config.pdfSize || 11));
  const TS = S - 1.5;
  const fam = config.pdfFont === "times" ? "times" : config.pdfFont === "courier" ? "courier" : "helvetica";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CX = W / 2, CW = W - M * 2, BOTTOM = H - 20;
  const INK: RGB = [17, 17, 17];
  const GRAY: RGB = [100, 100, 100];
  const GOOD: RGB = [0, 128, 70];
  const BAD: RGB = [190, 40, 70];

  const T = (s: string) =>
    applyCase(String(s).replace(/[\u202f\u00a0]/g, " ").replace(/[\u2013\u2014]/g, "-").replace(/\u2022/g, "-"), config.pdfCase);
  const font = (style: Style, size: number, color: RGB = INK) => {
    doc.setFont(fam, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const lh = (size: number) => size * 0.3528 * 1.3;
  const fill = (c: RGB, x: number, yy: number, w: number, h: number) => {
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(x, yy, w, h, "F");
  };
  const stroke = (c: RGB, w: number) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
  };

  let y = 10;
  const newPage = () => {
    doc.addPage();
    y = 10;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const center = (text: string, size: number, style: Style = "normal", color: RGB = INK, gap = 1.5) => {
    font(style, size, color);
    const lines = doc.splitTextToSize(T(text), CW) as string[];
    for (const l of lines) {
      ensure(lh(size));
      doc.text(l, CX, y + size * 0.3528, { align: "center" });
      y += lh(size);
    }
    y += gap;
  };
  const boxes = (items: { l: string; v: string; c?: RGB }[], h = 15, vs = S + 2) => {
    ensure(h + 4);
    const gap = 4;
    const w = (CW - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      stroke(accent, 0.5);
      doc.roundedRect(x, y, w, h, 2, 2, "S");
      font("normal", S - 3, GRAY);
      doc.text(T(it.l), x + w / 2, y + 5, { align: "center" });
      font("bold", vs, it.c ?? INK);
      doc.text(T(it.v), x + w / 2, y + h - 4, { align: "center", maxWidth: w - 3 });
    });
    y += h + 4;
  };
  const section = (title: string) => {
    ensure(22);
    y += 2;
    center(title, S + 2, "bold", accent, 0.5);
    stroke(accent, 0.5);
    doc.line(CX - 20, y, CX + 20, y);
    y += 4;
  };

  const table = (widths: number[], head: string[], rows: string[][], boldLast = false) => {
    const total = widths.reduce((s, n) => s + n, 0);
    const x0 = M + (CW - total) / 2;
    const rowBase = lh(TS) + 2.6;
    const draw = (cells: string[], mode: "head" | "body" | "total", zebra: boolean) => {
      font(mode === "body" ? "normal" : "bold", TS);
      const parts = cells.map((c, i) => (doc.splitTextToSize(T(c), widths[i] - 3) as string[]).slice(0, 3));
      const n = Math.max(1, ...parts.map((p) => p.length));
      const h = Math.max(rowBase, n * lh(TS) + 2.4);
      if (y + h > BOTTOM) {
        newPage();
        if (mode !== "head") draw(head, "head", false);
      }
      if (mode === "head") {
        if (model === "tabela") fill([0, 0, 0], x0, y, total, h);
        else if (model === "claro") fill(tint(accent, 0.28), x0, y, total, h);
      } else if (mode === "total") fill(tint(accent, 0.25), x0, y, total, h);
      else if (zebra && model === "claro") fill([246, 247, 247], x0, y, total, h);

      if (model === "tabela") {
        stroke(accent, 0.3);
        let xx = x0;
        widths.forEach((w) => {
          doc.rect(xx, y, w, h, "S");
          xx += w;
        });
      } else if (mode === "head" && model === "linhas") {
        stroke(accent, 0.8);
        doc.line(x0, y + h, x0 + total, y + h);
      } else {
        stroke([205, 205, 205], 0.15);
        doc.line(x0, y + h, x0 + total, y + h);
      }

      const color: RGB = mode === "head" ? (model === "tabela" ? ([255, 255, 255] as RGB) : model === "claro" ? shade(accent, 0.6) : INK) : INK;
      font(mode === "body" ? "normal" : "bold", TS, color);
      let x = x0;
      parts.forEach((lines, i) => {
        const base = y + (h - lines.length * lh(TS)) / 2 + TS * 0.3528 * 0.95;
        lines.forEach((ln, k) => doc.text(ln, x + widths[i] / 2, base + k * lh(TS), { align: "center" }));
        x += widths[i];
      });
      y += h;
    };
    draw(head, "head", false);
    rows.forEach((r, i) => draw(r, boldLast && i === rows.length - 1 ? "total" : "body", i % 2 === 1));
    y += 4;
  };

  const brand = config.company || config.houseName || "Game House";
  const logo = config.logo || DEFAULT_LOGO;
  const logoOk = typeof logo === "string" && /^data:image\/(png|jpe?g)/i.test(logo) && logo.length > 1500;
  const r = 15;
  const cy = y + r;
  let drawn = false;
  if (logoOk) {
    try {
      drawRoundLogo(doc, logo, CX, cy, r);
      drawn = true;
    } catch (e) {
      console.error("Logo do relatório:", e);
    }
  }
  if (!drawn) {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.circle(CX, cy, r, "F");
    const ini = brand.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    font("bold", 22, [255, 255, 255]);
    doc.text(ini || "GH", CX, cy + 3.4, { align: "center" });
  }
  stroke(accent, 1);
  doc.circle(CX, cy, r, "S");
  doc.setLineWidth(0.3);
  y += r * 2 + 4;

  center(brand, S + 9, "bold", accent, 0.5);
  center(config.tagline ?? "Gerenciamento de Máquinas", S, "bold", INK, 0.5);
  const contact = [config.address, config.phone, config.email, config.nif ? `NIF ${config.nif}` : ""].filter(Boolean).join("  |  ");
  if (contact) center(contact, Math.max(7, S - 2), "normal", GRAY, 0.5);
  y += 1;
  stroke(accent, 0.6);
  doc.line(M, y, W - M, y);
  y += 5;

  center(scope === "sales" ? "Relatório de Outras Vendas" : "Relatório Game House", S + 5, "bold", accent, 0.5);
  center(`${kindLabels[report.kind]}: ${report.title}`, S + 2, "bold", INK, 0);
  center(report.subtitle, S, "normal", GRAY, 3);

  boxes([
    { l: "Dia", v: dayName(now) },
    { l: "Data", v: fmtDate(now) },
    { l: "Hora", v: fmtTime(now) },
  ], 14, S + 1);
  const emitted = who ? `Caixa de ${who} (Funcionário)` : config.ownerName ? `Emitido por ${config.ownerName} (Proprietário)` : "";
  if (emitted) center(emitted, Math.max(7, S - 1), "italic", GRAY, 2);

  const inRange = txs.filter((t) => t.ts >= report.from.getTime() && t.ts < report.to.getTime()).sort((p, q) => p.ts - q.ts);
  if (report.kind === "day" && inRange.length > 0) {
    center(`Atividade registada: ${hm(inRange[0].ts)} - ${hm(inRange[inRange.length - 1].ts)}`, Math.max(7, S - 1), "italic", GRAY, 2);
  }

  boxes([
    { l: "Receita", v: formatAOA(report.totals.income), c: GOOD },
    { l: "Despesas", v: formatAOA(report.totals.expense), c: BAD },
  ], 16, S + 3);
  boxes([
    { l: "Lucro", v: formatAOA(report.totals.net), c: report.totals.net >= 0 ? GOOD : BAD },
    { l: "Movimentos", v: String(report.totals.count) },
  ], 16, S + 3);
  if (report.prev.income > 0) {
    const pct = ((report.totals.income - report.prev.income) / report.prev.income) * 100;
    center(`Variação da receita face ao período anterior: ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% (anterior: ${formatAOA(report.prev.income)})`, Math.max(7, S - 1), "italic", GRAY, 2);
  }

  const ins = inRange.filter((t) => t.type === "in");

  /* ---- Dados: máquinas (Game House) ou produtos (Outras vendas) ---- */
  const rows: { label: string; c1: string; c2: string; v: number }[] = [];
  let totQ1 = 0, totQ2 = 0;
  if (scope === "house") {
    const mach = new Map<string, { n: number; ext: number; v: number }>();
    let recN = 0, recV = 0, manN = 0, manV = 0;
    for (const t of ins) {
      if (t.category === "sessao" || t.category === "extensao") {
        const m =
          t.category === "sessao"
            ? /^Sess[ãa]o:\s*(.+?)\s*\(/.exec(t.label) ?? /^Sess[ãa]o:\s*(.+)$/.exec(t.label)
            : /min:\s*(.+)$/.exec(t.label);
        const name = (m ? m[1] : "Sem máquina").trim();
        const e = mach.get(name) ?? { n: 0, ext: 0, v: 0 };
        if (t.category === "sessao") e.n++;
        else e.ext++;
        e.v += t.value;
        mach.set(name, e);
      } else if (t.category === "recarga") {
        recN++;
        recV += t.value;
      } else {
        manN++;
        manV += t.value;
      }
    }
    const names = [...mach.keys()].sort((p, q) => p.localeCompare(q, "pt", { numeric: true }));
    for (const nm of names) {
      const e = mach.get(nm)!;
      rows.push({ label: nm, c1: String(e.n), c2: String(e.ext), v: e.v });
      totQ1 += e.n;
      totQ2 += e.ext;
    }
    if (recN > 0) rows.push({ label: "Recargas de saldo", c1: String(recN), c2: "-", v: recV });
    if (manN > 0) rows.push({ label: "Entradas manuais", c1: String(manN), c2: "-", v: manV });
  } else {
    const prod = new Map<string, { kind: string; q: number; v: number }>();
    let manN = 0, manV = 0;
    for (const t of ins) {
      const m = /^(Venda|Servi[çc]o):\s*([\d.,]+)\s*x\s*(.+)$/.exec(t.label);
      if (m) {
        const name = m[3].trim();
        const e = prod.get(name) ?? { kind: m[1] === "Venda" ? "Produto" : "Serviço", q: 0, v: 0 };
        e.q += parseFloat(m[2].replace(",", ".")) || 0;
        e.v += t.value;
        prod.set(name, e);
      } else {
        manN++;
        manV += t.value;
      }
    }
    const names = [...prod.keys()].sort((p, q) => prod.get(q)!.v - prod.get(p)!.v);
    for (const nm of names) {
      const e = prod.get(nm)!;
      rows.push({ label: nm, c1: e.kind, c2: String(e.q), v: e.v });
      totQ2 += e.q;
    }
    if (manN > 0) rows.push({ label: "Entradas manuais", c1: "-", c2: String(manN), v: manV });
  }
  const rowsTotal = rows.reduce((s, x) => s + x.v, 0);

  /* ---- Dados: funcionários ---- */
  const staffMap = new Map<string, { n: number; inc: number; first: number; last: number; days: Set<string> }>();
  for (const t of inRange) {
    const k = t.actorName || "Sem registo";
    const e = staffMap.get(k) ?? { n: 0, inc: 0, first: t.ts, last: t.ts, days: new Set<string>() };
    e.n++;
    if (t.type === "in") e.inc += t.value;
    e.first = Math.min(e.first, t.ts);
    e.last = Math.max(e.last, t.ts);
    e.days.add(new Date(t.ts).toDateString());
    staffMap.set(k, e);
  }
  const staffRows: string[][] = [...staffMap.entries()].map(([nm, e]) => {
    const mine = shifts.filter((x) => x.actorName === nm && x.start >= report.from.getTime() && x.start < report.to.getTime()).sort((p, q) => p.start - q.start);
    const worked = mine.reduce((sum, x) => sum + ((x.end ?? x.start) - x.start), 0);
    const wh = `${Math.floor(worked / 3600000)}h${pad2(Math.round((worked % 3600000) / 60000))}`;
    let act = report.kind === "day" ? `${hm(e.first)} - ${hm(e.last)}` : String(e.days.size);
    if (mine.length > 0) {
      const lastEnd = mine[mine.length - 1].end;
      act = report.kind === "day" ? `${hm(mine[0].start)} - ${lastEnd ? hm(lastEnd) : "em curso"} (${wh})` : `${wh} em ${mine.length} turno(s)`;
    }
    return [nm, String(e.n), formatAOA(e.inc), act];
  });

  /* ---- Elementos visuais dos modelos ---- */
  const dots = (label: string, value: string, bold = false) => {
    font(bold ? "bold" : "normal", TS);
    ensure(lh(TS) + 1);
    const v = T(value);
    const vw = doc.getTextWidth(v) as number;
    const lbl = (doc.splitTextToSize(T(label), CW - vw - 8) as string[])[0];
    const base = y + TS * 0.3528;
    doc.text(lbl, M, base);
    doc.text(v, W - M, base, { align: "right" });
    const lw = doc.getTextWidth(lbl) as number;
    if (W - M - vw - 2 > M + lw + 2) {
      stroke([190, 190, 190], 0.2);
      doc.setLineDashPattern([0.4, 1], 0);
      doc.line(M + lw + 2, base, W - M - vw - 2, base);
      doc.setLineDashPattern([], 0);
    }
    y += lh(TS) + 0.8;
  };
  const bars = (items: { label: string; v: number }[]) => {
    const max = Math.max(1, ...items.map((it) => it.v));
    const labW = 52, valW = 40;
    const bx = M + labW, bw = CW - labW - valW;
    items.forEach((it) => {
      ensure(9);
      font("normal", TS);
      const lbl = (doc.splitTextToSize(T(it.label), labW - 2) as string[])[0];
      doc.text(lbl, M, y + 5.2);
      fill(tint(accent, 0.18), bx, y + 1.6, bw, 4.6);
      fill(accent, bx, y + 1.6, Math.max(0.6, (bw * Math.max(0, it.v)) / max), 4.6);
      font("bold", TS);
      doc.text(T(formatAOA(it.v)), W - M, y + 5.2, { align: "right" });
      y += 8;
    });
    y += 2;
  };
  const columns = (items: { label: string; v: number }[]) => {
    const HH = 38;
    ensure(HH + 14);
    const cnt = Math.max(1, items.length);
    const cw = CW / cnt;
    const max = Math.max(1, ...items.map((it) => it.v));
    const base = y + HH;
    stroke([200, 200, 200], 0.25);
    doc.line(M, base, W - M, base);
    items.forEach((it, i) => {
      const hh = Math.max(0, (HH - 6) * (it.v / max));
      const bw = Math.min(14, cw * 0.62);
      if (hh > 0) fill(accent, M + i * cw + (cw - bw) / 2, base - hh, bw, hh);
      if (cnt <= 12 || i % 2 === 0) {
        font("normal", Math.max(6, TS - 2), GRAY);
        doc.text(T(it.label), M + i * cw + cw / 2, base + 4, { align: "center" });
      }
    });
    y = base + 8;
  };
  const when = (t: Transaction) => {
    const d = new Date(t.ts);
    return report.kind === "day" ? hm(t.ts) : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hm(t.ts)}`;
  };

  /* ---- Secções ---- */
  const showRows = () => {
    section(scope === "house" ? "Valor trabalhado por máquina" : "Vendido por produto / serviço");
    if (rows.length === 0) {
      center(scope === "house" ? "Sem movimentos neste período." : "Sem vendas neste período.", S, "italic", GRAY);
      return;
    }
    if (layout === "graficos") {
      bars(rows.map((x) => ({ label: x.label, v: x.v })));
    } else if (layout === "lista") {
      rows.forEach((x) => dots(scope === "house" ? (x.c2 === "-" ? `${x.label}  (${x.c1} mov.)` : `${x.label}  (${x.c1} sessões)`) : `${x.label}  x${x.c2}`, formatAOA(x.v)));
      dots("TOTAL", formatAOA(rowsTotal), true);
      y += 2;
    } else {
      const body = rows.map((x) => [x.label, x.c1, x.c2, formatAOA(x.v)]);
      body.push(scope === "house" ? ["TOTAL", String(totQ1), String(totQ2), formatAOA(rowsTotal)] : ["TOTAL", "", String(totQ2), formatAOA(rowsTotal)]);
      table(
        scope === "house" ? [66, 26, 30, 56] : [76, 28, 24, 54],
        scope === "house" ? ["Máquina", "Sessões", "Extensões", "Valor trabalhado"] : ["Produto / Serviço", "Tipo", "Qtd", "Valor"],
        body,
        true
      );
    }
  };
  const showStaff = () => {
    if (staffRows.length === 0) return;
    section("Por funcionário");
    if (layout === "lista") staffRows.forEach((x) => dots(`${x[0]}  (${x[1]} mov.)  ${x[3]}`, x[2]));
    else table([56, 28, 50, 48], ["Funcionário", "Movimentos", "Receita", report.kind === "day" ? "Atividade" : "Horas / dias"], staffRows);
  };
  const showPeriod = () => {
    section(report.kind === "day" ? "Receita por hora" : report.kind === "week" ? "Receita por dia da semana" : report.kind === "month" ? "Receita por semana" : "Receita por mês");
    if (layout === "graficos") {
      columns(report.buckets.map((b) => ({ label: b.label, v: b.income })));
      return;
    }
    const bk = report.kind === "day" ? report.buckets.filter((b) => b.income > 0 || b.expense > 0) : report.buckets;
    if (bk.length === 0) {
      center("Sem movimentos neste período.", S, "italic", GRAY);
      return;
    }
    const nm = (b: (typeof bk)[number]) => (report.kind === "day" ? b.label : `${b.label}${b.sub ? ` (${b.sub})` : ""}`);
    if (layout === "lista") {
      bk.forEach((b) => dots(nm(b), formatAOA(b.income)));
      dots("TOTAL", formatAOA(report.totals.income), true);
      y += 2;
    } else {
      const body = bk.map((b) => [nm(b), formatAOA(b.income), formatAOA(b.expense), formatAOA(b.income - b.expense)]);
      body.push(["TOTAL", formatAOA(report.totals.income), formatAOA(report.totals.expense), formatAOA(report.totals.net)]);
      table([46, 44, 44, 44], ["Período", "Receita", "Despesas", "Saldo"], body, true);
    }
  };
  const showMoves = () => {
    section("Movimentos");
    if (inRange.length === 0) {
      center("Sem movimentos registados.", S, "italic", GRAY);
      return;
    }
    const LIMIT = layout === "lista" ? 60 : 80;
    const part = inRange.slice(0, LIMIT);
    if (layout === "lista") {
      part.forEach((t) => dots(`${when(t)}  ${t.label}`, `${t.type === "in" ? "+" : "-"} ${formatAOA(t.value)}`));
    } else {
      table(
        [30, 78, 20, 44],
        ["Data / Hora", "Descrição", "Tipo", "Valor"],
        part.map((t) => [when(t), `${t.label} ${t.detail}`.trim(), t.type === "in" ? "Entrada" : "Saída", `${t.type === "in" ? "+" : "-"} ${formatAOA(t.value)}`])
      );
    }
    if (inRange.length > LIMIT) center(`... e mais ${inRange.length - LIMIT} movimentos (consulte a app para o detalhe completo).`, Math.max(7, S - 1), "italic", GRAY);
  };

  /* ---- Estrutura de cada modelo ---- */
  if (layout === "resumo") {
    showRows();
    showStaff();
  } else if (layout === "graficos") {
    showRows();
    showPeriod();
    showStaff();
  } else {
    showRows();
    showStaff();
    showPeriod();
    showMoves();
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    fill(accent, 0, 0, W, 4);
    fill(accent, 0, H - 4, W, 2);
    fill([0, 0, 0], 0, H - 2, W, 2);
    stroke([170, 170, 170], 0.25);
    doc.line(M, H - 17, W - M, H - 17);
    font("normal", Math.max(7, S - 3), GRAY);
    const house = brand.length > 46 ? `${brand.slice(0, 44)}...` : brand;
    doc.text(T(`${house} - Gerado em ${fmtDate(now)} às ${fmtTime(now)}`), CX, H - 12, { align: "center" });
    doc.text(T(`Página ${i} de ${n}`), CX, H - 8, { align: "center" });
  }
  return doc;
}
