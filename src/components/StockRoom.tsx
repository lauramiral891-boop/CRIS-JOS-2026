import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Link2, Package, Plus, Search, Trash2 } from "lucide-react";
import Sheet from "./Sheet";
import { ErrorBox, Field, fieldCls } from "./ui";
import type { InventoryItem, SaleItem, StockMove, StockReason } from "../lib/types";
import { clockHM, formatAOAshort, timeAgo } from "../lib/format";
import { cn } from "../utils/cn";

type OnMove = (
  itemId: number, kind: "in" | "out", reason: StockReason, qty: number,
  o?: { unitCost?: number; note?: string; asExpense?: boolean }
) => string | null;

const REASON: Record<StockReason, { label: string; short: string; tone: string }> = {
  inicial: { label: "Stock inicial", short: "Inicial", tone: "text-[#00E5FF] bg-[#00E5FF]/10" },
  compra: { label: "Entrada (compra)", short: "Compra", tone: "text-[#00FF88] bg-[#00FF88]/10" },
  venda: { label: "Venda (automática)", short: "Venda", tone: "text-[#FFC107] bg-[#FFC107]/10" },
  consumo: { label: "Alimentação da equipa", short: "Alimentação", tone: "text-orange-300 bg-orange-500/10" },
  despesa: { label: "Despesa da Game House", short: "Despesa", tone: "text-[#B388FF] bg-[#B388FF]/10" },
  perda: { label: "Perda / estragado", short: "Perda", tone: "text-[#FF8FA3] bg-[#FF4D6D]/10" },
  ajuste: { label: "Ajuste de contagem", short: "Ajuste", tone: "text-neutral-300 bg-white/10" },
};
const OUT_REASONS: StockReason[] = ["consumo", "despesa", "perda", "ajuste"];
const num = (v: string) => Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0);

type TabId = "items" | "moves" | "sum";
type Act = { item: InventoryItem; kind: "in" | "out" } | null;

