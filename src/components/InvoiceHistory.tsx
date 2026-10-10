import { useMemo, useState } from "react";
import { FileText, Search, Share2, Download } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Invoice } from "../lib/types";
import { createInvoicePdf, downloadInvoicePdf } from "../lib/invoicePdf";
import { formatAOA } from "../lib/format";

interface Props {
  invoices: Invoice[];
  onlyActorId: string | null;
  houseName: string;
}

export default function InvoiceHistory({ invoices, onlyActorId, houseName }: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (invoices ?? [])
      .filter((i) => onlyActorId === null || i.actorId === onlyActorId)
      .filter((i) => !q || [i.number, i.customer, i.actorName, i.method].some((v) => String(v ?? "").toLocaleLowerCase().includes(q)))
      .sort((a, b) => b.ts - a.ts);
  }, [invoices, onlyActorId, query]);

  const makePdf = async (invoice: Invoice, format: "a4" | "thermal", share: boolean) => {
    const key = invoice.number + format + (share ? "share" : "save");
    setBusy(key);
    setError("");
    try {
      const blob = await createInvoicePdf({
        number: invoice.number,
        ts: invoice.ts,
        customer: invoice.customer,
        method: invoice.method,
        actorName: invoice.actorName,
        lines: invoice.lines,
        total: invoice.total,
        houseName: houseName || "CJ Gerenciamento",
      }, format);

      const filename = invoice.number + (format === "a4" ? "-A4.pdf" : "-termica.pdf");

      if (Capacitor.isNativePlatform()) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(reader.error ?? new Error("Não foi possível preparar o PDF."));
          reader.readAsDataURL(blob);
        });
        const saved = await Filesystem.writeFile({
          path: filename,
          data: dataUrl,
          directory: Directory.Cache,
          recursive: true,
        });
        if (share) {
          await Share.share({
            title: "Fatura " + invoice.number,
            text: "Fatura " + invoice.number + " • CrisJoséGamers",
            url: saved.uri,
            dialogTitle: "Partilhar fatura",
          });
        } else {
          await Share.share({
            title: filename,
            text: "PDF da fatura " + invoice.number,
            url: saved.uri,
            dialogTitle: "Abrir ou guardar PDF",
          });
        }
      } else if (share && typeof navigator.share === "function" && typeof File !== "undefined" && navigator.canShare?.({ files: [new File([blob], filename, { type: "application/pdf" })] })) {
        const file = new File([blob], filename, { type: "application/pdf" });
        await navigator.share({ title: "Fatura " + invoice.number, files: [file] });
      } else {
        await downloadInvoicePdf({
          number: invoice.number,
          ts: invoice.ts,
          customer: invoice.customer,
          method: invoice.method,
          actorName: invoice.actorName,
          lines: invoice.lines,
          total: invoice.total,
          houseName: houseName || "CJ Gerenciamento",
        }, format);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar ou partilhar o PDF.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-[#00E5FF]/25 bg-[#161616] p-3">
        <p className="font-display text-[15px] font-extrabold uppercase text-[#00E5FF]">Histórico de faturas</p>
        <p className="mt-1 text-[11px] text-neutral-500">Consultar, gerar PDF e partilhar • sem registar outra venda</p>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e1e1e] px-3">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar número, cliente ou responsável" className="w-full bg-transparent py-3 text-[12px] outline-none" />
        </label>
      </div>

      {error && <p className="rounded-xl border border-[#FF4D6D]/30 bg-[#FF4D6D]/10 p-3 text-[12px] text-[#FF879A]">{error}</p>}
      {visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-7 text-center text-[12px] text-neutral-500">{query ? "Nenhuma fatura corresponde à pesquisa." : "Ainda não existem faturas guardadas neste histórico."}</p>}

      {visible.map((invoice) => (
        <article key={invoice.number} className="rounded-xl border border-white/10 bg-[#1b1b1b] p-3">
          <div className="flex items-start gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#00FF88]/10 text-[#00FF88]"><FileText size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="break-all font-display text-[13px] font-extrabold text-[#00FF88]">{invoice.number}</p>
              <p className="mt-1 text-[11px] text-neutral-300">{new Date(invoice.ts).toLocaleString("pt-PT")}</p>
              <p className="mt-1 truncate text-[12px] text-neutral-200">Cliente: {invoice.customer || "Cliente geral"}</p>
              <p className="text-[11px] text-neutral-500">{invoice.method} • {invoice.actorName}</p>
            </div>
            <p className="shrink-0 text-right font-display text-[13px] font-extrabold">{formatAOA(invoice.total)}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button disabled={!!busy} onClick={() => void makePdf(invoice, "a4", false)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#00E5FF]/30 bg-[#00E5FF]/10 py-2.5 text-[11px] font-extrabold text-[#00E5FF] disabled:opacity-50">
              <Download size={13} /> {busy === invoice.number + "a4save" ? "A preparar…" : "PDF A4"}
            </button>
            <button disabled={!!busy} onClick={() => void makePdf(invoice, "thermal", false)} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2.5 text-[11px] font-extrabold disabled:opacity-50">
              <Download size={13} /> {busy === invoice.number + "thermalsave" ? "A preparar…" : "PDF térmico"}
            </button>
            <button disabled={!!busy} onClick={() => void makePdf(invoice, "a4", true)} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#00FF88] py-2.5 text-[11px] font-extrabold text-black disabled:opacity-50">
              <Share2 size={13} /> Partilhar A4
            </button>
            <button disabled={!!busy} onClick={() => void makePdf(invoice, "thermal", true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 py-2.5 text-[11px] font-extrabold text-[#00FF88] disabled:opacity-50">
              <Share2 size={13} /> Partilhar térmica
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
