import { useState } from "react";
import {
  ArrowLeft, Check, Minus, Package, Pencil, Plus, Receipt, ShoppingCart, Trash2, Wrench, X,
} from "lucide-react";
import Sheet from "./Sheet";
import { ErrorBox, fieldCls, labelCls } from "./ui";
import type { InventoryItem, SaleItem, SaleKind, Transaction } from "../lib/types";
import { clockHM, formatAOA, formatAOAshort } from "../lib/format";
import { addDays, sod } from "../lib/dates";
import { cn } from "../utils/cn";

export interface CartLine {
  key: string;
  name: string;
  kind: SaleKind;
  unitPrice: number;
  qty: number;
  invId?: number;
}

interface Props {
  catalog: SaleItem[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  now: number;
  onAddItem: (i: Omit<SaleItem, "id">) => void;
  onRemoveItem: (id: number) => void;
  onUpdatePrice: (id: number, price: number) => void;
  onCheckout: (lines: CartLine[], method: string, customer: string) => void;
  onClose: () => void;
  /** pode guardar itens no catálogo e mudar preços */
  canManage?: boolean;
  /** pode apagar itens do catálogo */
  canRemove?: boolean;
  /** funcionário: só vê as vendas que ele próprio registou (null = vê todas) */
  onlyActorId?: string | null;
}

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

const suggestions: { n: string; k: SaleKind }[] = [
  { n: "Bolachas", k: "produto" },
  { n: "Água", k: "produto" },
  { n: "Refrigerante", k: "produto" },
  { n: "Sumo", k: "produto" },
  { n: "Energético", k: "produto" },
  { n: "Gelado", k: "produto" },
  { n: "Salgado", k: "produto" },
  { n: "Cópias", k: "servico" },
  { n: "Impressão", k: "servico" },
  { n: "Trabalho escolar", k: "servico" },
  { n: "Digitalização", k: "servico" },
  { n: "Cópia a cores", k: "servico" },
  { n: "Plastificação", k: "servico" },
  { n: "Encadernação", k: "servico" },
];

const methods = ["Dinheiro", "Multicaixa", "Transferência"];

export default function SalesView({
  catalog, inventory, transactions, now, onAddItem, onRemoveItem, onUpdatePrice, onCheckout, onClose,
  canManage = true, canRemove = true, onlyActorId = null,
}: Props) {
  const [tab, setTab] = useState<"vender" | "hoje">("vender");
  const [kind, setKind] = useState<SaleKind>("produto");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [save, setSave] = useState(false);
  const [invId, setInvId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [filter, setFilter] = useState<"todos" | SaleKind>("todos");
  const [edit, setEdit] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [method, setMethod] = useState("Dinheiro");
  const [received, setReceived] = useState("");
  const [customer, setCustomer] = useState("");
  const [err, setErr] = useState("");
  const [cartErr, setCartErr] = useState("");
  const [done, setDone] = useState<{ total: number; change: number } | null>(null);

  const p = num(price);
  const q = Math.max(0, parseInt(qty || "0", 10) || 0);
  const calcTotal = round2(p * q);
  const cartTotal = round2(cart.reduce((s, l) => s + l.unitPrice * l.qty, 0));
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const mergeLine = (list: CartLine[], line: CartLine) => {
    const i = list.findIndex((l) => l.key === line.key);
    if (i === -1) return [...list, line];
    return list.map((l, k) => (k === i ? { ...l, qty: l.qty + line.qty } : l));
  };

  const addCalc = () => {
    if (!name.trim()) return setErr("Escreva o nome do produto ou serviço.");
    if (p <= 0) return setErr("Indique o preço unitário.");
    if (q <= 0) return setErr("Indique a quantidade.");
    const inv = save && kind === "produto" && invId ? Number(invId) : undefined;
    if (save && canManage) onAddItem({ name: name.trim(), kind, price: p, invId: inv ?? null });
    setCart((c) => mergeLine(c, { key: `c:${kind}:${name.trim().toLowerCase()}:${p}`, name: name.trim(), kind, unitPrice: p, qty: q, invId: inv }));
    setName(""); setPrice(""); setQty("1"); setSave(false); setInvId(""); setErr("");
  };

  const addFromCatalog = (it: SaleItem) => {
    setCart((c) => mergeLine(c, { key: `i:${it.id}`, name: it.name, kind: it.kind, unitPrice: it.price, qty: 1, invId: it.invId ?? undefined }));
    setDone(null);
  };

  const setLineQty = (key: string, nq: number) =>
    setCart((c) => (nq <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty: nq } : l))));

  const inCart = (it: SaleItem) => cart.find((l) => l.key === `i:${it.id}`)?.qty ?? 0;

  const rec = num(received);
  const change = method === "Dinheiro" && rec > 0 ? round2(rec - cartTotal) : 0;

  const conclude = () => {
    if (cart.length === 0) return;
    if (method === "Dinheiro" && received.trim() && rec < cartTotal) return setCartErr("O valor recebido é menor do que o total a pagar.");
    onCheckout(cart, method, customer.trim());
    setDone({ total: cartTotal, change: rec > cartTotal && method === "Dinheiro" ? round2(rec - cartTotal) : 0 });
    setCart([]); setShowCart(false); setReceived(""); setCustomer(""); setCartErr("");
  };

  const dayStart = sod(new Date(now)).getTime();
  const dayEnd = addDays(new Date(dayStart), 1).getTime();
  const sales = transactions
    .filter((t) => (t.category === "venda" || t.category === "servico") && t.ts >= dayStart && t.ts < dayEnd && (onlyActorId === null || t.actorId === onlyActorId))
    .sort((a, b) => b.ts - a.ts);
  const prodTotal = sales.filter((t) => t.category === "venda").reduce((s, t) => s + t.value, 0);
  const servTotal = sales.filter((t) => t.category === "servico").reduce((s, t) => s + t.value, 0);

  const shown = catalog.filter((c) => filter === "todos" || c.kind === filter);
  const invName = (id: number | null) => inventory.find((i) => i.id === id);

  return (
    <div className="fade absolute inset-0 z-50 flex flex-col bg-[#121212]">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[21px] font-extrabold uppercase leading-none">Vendas</h3>
          <p className="text-[11px] text-neutral-500">{onlyActorId === null ? "Produtos e serviços • preço × quantidade automático" : "As suas vendas • preço × quantidade automático"}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00FF88]/10 text-[#00FF88]"><ShoppingCart size={17} /></span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 px-4 py-3">
        {([["vender", "Vender"], ["hoje", `${onlyActorId === null ? "Vendas de hoje" : "As minhas vendas"} (${sales.length})`]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("rounded-xl border py-2 text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95", tab === id ? "border-[#00E5FF] bg-[#00E5FF] text-black shadow-[0_0_14px_rgba(0,229,255,0.4)]" : "border-white/10 bg-[#1e1e1e] text-neutral-400")}>{l}</button>
        ))}
      </div>

      <div className="thin-scroll flex-1 space-y-3.5 overflow-y-auto px-4 pb-6">
        {tab === "vender" && (
          <>
            {done && (
              <div className="fade flex items-center gap-3 rounded-2xl border border-[#00FF88]/40 bg-[#00FF88]/10 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#00FF88]/20 text-[#00FF88]"><Check size={18} strokeWidth={3} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#00FF88]">Venda concluída • {formatAOA(done.total)}</p>
                  {done.change > 0 && <p className="text-[12px] font-semibold text-neutral-300">Troco a entregar: {formatAOA(done.change)}</p>}
                </div>
                <button onClick={() => setDone(null)} className="text-neutral-500" aria-label="Fechar"><X size={16} /></button>
              </div>
            )}

            {/* Calculadora */}
            <div className="rounded-2xl border border-[#00E5FF]/30 bg-[#161616] p-3.5">
              <p className="mb-2 font-display text-[15px] font-bold uppercase tracking-wider text-[#00E5FF]">Calculadora de venda</p>
              <div className="mb-2.5 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-[#1e1e1e] p-1">
                {([["produto", "Produto", Package], ["servico", "Serviço", Wrench]] as const).map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setKind(k)} className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-extrabold uppercase tracking-wider", kind === k ? "bg-[#00E5FF] text-black" : "text-neutral-500")}><Icon size={13} /> {l}</button>
                ))}
              </div>

              <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
                {suggestions.filter((s) => s.k === kind).map((s) => (
                  <button key={s.n} onClick={() => setName(s.n)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-neutral-300 active:scale-95">{s.n}</button>
                ))}
              </div>

              <div className="space-y-2.5">
                <label className="block">
                  <span className={labelCls}>{kind === "produto" ? "Produto" : "Serviço"}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "produto" ? "Ex: Bolachas" : "Ex: Impressão A4"} className={fieldCls} />
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className={labelCls}>Preço unitário (AOA)</span>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" className={`${fieldCls} font-display text-[18px] font-extrabold`} />
                  </label>
                  <div>
                    <span className={labelCls}>Quantidade</span>
                    <div className="flex items-stretch gap-1">
                      <button onClick={() => setQty(String(Math.max(1, q - 1)))} className="grid w-9 shrink-0 place-items-center rounded-xl bg-white/10 active:scale-90" aria-label="Menos"><Minus size={15} /></button>
                      <input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${fieldCls} min-w-0 text-center font-display text-[18px] font-extrabold`} />
                      <button onClick={() => setQty(String(q + 1))} className="grid w-9 shrink-0 place-items-center rounded-xl bg-white/10 active:scale-90" aria-label="Mais"><Plus size={15} /></button>
                    </div>
                  </div>
                </div>

                <div className="neon-border-green rounded-xl bg-[#0f1713] px-3 py-2.5 text-center">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-neutral-400">Total a pagar</p>
                  <p className="font-display text-[30px] font-extrabold leading-tight text-[#00FF88]">{formatAOA(calcTotal)}</p>
                  <p className="text-[11px] text-neutral-500">{q} × {formatAOAshort(p)}</p>
                </div>

                {canManage && <label className="flex items-center gap-2 text-[12px] font-semibold text-neutral-300">
                  <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4 accent-[#00E5FF]" />
                  Guardar no catálogo (para vender de novo com um toque)
                </label>}
                {canManage && save && kind === "produto" && inventory.length > 0 && (
                  <label className="block">
                    <span className={labelCls}>Ligar ao inventário (baixa de stock automática)</span>
                    <select value={invId} onChange={(e) => setInvId(e.target.value)} className={fieldCls}>
                      <option value="">Sem ligação</option>
                      {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} (stock {i.stock})</option>)}
                    </select>
                  </label>
                )}
                <ErrorBox msg={err} />
                <button onClick={addCalc} className="neon-btn-cyan flex w-full items-center justify-center gap-2 rounded-xl bg-[#00E5FF] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">
                  <Plus size={16} strokeWidth={3} /> Adicionar ao carrinho
                </button>
              </div>
            </div>

            {/* Catálogo */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-[15px] font-bold uppercase tracking-wider">Catálogo</p>
                {catalog.length > 0 && canManage && (
                  <button onClick={() => setEdit(!edit)} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider", edit ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/15 text-neutral-400")}>
                    {edit ? <Check size={11} /> : <Pencil size={11} />} {edit ? "Concluir" : "Editar preços"}
                  </button>
                )}
              </div>
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {([["todos", "Todos"], ["produto", "Produtos"], ["servico", "Serviços"]] as const).map(([id, l]) => (
                  <button key={id} onClick={() => setFilter(id)} className={cn("rounded-lg border py-1.5 text-[11px] font-extrabold uppercase", filter === id ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-white/10 text-neutral-500")}>{l}</button>
                ))}
              </div>
              {catalog.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-[12.5px] leading-relaxed text-neutral-500">
                  {canManage ? "O catálogo está vazio. Use a calculadora acima e marque “Guardar no catálogo” — o preço unitário fica guardado e basta tocar para vender." : "O catálogo está vazio. Venda já com a calculadora acima (nome, preço e quantidade) ou peça ao proprietário para guardar os itens no catálogo."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {shown.map((it) => {
                    const n = inCart(it);
                    const inv = invName(it.invId);
                    return (
                      <div key={it.id} className={cn("relative rounded-xl border bg-[#1e1e1e] p-2.5", n > 0 ? "border-[#00FF88]/60" : "border-white/[0.07]")}>
                        <button onClick={() => !edit && addFromCatalog(it)} className="block w-full text-left active:scale-[0.98]">
                          <p className="flex items-center gap-1.5 truncate pr-6 text-[13px] font-bold">
                            {it.kind === "produto" ? <Package size={12} className="shrink-0 text-[#00E5FF]" /> : <Wrench size={12} className="shrink-0 text-purple-400" />}
                            <span className="truncate">{it.name}</span>
                          </p>
                          {edit ? (
                            <input
                              defaultValue={it.price}
                              inputMode="decimal"
                              onBlur={(e) => { const v = num(e.target.value); if (v > 0) onUpdatePrice(it.id, v); }}
                              className={`${fieldCls} mt-1.5 !py-1.5 font-display text-[16px] font-extrabold`}
                            />
                          ) : (
                            <p className="mt-0.5 font-display text-[17px] font-extrabold text-[#00FF88]">{formatAOAshort(it.price)}</p>
                          )}
                          <p className="text-[10.5px] text-neutral-500">{inv ? `Stock: ${inv.stock}` : "por unidade"}</p>
                        </button>
                        {n > 0 && !edit && <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#00FF88] px-1 text-[10px] font-extrabold text-black">{n}</span>}
                        {edit && canRemove && (
                          <button onClick={() => onRemoveItem(it.id)} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Remover"><Trash2 size={12} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "hoje" && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Produtos</p><p className="font-display text-[14px] font-extrabold text-[#00E5FF]">{formatAOAshort(prodTotal)}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Serviços</p><p className="font-display text-[14px] font-extrabold text-purple-400">{formatAOAshort(servTotal)}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#1e1e1e] p-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total</p><p className="font-display text-[14px] font-extrabold text-[#00FF88]">{formatAOAshort(prodTotal + servTotal)}</p></div>
            </div>
            {sales.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-[12.5px] text-neutral-500">{onlyActorId === null ? "Ainda não há vendas hoje." : "Ainda não fez vendas hoje."}</p>}
            <div className="space-y-1.5">
              {sales.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#1e1e1e] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-display text-[16px] font-extrabold leading-none text-[#00FF88]">+ {formatAOA(t.value)}</p>
                    <p className="mt-0.5 truncate text-[12px] text-neutral-300">{t.label}</p>
                    <p className="truncate text-[10.5px] text-neutral-500">{t.detail}</p>
                    {onlyActorId === null && t.actorName && <p className="truncate text-[10.5px] font-semibold text-[#00E5FF]">Vendido por {t.actorName}</p>}
                  </div>
                  <span className="shrink-0 text-[12px] font-bold">{clockHM(t.ts)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-white/[0.08] bg-[#0e0e0e] px-4 py-3">
          <button onClick={() => { setShowCart(true); setCartErr(""); }} className="neon-btn-green flex w-full items-center justify-between rounded-xl bg-[#00FF88] px-4 py-3 text-black active:scale-[0.98]">
            <span className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider"><ShoppingCart size={16} /> Carrinho ({cartCount})</span>
            <span className="font-display text-[18px] font-extrabold">{formatAOA(cartTotal)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <Sheet z={60} title="Carrinho" subtitle="Confirme os itens e receba o pagamento" accent="#00FF88" onClose={() => setShowCart(false)}>
          <div className="space-y-1.5">
            {cart.map((l) => (
              <div key={l.key} className="rounded-xl border border-white/[0.07] bg-[#1e1e1e] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[13px] font-bold">{l.name}</p>
                  <p className="shrink-0 font-display text-[16px] font-extrabold text-[#00FF88]">{formatAOA(round2(l.unitPrice * l.qty))}</p>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">{formatAOAshort(l.unitPrice)} cada</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setLineQty(l.key, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 active:scale-90" aria-label="Menos"><Minus size={13} /></button>
                    <span className="w-8 text-center font-display text-[16px] font-extrabold">{l.qty}</span>
                    <button onClick={() => setLineQty(l.key, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 active:scale-90" aria-label="Mais"><Plus size={13} /></button>
                    <button onClick={() => setLineQty(l.key, 0)} className="ml-1 grid h-7 w-7 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Remover"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="neon-border-green mt-3 rounded-xl bg-[#0f1713] px-3 py-3 text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-neutral-400">Total a pagar</p>
            <p className="font-display text-[34px] font-extrabold leading-tight text-[#00FF88]">{formatAOA(cartTotal)}</p>
          </div>

          <div className="mt-3 space-y-2.5">
            <div>
              <span className={labelCls}>Forma de pagamento</span>
              <div className="grid grid-cols-3 gap-1.5">
                {methods.map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={cn("rounded-lg border py-2 text-[11px] font-extrabold", method === m ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 text-neutral-500")}>{m}</button>
                ))}
              </div>
            </div>
            {method === "Dinheiro" && (
              <div>
                <span className={labelCls}>Valor recebido (AOA)</span>
                <input value={received} onChange={(e) => setReceived(e.target.value)} inputMode="decimal" placeholder={String(cartTotal)} className={`${fieldCls} font-display text-[20px] font-extrabold`} />
                {rec > 0 && (
                  <p className={cn("mt-1 flex items-center gap-1.5 text-[13px] font-extrabold", change >= 0 ? "text-[#FFC107]" : "text-[#FF4D6D]")}>
                    <Receipt size={14} /> {change >= 0 ? `Troco: ${formatAOA(change)}` : `Falta: ${formatAOA(-change)}`}
                  </p>
                )}
              </div>
            )}
            <label className="block">
              <span className={labelCls}>Cliente (opcional)</span>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" className={fieldCls} />
            </label>
            <ErrorBox msg={cartErr} />
            <button onClick={conclude} className="neon-btn-green w-full rounded-xl bg-[#00FF88] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">
              Concluir venda • {formatAOA(cartTotal)}
            </button>
            <button onClick={() => { setCart([]); setShowCart(false); }} className="w-full text-center text-[12px] font-bold text-neutral-500">Esvaziar carrinho</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