export default function StockRoom({ items, moves, catalog, now, onCreate, onMove, onRemove, onClose }: {
  items: InventoryItem[]; moves: StockMove[]; catalog: SaleItem[]; now: number;
  onCreate: (name: string, stock: number, min: number, unit?: string, cost?: number) => void;
  onMove: OnMove; onRemove: (id: number) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("items");
  const [q, setQ] = useState("");
  const [act, setAct] = useState<Act>(null);
  const [adding, setAdding] = useState(false);

  const linked = useMemo(() => new Set(catalog.map((c) => c.invId).filter((x): x is number => !!x)), [catalog]);
  const list = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));
  const low = items.filter((i) => i.stock <= i.min).length;
  const worth = items.reduce((a, i) => a + i.stock * (i.cost ?? 0), 0);

  const tabs: [TabId, string][] = [["items", "Itens"], ["moves", "Movimentos"], ["sum", "Resumo"]];
  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar"><ArrowLeft size={17} /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FF9A3C] to-[#FF7A1A] text-black"><Package size={21} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[20px] font-extrabold uppercase leading-none">Sala de Stock</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-neutral-400">{items.length} iten(s){low > 0 ? <span className="text-orange-400"> • {low} em baixo</span> : ""}{worth > 0 ? ` • ${formatAOAshort(worth)} em stock` : ""}</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-2 text-[11.5px] font-extrabold uppercase text-black active:scale-95"><Plus size={13} /> Item</button>
      </div>

      <div className="flex gap-1.5 border-b border-white/[0.06] px-3 py-2">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("flex-1 rounded-full py-1.5 text-[12.5px] font-bold", tab === id ? "bg-[#00E5FF] text-black" : "bg-white/[0.06] text-neutral-300")}>{label}</button>
        ))}
      </div>

      {tab === "items" && (
        <div className="thin-scroll flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {items.length > 4 && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar item…" className={cn(fieldCls, "pl-9")} />
            </div>
          )}
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
              <Package size={28} className="mx-auto text-neutral-600" />
              <p className="mt-2 text-[13px] font-semibold">A Sala de Stock está vazia</p>
              <p className="mt-1 text-[12px] text-neutral-500">Adicione bebidas, snacks, papel, comandos… As vendas descontam sozinhas e pode registar entradas e saídas.</p>
              <button onClick={() => setAdding(true)} className="mt-3 rounded-xl bg-orange-500 px-4 py-2.5 text-[12.5px] font-extrabold uppercase text-black">Adicionar o primeiro item</button>
            </div>
          )}
          {list.map((it) => {
            const isLow = it.stock <= it.min;
            return (
              <div key={it.id} className={cn("rounded-xl border bg-[#1e1e1e] p-3", isLow ? "border-orange-500/40" : "border-white/[0.07]")}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">{it.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500">
                      <span>Mínimo {it.min} {it.unit ?? "un"}</span>
                      {(it.cost ?? 0) > 0 && <span>Custo {formatAOAshort(it.cost!)}</span>}
                      {linked.has(it.id) && <span className="flex items-center gap-0.5 text-[#FFC107]"><Link2 size={10} /> ligado às vendas</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-display text-[26px] font-extrabold leading-none", isLow ? "text-orange-400" : "text-[#00FF88]")}>{it.stock}</p>
                    <p className="text-[10.5px] text-neutral-500">{it.unit ?? "un"}</p>
                  </div>
                </div>
                {isLow && <p className="mt-1.5 text-[11.5px] font-semibold text-orange-400">Stock baixo — reponha em breve.</p>}
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => setAct({ item: it, kind: "in" })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00FF88]/15 py-2 text-[12px] font-extrabold uppercase text-[#00FF88] active:scale-95"><ArrowDownToLine size={14} /> Entrada</button>
                  <button onClick={() => setAct({ item: it, kind: "out" })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500/15 py-2 text-[12px] font-extrabold uppercase text-orange-300 active:scale-95"><ArrowUpFromLine size={14} /> Saída</button>
                  <button onClick={() => onRemove(it.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Apagar item"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          {items.length > 0 && <p className="px-1 pt-1 text-[11px] leading-relaxed text-neutral-500">As <b className="text-neutral-300">vendas</b> descontam sozinhas os itens ligados no catálogo (em Vender → guardar no catálogo → «ligar ao inventário»). Use <b className="text-neutral-300">Saída</b> para alimentação, despesas da casa ou perdas.</p>}
        </div>
      )}

      {tab === "moves" && <Moves moves={moves} now={now} />}
      {tab === "sum" && <Summary items={items} moves={moves} />}

      {adding && <NewItem onClose={() => setAdding(false)} onCreate={(...a) => { onCreate(...a); setAdding(false); }} />}
      {act && <MoveForm act={act} onClose={() => setAct(null)} onMove={onMove} />}
    </div>
  );
}

/* ---------------- novo item ---------------- */
function NewItem({ onCreate, onClose }: { onCreate: (name: string, stock: number, min: number, unit?: string, cost?: number) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", unit: "un", stock: "", min: "", cost: "" });
  const [err, setErr] = useState("");
  const units = ["un", "cx", "pct", "kg", "l"];
  const save = () => {
    if (!f.name.trim()) return setErr("Indique o nome do item (ex.: Água 50cl).");
    onCreate(f.name.trim(), Math.floor(num(f.stock)), Math.floor(num(f.min)), f.unit, num(f.cost));
  };
  return (
    <Sheet title="Novo item" subtitle="Fica guardado na Sala de Stock" accent="#FF9A3C" onClose={onClose} z={60}>
      <div className="mt-3 space-y-2.5">
        <Field label="Nome"><input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(""); }} placeholder="Ex.: Refrigerante lata" className={fieldCls} /></Field>
        <div className="flex gap-1.5">
          {units.map((u) => <button key={u} onClick={() => setF({ ...f, unit: u })} className={cn("flex-1 rounded-lg py-2 text-[12px] font-bold", f.unit === u ? "bg-orange-500 text-black" : "bg-white/10")}>{u}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Quantidade agora"><input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="24" className={fieldCls} /></Field>
          <Field label="Avisar abaixo de"><input value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="6" className={fieldCls} /></Field>
        </div>
        <Field label="Custo de cada (AOA, opcional)" hint="Serve para ver quanto vale o stock e as saídas"><input value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" placeholder="150" className={fieldCls} /></Field>
        <ErrorBox msg={err} />
        <button onClick={save} className="w-full rounded-xl bg-orange-500 py-3 text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">Guardar item</button>
      </div>
    </Sheet>
  );
}

/* ---------------- entrada / saída ---------------- */
function MoveForm({ act, onMove, onClose }: { act: NonNullable<Act>; onMove: OnMove; onClose: () => void }) {
  const { item, kind } = act;
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<StockReason>(kind === "in" ? "compra" : "consumo");
  const [cost, setCost] = useState(item.cost ? String(item.cost) : "");
  const [asExp, setAsExp] = useState(true);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const q = Math.floor(num(qty));
  const unit = item.unit ?? "un";
  const total = kind === "in" ? Math.round(q * num(cost)) : 0;
  const save = () => {
    const e = onMove(item.id, kind, reason, q, { unitCost: kind === "in" ? num(cost) : undefined, note, asExpense: kind === "in" && asExp && num(cost) > 0 });
    if (e) return setErr(e);
    onClose();
  };
  return (
    <Sheet title={kind === "in" ? "Entrada de stock" : "Saída de stock"} subtitle={`${item.name} • agora ${item.stock} ${unit}`} accent={kind === "in" ? "#00FF88" : "#FF9A3C"} onClose={onClose} z={60}>
      <div className="mt-3 space-y-2.5">
        <Field label={`Quantidade (${unit})`}>
          <input value={qty} onChange={(e) => { setQty(e.target.value.replace(/\D/g, "")); setErr(""); }} inputMode="numeric" autoFocus placeholder="0" className={cn(fieldCls, "text-center font-display text-[26px] font-extrabold")} />
        </Field>
        {kind === "out" && (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Motivo da saída</p>
            <div className="grid grid-cols-2 gap-1.5">
              {OUT_REASONS.map((r) => <button key={r} onClick={() => setReason(r)} className={cn("rounded-lg px-2 py-2.5 text-[12px] font-bold", reason === r ? "bg-orange-500 text-black" : "bg-white/10")}>{REASON[r].label}</button>)}
            </div>
          </div>
        )}
        {kind === "in" && (
          <>
            <Field label="Custo de cada (AOA)" hint="Atualiza o custo do item"><input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0" className={fieldCls} /></Field>
            {num(cost) > 0 && q > 0 && (
              <label className="flex items-start gap-2.5 rounded-xl bg-white/[0.05] p-3 text-[12.5px]">
                <input type="checkbox" checked={asExp} onChange={(e) => setAsExp(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00FF88]" />
                <span>Registar <b>{formatAOAshort(total)}</b> como despesa na caixa (compra de stock).</span>
              </label>
            )}
          </>
        )}
        <Field label="Nota (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "in" ? "Ex.: comprado no mercado" : "Ex.: almoço da equipa"} className={fieldCls} /></Field>
        <ErrorBox msg={err} />
        <button disabled={q <= 0} onClick={save} className={cn("w-full rounded-xl py-3 text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98] disabled:opacity-40", kind === "in" ? "bg-[#00FF88]" : "bg-orange-500")}>
          {kind === "in" ? `Registar entrada de ${q || 0} ${unit}` : `Registar saída de ${q || 0} ${unit}`}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- movimentos ---------------- */
function Moves({ moves, now }: { moves: StockMove[]; now: number }) {
  const [f, setF] = useState<"all" | "in" | StockReason>("all");
  const chips: ["all" | "in" | StockReason, string][] = [["all", "Tudo"], ["in", "Entradas"], ["venda", "Vendas"], ["consumo", "Alimentação"], ["despesa", "Despesas"], ["perda", "Perdas"]];
  const list = moves.filter((m) => f === "all" || (f === "in" ? m.kind === "in" : m.reason === f)).slice(0, 150);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2">
        {chips.map(([id, label]) => <button key={id} onClick={() => setF(id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold", f === id ? "bg-[#00E5FF] text-black" : "bg-white/[0.06] text-neutral-300")}>{label}</button>)}
      </div>
      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-4">
        {list.length === 0 && <p className="pt-10 text-center text-[12.5px] text-neutral-500">Ainda sem movimentos.</p>}
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-white/[0.05] py-2.5">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", m.kind === "in" ? "bg-[#00FF88]/12 text-[#00FF88]" : "bg-orange-500/12 text-orange-300")}>
              {m.kind === "in" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{m.itemName}</p>
              <p className="truncate text-[11px] text-neutral-500"><span className={cn("mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase", REASON[m.reason].tone)}>{REASON[m.reason].short}</span>{m.actorName} • {clockHM(m.ts)} • {timeAgo(m.ts, now)}{m.note ? ` • ${m.note}` : ""}</p>
            </div>
            <div className="text-right">
              <p className={cn("font-display text-[18px] font-extrabold leading-none", m.kind === "in" ? "text-[#00FF88]" : "text-orange-300")}>{m.kind === "in" ? "+" : "−"}{m.qty}</p>
              <p className="text-[10.5px] text-neutral-500">{m.before} → {m.after}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- resumo por período ---------------- */
function Summary({ items, moves }: { items: InventoryItem[]; moves: StockMove[] }) {
  const [per, setPer] = useState<"day" | "week" | "month" | "all">("month");
  const start = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (per === "day") return d.getTime();
    if (per === "week") return d.getTime() - 6 * 86400000;
    if (per === "month") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return 0;
  }, [per]);
  const inRange = moves.filter((m) => m.ts >= start);
  const sum = (pred: (m: StockMove) => boolean) => {
    const l = inRange.filter(pred);
    return { n: l.length, value: l.reduce((a, m) => a + m.qty * m.unitCost, 0), qty: l.reduce((a, m) => a + m.qty, 0) };
  };
  const rows: { label: string; r: StockReason | "in"; tone: string; s: ReturnType<typeof sum> }[] = [
    { label: "Entradas (compras)", r: "in", tone: "text-[#00FF88]", s: sum((m) => m.kind === "in" && m.reason !== "inicial") },
    { label: "Saídas por venda", r: "venda", tone: "text-[#FFC107]", s: sum((m) => m.reason === "venda") },
    { label: "Alimentação da equipa", r: "consumo", tone: "text-orange-300", s: sum((m) => m.reason === "consumo") },
    { label: "Despesas da Game House", r: "despesa", tone: "text-[#B388FF]", s: sum((m) => m.reason === "despesa") },
    { label: "Perdas / estragado", r: "perda", tone: "text-[#FF8FA3]", s: sum((m) => m.reason === "perda") },
  ];
  const top = Object.values(inRange.filter((m) => m.kind === "out").reduce<Record<number, { name: string; qty: number; unit: string }>>((a, m) => {
    a[m.itemId] = { name: m.itemName, unit: m.unit, qty: (a[m.itemId]?.qty ?? 0) + m.qty }; return a;
  }, {})).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const pers: ["day" | "week" | "month" | "all", string][] = [["day", "Hoje"], ["week", "7 dias"], ["month", "Mês"], ["all", "Tudo"]];
  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className="flex gap-1.5">
        {pers.map(([id, l]) => <button key={id} onClick={() => setPer(id)} className={cn("flex-1 rounded-full py-1.5 text-[12.5px] font-bold", per === id ? "bg-[#FF9A3C] text-black" : "bg-white/[0.06] text-neutral-300")}>{l}</button>)}
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Valor em stock agora (ao custo)</p>
        <p className="font-display text-[28px] font-extrabold text-[#00FF88]">{formatAOAshort(items.reduce((a, i) => a + i.stock * (i.cost ?? 0), 0))}</p>
        <p className="text-[11px] text-neutral-500">Itens sem custo definido não entram na conta.</p>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5">
        {rows.map(({ label, tone, s }) => (
          <div key={label} className="flex items-center justify-between border-t border-white/[0.05] py-2.5 first:border-0 first:pt-0 last:pb-0">
            <div><p className="text-[13px] font-semibold">{label}</p><p className="text-[11px] text-neutral-500">{s.n} movimento(s) • {s.qty} un.</p></div>
            <p className={cn("font-display text-[18px] font-extrabold", tone)}>{formatAOAshort(Math.round(s.value))}</p>
          </div>
        ))}
        <p className="mt-2 text-[10.5px] text-neutral-500">Valores ao custo de cada item.</p>
      </div>
      {top.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Mais saídas no período</p>
          {top.map((t) => <div key={t.name} className="flex justify-between py-1 text-[13px]"><span className="truncate">{t.name}</span><b className="text-orange-300">{t.qty} {t.unit}</b></div>)}
        </div>
      )}
    </div>
  );
}
