import { useState } from "react";
import { Download, Eye, FileText, Minus, Plus, Send, Share2 } from "lucide-react";
import Sheet from "./Sheet";
import { ErrorBox, labelCls, fieldCls } from "./ui";
import type { Config, PdfCaseKey, PdfFontKey, Tone, Transaction } from "../lib/types";
import type { Report } from "../lib/reports";
import { buildReportPdf, dayName, fmtDate, fmtTime, kindLabels, pdfFileName, reportSummaryText } from "../lib/pdf";
import { formatAOAshort } from "../lib/format";
import { cn } from "../utils/cn";

interface Props {
  config: Config;
  report: Report | null;
  txs: Transaction[];
  onPatch: (p: Partial<Config>) => void;
  /** funcionário: usa o número do proprietário e não altera as definições da casa */
  staffName?: string;
  /** relatório só com os movimentos deste funcionário */
  ownCash?: boolean;
  notify: (title: string, desc?: string, tone?: Tone) => void;
  toast: (title: string, desc?: string, tone?: Tone) => void;
  onClose: () => void;
}

const fonts: { id: PdfFontKey; name: string; sub: string; css: string }[] = [
  { id: "times", name: "Times New Roman", sub: "Romano", css: '"Times New Roman", Times, serif' },
  { id: "helvetica", name: "Arial / Helvetica", sub: "Moderna", css: "Arial, Helvetica, sans-serif" },
  { id: "courier", name: "Courier", sub: "Máquina de escrever", css: '"Courier New", Courier, monospace' },
];

const cases: { id: PdfCaseKey; label: string; emoji: string }[] = [
  { id: "normal", label: "Normal", emoji: "Aa" },
  { id: "upper", label: "MAIÚSCULAS", emoji: "🔠" },
  { id: "lower", label: "minúsculas", emoji: "🔡" },
  { id: "title", label: "Título", emoji: "Ab" },
];

const ddis = [
  { v: "+244", l: "AO +244" }, { v: "+55", l: "BR +55" }, { v: "+351", l: "PT +351" },
  { v: "+258", l: "MZ +258" }, { v: "+238", l: "CV +238" }, { v: "+1", l: "US +1" },
];

const sizes = [9, 10, 11, 12, 13, 14];

