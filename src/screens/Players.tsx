import { useRef, useState } from "react";
import {
  Search, Plus, FileUp, Eye, EyeOff, ChevronDown, X, Camera, Wallet, Trash2, CirclePlus,
} from "lucide-react";
import { NeonCard } from "../components/shared";
import Sheet from "../components/Sheet";
import { ErrorBox, Field, fieldCls } from "../components/ui";
import type { Player, Session } from "../lib/types";
import { formatAOAshort, initialsOf, playerMatches, timeAgo } from "../lib/format";
import { cn } from "../utils/cn";

const palette = ["#00E5FF", "#FFB020", "#FF4D6D", "#A855F7", "#00FF88", "#FFC107"];

export interface NewPlayer {
  name: string; tag: string; email: string; phone: string; birth: string; house: string; photo?: string;
}

const emptyForm = (house: string) => ({
  name: "", tag: "", email: "", ddi: "+244", phone: "", birth: "", house, pass: "", pass2: "",
});

export default function PlayersScreen({
  players, sessions, now, houseName, onRegister, onTopUp, onRemove, onImport,
}: {
  players: Player[];
  sessions: Session[];
  now: number;
  houseName: string;
  onRegister: (p: NewPlayer) => void;
  onTopUp: (id: number, amount: number) => void;
  onRemove: (id: number) => void;
  onImport: (rows: { name: string; tag: string; phone: string }[]) => void;
}) {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(emptyForm(houseName));
  const [topUp, setTopUp] = useState<Player | null>(null);
  const [amount, setAmount] = useState("");
  const [delId, setDelId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOnline = (p: Player) => sessions.some((s) => playerMatches(p, s.player));
  const filtered = players.filter((p) => (p.name + p.tag + p.phone).toLowerCase().includes(q.toLowerCase()));
  const onlineCount = players.filter(isOnline).length;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };

  const close = () => {
    setShowForm(false); setErr(""); setForm(emptyForm(houseName)); setPhoto(undefined);
  };

  const submit = () => {
    if (!form.name.trim() || !form.tag.trim()) return setErr("Preencha o nome e a Gamer Tag.");
    if (players.some((p) => p.tag.toLowerCase() === "@" + form.tag.toLowerCase().replace(/\s/g, "_"))) return setErr("Já existe um jogador com essa Gamer Tag.");
    if (form.pass.length < 4) return setErr("A palavra-passe deve ter pelo menos 4 caracteres.");
    if (form.pass !== form.pass2) return setErr("As palavras-passe não coincidem.");
    onRegister({
      name: form.name.trim(), tag: "@" + form.tag.trim().toLowerCase().replace(/\s/g, "_"),
      email: form.email.trim(), phone: `${form.ddi} ${form.phone}`.trim(), birth: form.birth, house: form.house, photo,
    });
    close();
  };

  const importFile = async (f: File) => {
    const text = await f.text();
    const rows = text.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((c) => c[0])
      .map((c) => ({ name: c[0], tag: c[1] || c[0], phone: c[2] || "" }));
    onImport(rows);
  };

  const doTopUp = () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!topUp || !v || v <= 0) return;
    onTopUp(topUp.id, v);
    setTopUp(null); setAmount("");
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-[#2a2a2a] px-3.5 py-2.5 text-[13.5px] text-white outline-none transition focus:border-[#00E5FF] focus:shadow-[0_0_12px_rgba(0,229,255,0.25)]";
  const labelC = "mb-1 block text-[12.5px] font-medium text-neutral-200";

  return (
    <div className="space-y-3.5 px-4 pb-6">
      {!showForm ? (
        <>
          <h1 className="rise pt-1 text-center font-display text-[26px] font-extrabold uppercase tracking-wide">Gestão de Jogadores</h1>

          <div className="rise rise-1 relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar jogadores..." className="w-full rounded-full border border-white/10 bg-[#252525] py-3 pl-11 pr-10 text-[13.5px] outline-none transition focus:border-[#00E5FF]/60" />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-neutral-300"><X size={13} /></button>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-neutral-500">
            <span>{filtered.length} JOGADOR{filtered.length === 1 ? "" : "ES"}</span>
            <span className="flex items-center gap-1.5 text-[#00FF88]"><span className="live-dot h-1.5 w-1.5 rounded-full bg-[#00FF88]" /> {onlineCount} ONLINE</span>
          </div>

          <div className="space-y-2.5">
            {players.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-[13px] leading-relaxed text-neutral-500">
                Ainda não há jogadores. Registe o primeiro em “Novo Jogador” ou importe uma lista (nome;gamertag;telefone).
              </div>
            )}
            {players.length > 0 && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-[13px] text-neutral-500">Nenhum jogador encontrado para “{q}”.</div>
            )}
            {filtered.map((p, i) => {
              const color = palette[p.id % palette.length];
              const online = isOnline(p);
              return (
                <NeonCard key={p.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="h-12 w-12 rounded-full border-2 object-cover" style={{ borderColor: color }} />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-full border-2 font-display text-[15px] font-extrabold" style={{ borderColor: color, background: `${color}18`, color }}>{initialsOf(p.name)}</div>
                      )}
                      {online && <span className="live-dot absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-[#1e1e1e] bg-[#00FF88]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-white">{p.name}</p>
                          <p className="truncate text-[12px] text-neutral-400">{p.tag}{p.phone ? ` • ${p.phone}` : ""}</p>
                          <p className="text-[12px] text-neutral-500">Saldo Atual</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn("flex items-center justify-end gap-1 text-[12px] font-semibold", online ? "text-[#00FF88]" : "text-neutral-500")}>
                            {online ? "Online" : "Offline"}
                            <span className={cn("h-1.5 w-1.5 rounded-full", online ? "live-dot bg-[#00FF88]" : "bg-neutral-600")} />
                          </p>
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-[13px] font-extrabold text-white"><Wallet size={12} className="text-[#00FF88]" /> {formatAOAshort(p.balance)}</p>
                          <p className="text-[11px] text-neutral-500">{p.lastActive ? timeAgo(p.lastActive, now) : "Sem atividade"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={cn("mt-2.5 flex gap-2", i >= 0 && "")}>
                    <button onClick={() => setTopUp(p)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#00FF88]/40 bg-[#00FF88]/10 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#00FF88] active:scale-95">
                      <CirclePlus size={13} /> Recarregar saldo
                    </button>
                    {delId === p.id ? (
                      <button onClick={() => { onRemove(p.id); setDelId(null); }} className="rounded-lg bg-[#FF4D6D] px-3 py-1.5 text-[11px] font-extrabold uppercase text-white">Confirmar</button>
                    ) : (
                      <button onClick={() => setDelId(p.id)} className="grid w-9 place-items-center rounded-lg bg-[#FF4D6D]/10 text-[#FF4D6D]" aria-label="Remover jogador"><Trash2 size={14} /></button>
                    )}
                  </div>
                </NeonCard>
              );
            })}
          </div>

          <div className="rise rise-5 flex gap-2 pt-1">
            <button onClick={() => setShowForm(true)} className="neon-btn-cyan flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#00E5FF] py-2.5 text-[13px] font-bold text-black transition active:scale-95">
              <Plus size={17} strokeWidth={3} /> Novo Jogador
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#00E5FF] py-2.5 text-[13px] font-bold text-black transition active:scale-95">
              <FileUp size={15} /> Importar Lista
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
          </div>
        </>
      ) : (
        <div className="fade pb-2">
          <h1 className="pt-1 text-center font-display text-[24px] font-extrabold uppercase tracking-wide">Registo de Jogador</h1>

          <div className="mt-3 flex flex-col items-start">
            <label className="group relative cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <div className="grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-full border border-white/10 bg-[#3a3a3a] text-white transition group-hover:border-[#00E5FF]/60">
                {photo ? <img src={photo} alt="pré-visualização" className="h-full w-full object-cover" /> : <Plus size={30} strokeWidth={2.2} />}
              </div>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[#121212] bg-[#4a4a4a] text-white"><Camera size={12} /></span>
            </label>
            <span className="mt-1.5 text-[12px] text-neutral-300">Carregar Foto</span>
          </div>

          <div className="mt-2 space-y-1.5">
            <div><label className={labelC}>Nome Completo</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="João Silva" /></div>
            <div><label className={labelC}>Nome de Utilizador (Gamer Tag)</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className={inputCls} placeholder="Shadow_João" /></div>
            <div><label className={labelC}>Endereço de Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="joao.silva@email.com" inputMode="email" /></div>
            <div>
              <label className={labelC}>Número de Telefone</label>
              <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#2a2a2a] transition focus-within:border-[#00E5FF]">
                <div className="relative border-r border-white/10 bg-[#333]">
                  <select value={form.ddi} onChange={(e) => setForm({ ...form, ddi: e.target.value })} className="h-full appearance-none bg-transparent py-2.5 pl-3 pr-7 text-[13px] font-bold outline-none">
                    <option value="+244">AO +244</option>
                    <option value="+55">BR +55</option>
                    <option value="+351">PT +351</option>
                    <option value="+258">MZ +258</option>
                    <option value="+238">CV +238</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-transparent px-3 py-2.5 text-[13.5px] outline-none" placeholder="923 000 000" inputMode="tel" />
              </div>
            </div>
            <div><label className={labelC}>Data de Nascimento</label><input value={form.birth} onChange={(e) => setForm({ ...form, birth: e.target.value })} className={inputCls} placeholder="DD/MM/AAAA" inputMode="numeric" /></div>
            <div>
              <label className={labelC}>Game House Preferida</label>
              <div className="relative">
                <select value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} className={`${inputCls} appearance-none pr-10`}>
                  <option>{houseName}</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-300" />
              </div>
            </div>
            <div>
              <label className={labelC}>Palavra-passe</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} className={`${inputCls} pr-11`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div>
              <label className={labelC}>Confirmar Palavra-passe</label>
              <div className="relative">
                <input type={showPass2 ? "text" : "password"} value={form.pass2} onChange={(e) => setForm({ ...form, pass2: e.target.value })} className={`${inputCls} pr-11`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300">{showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          </div>

          <div className="mt-2"><ErrorBox msg={err} /></div>

          <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-2.5">
            <button onClick={submit} className="neon-btn-green rounded-lg bg-[#00FF88] py-3 font-display text-[16px] font-bold uppercase tracking-wide text-black transition active:scale-[0.98]">Concluir Registo</button>
            <button onClick={close} className="rounded-lg bg-[#4a4a4a] py-3 font-display text-[16px] font-bold uppercase tracking-wide text-white transition active:scale-[0.98]">Cancelar</button>
          </div>
        </div>
      )}

      {topUp && (
        <Sheet title="Recarregar Saldo" subtitle={`${topUp.name} • saldo atual ${formatAOAshort(topUp.balance)}`} accent="#00FF88" onClose={() => { setTopUp(null); setAmount(""); }}>
          <div className="space-y-3">
            <Field label="Valor a carregar (AOA)">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${fieldCls} font-display text-[22px] font-extrabold`} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[1000, 2000, 5000, 10000].map((n) => (
                <button key={n} onClick={() => setAmount(String(n))} className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-neutral-400">{formatAOAshort(n)}</button>
              ))}
            </div>
            <button onClick={doTopUp} className="neon-btn-green w-full rounded-xl bg-[#00FF88] py-3 text-[13px] font-extrabold uppercase tracking-widest text-black active:scale-[0.98]">Confirmar recarga</button>
            <p className="text-center text-[11px] text-neutral-500">O valor entra nas finanças de hoje como receita.</p>
          </div>
        </Sheet>
      )}
    </div>
  );
}