export default function PdfShareSheet({ config, report, txs, onPatch: patchHouse, staffName, ownCash, notify, toast, onClose }: Props) {
  const [err, setErr] = useState("");
  const [localNum, setLocalNum] = useState(config.waNumber);
  const [localDdi, setLocalDdi] = useState(config.waDdi);
  const staff = !!staffName;
  const who = ownCash ? staffName : undefined;
  const onPatch = (p: Partial<Config>) => {
    if (!staff) return patchHouse(p);
    if (p.waNumber !== undefined) setLocalNum(p.waNumber);
    if (p.waDdi !== undefined) setLocalDdi(p.waDdi);
  };
  const waNumber = staff ? localNum : config.waNumber;
  const waDdi = staff ? localDdi : config.waDdi;

  const font = fonts.find((f) => f.id === config.pdfFont) ?? fonts[0];
  const now = new Date();

  const waDigits = (): string => {
    const raw = waNumber.trim();
    if (!raw) return "";
    if (raw.startsWith("+")) return raw.replace(/\D/g, "");
    const local = raw.replace(/\D/g, "").replace(/^0+/, "");
    return waDdi.replace(/\D/g, "") + local;
  };
  const digits = waDigits();
  const validNumber = digits.length >= 9 && digits.length <= 15;
  const pretty = digits ? `+${digits}` : "";

  const make = () => {
    if (!report) throw new Error("sem relatório");
    const stamp = new Date();
    const doc = buildReportPdf({
      report, txs, config, now: stamp, who,
      opts: { font: config.pdfFont, size: config.pdfSize, textCase: config.pdfCase },
    });
    return { doc, stamp, name: pdfFileName(config.houseName, report) };
  };

  const setSize = (n: number) => onPatch({ pdfSize: Math.min(16, Math.max(8, n)) });

  const download = () => {
    try {
      const { doc, name } = make();
      doc.save(name);
      toast("PDF guardado", name, "green");
      setErr("");
    } catch {
      setErr("Não foi possível gerar o PDF. Tente novamente.");
    }
  };

  const preview = () => {
    try {
      const { doc } = make();
      const url = URL.createObjectURL(doc.output("blob"));
      const w = window.open(url, "_blank");
      if (!w) { doc.save(pdfFileName(config.houseName, report as Report)); toast("PDF guardado", "O navegador bloqueou a pré-visualização.", "amber"); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setErr("");
    } catch {
      setErr("Não foi possível gerar o PDF.");
    }
  };

  /** Abre a partilha do telemóvel com o PDF já anexado (escolha o WhatsApp). */
  const shareFile = async (): Promise<"shared" | "cancelled" | "unsupported"> => {
    const { doc, stamp, name } = make();
    const file = new File([doc.output("blob")], name, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (!nav.share || !nav.canShare || !nav.canShare({ files: [file] })) return "unsupported";
    try {
      await nav.share({ files: [file], title: `${config.houseName} - ${kindLabels[report!.kind]}`, text: reportSummaryText(report!, config, stamp, who) });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
      return "unsupported";
    }
  };

  /** Botão principal: envia o PDF. Se o aparelho não deixar anexar, guarda o PDF e abre a conversa. */
  const sendWhatsApp = async () => {
    if (!report) return;
    setErr("");
    try {
      const r = await shareFile();
      if (r === "shared") return notify("PDF pronto para enviar", "Escolha o WhatsApp e o contacto na lista.", "green");
      if (r === "cancelled") return;
      if (!validNumber) return setErr("Este aparelho não anexa o PDF automaticamente. Escreva o número do destinatário para abrir a conversa.");
      const { doc, stamp, name } = make();
      doc.save(name);
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(reportSummaryText(report, config, stamp, who))}`;
      const w = window.open(url, "_blank");
      if (!w) window.location.href = url;
      toast("PDF guardado", "Na conversa do WhatsApp toque em 📎 → Documento e escolha o PDF.", "amber");
    } catch {
      setErr("Não foi possível preparar o PDF. Tente novamente.");
    }
  };

  /** Só o texto, sem PDF (para quem quer uma mensagem rápida). */
  const sendTextOnly = () => {
    if (!report) return;
    if (!validNumber) return setErr("Escreva o número de WhatsApp do destinatário (ex: 923 000 000).");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(reportSummaryText(report, config, new Date(), who))}`;
    const w = window.open(url, "_blank");
    if (!w) window.location.href = url;
    setErr("");
  };

  const sampleStyle: React.CSSProperties = {
    fontFamily: font.css,
    fontSize: `${config.pdfSize * 1.3}px`,
    textTransform: config.pdfCase === "upper" ? "uppercase" : config.pdfCase === "lower" ? "lowercase" : config.pdfCase === "title" ? "capitalize" : "none",
    color: "#111",
    textAlign: "center",
    lineHeight: 1.35,
  };

  return (
    <Sheet z={60} title="Relatório em PDF" subtitle="Formato A4, tudo centralizado, com dia, data, hora e nome da Game House." accent="#00FF88" onClose={onClose}>
      <div className="space-y-4">
        {report ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/[0.06] p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00E5FF]/15 text-[#00E5FF]"><FileText size={19} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{kindLabels[report.kind]} • {report.title}</p>
              <p className="text-[11.5px] text-neutral-400">Receita {formatAOAshort(report.totals.income)} • Lucro {formatAOAshort(report.totals.net)}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 p-3 text-center text-[12.5px] text-neutral-500">Abra um relatório em Finanças → Ver Relatórios para o enviar.</p>
        )}

        {/* Número */}
        <div>
          <span className={labelCls}>Número de WhatsApp do destinatário</span>
          <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#252525] transition focus-within:border-[#00FF88]">
            <select value={waDdi} onChange={(e) => onPatch({ waDdi: e.target.value })} className="appearance-none border-r border-white/10 bg-[#2e2e2e] px-3 text-[13px] font-bold outline-none">
              {ddis.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
            <input value={waNumber} onChange={(e) => onPatch({ waNumber: e.target.value })} inputMode="tel" placeholder="923 000 000" className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none" />
          </div>
          <p className={cn("mt-1 text-[11px] font-semibold", validNumber ? "text-[#00FF88]" : "text-neutral-500")}>{validNumber ? `Será enviado para ${pretty}` : "Escreva o número com ou sem o indicativo."}</p>
        </div>

        {/* Tipo de letra */}
        {!staff && <div>
          <span className={labelCls}>Tipo de letra</span>
          <div className="grid grid-cols-3 gap-1.5">
            {fonts.map((f) => (
              <button key={f.id} onClick={() => onPatch({ pdfFont: f.id })} className={cn("rounded-xl border px-1.5 py-2 text-center transition active:scale-95", config.pdfFont === f.id ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-400")}>
                <span className="block text-[15px] font-bold leading-tight" style={{ fontFamily: f.css }}>Aa Bb</span>
                <span className="block text-[10px] font-bold leading-tight">{f.name}</span>
                <span className="block text-[9.5px] opacity-70">{f.sub}</span>
              </button>
            ))}
          </div>
        </div>}

        {/* Tamanho */}
        {!staff && <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={`${labelCls} !mb-0`}>Tamanho da letra</span>
            <span className="text-[11px] font-bold text-neutral-500">Padrão: 11</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSize(config.pdfSize - 1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 active:scale-90" aria-label="Diminuir"><Minus size={16} /></button>
            <input type="range" min={8} max={16} step={1} value={config.pdfSize} onChange={(e) => setSize(Number(e.target.value))} className="h-2 flex-1 accent-[#00FF88]" />
            <button onClick={() => setSize(config.pdfSize + 1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 active:scale-90" aria-label="Aumentar"><Plus size={16} /></button>
            <input value={config.pdfSize} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); if (!isNaN(n)) setSize(n); }} inputMode="numeric" className={`${fieldCls} !w-14 text-center font-display text-[18px] font-extrabold`} />
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {sizes.map((s) => (
              <button key={s} onClick={() => setSize(s)} className={cn("flex-1 rounded-lg border py-1 text-[11px] font-extrabold", config.pdfSize === s ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-500")}>{s}</button>
            ))}
          </div>
        </div>}

        {/* Maiúsculas/minúsculas */}
        {!staff && <div>
          <span className={labelCls}>Estilo das letras</span>
          <div className="grid grid-cols-4 gap-1.5">
            {cases.map((c) => (
              <button key={c.id} onClick={() => onPatch({ pdfCase: c.id })} className={cn("rounded-xl border px-1 py-2 text-center transition active:scale-95", config.pdfCase === c.id ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-400")}>
                <span className="block text-[17px] leading-tight">{c.emoji}</span>
                <span className="block text-[9.5px] font-bold leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>}

        {/* Pré-visualização */}
        <div>
          <span className={labelCls}>Pré-visualização (A4)</span>
          <div className="rounded-lg bg-white px-3 py-4 shadow-inner" style={sampleStyle}>
            <div style={{ fontWeight: 700, fontSize: "1.45em" }}>{config.houseName || "Game House"}</div>
            <div style={{ color: "#006f84", fontWeight: 700 }}>Relatório Financeiro</div>
            <div style={{ marginTop: 6, borderTop: "1px solid #bbb", paddingTop: 6 }}>
              {dayName(now)} • {fmtDate(now)} • {fmtTime(now)}
            </div>
            <div style={{ fontSize: "0.85em", color: "#555" }}>{report ? `${kindLabels[report.kind]}: ${report.title}` : "Relatório Diário"}</div>
          </div>
        </div>

        <ErrorBox msg={err} />

        <div className="space-y-2">
          <button onClick={() => void sendWhatsApp()} disabled={!report} className="neon-btn-green flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black transition active:scale-[0.98] disabled:opacity-40">
            <Send size={16} /> Enviar PDF no WhatsApp
          </button>
          <button onClick={sendTextOnly} disabled={!report} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-[12px] font-bold text-neutral-300 transition active:scale-[0.98] disabled:opacity-40">
            <Share2 size={15} /> Só a mensagem de texto (sem PDF)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={preview} disabled={!report} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-[12px] font-bold text-neutral-200 active:scale-95 disabled:opacity-40"><Eye size={14} /> Pré-visualizar</button>
            <button onClick={download} disabled={!report} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-[12px] font-bold text-neutral-200 active:scale-95 disabled:opacity-40"><Download size={14} /> Descarregar</button>
          </div>
        </div>

        <p className="rounded-xl bg-white/[0.04] p-3 text-[11px] leading-relaxed text-neutral-400">
          <b className="text-neutral-200">Como funciona:</b> “Enviar PDF no WhatsApp” cria o PDF A4 e abre a lista de partilha do telemóvel com o ficheiro já anexado: escolha o WhatsApp e o contacto. Se o aparelho não permitir, o PDF é guardado e abre-se a conversa do número escrito acima, para anexar o ficheiro em 📎 → Documento.
        </p>
      </div>
    </Sheet>
  );
}
