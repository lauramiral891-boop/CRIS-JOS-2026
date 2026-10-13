import { useState } from "react";
import { ChevronDown, ChevronUp, Gamepad2, Plus, Trash2 } from "lucide-react";
import type { Game, GlobalAdm } from "../lib/types";
import { safeLink } from "../lib/gameUtils";
import { uid } from "../lib/storage";
import { cn } from "../utils/cn";
import { ErrorBox, fieldCls } from "./ui";
import { GameInfoFields } from "./GameInfoFields";
import { GameMediaFields, type PickerType } from "./GameMedia";

const card = "rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5";
const btn = "rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase active:scale-95 disabled:opacity-40";
const lbl = "text-[11px] font-bold uppercase tracking-wider text-neutral-400";
type OnG = (fn: (g: GlobalAdm) => GlobalAdm) => void;
type Props = { g: GlobalAdm; onG: OnG; onWarn: (m: string) => void; Picker: PickerType };

export default function GamesTab({ g, onG, onWarn, Picker }: Props) {
  const [f, setF] = useState<Partial<Game>>({});
  const [n, setN] = useState(0);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const games = g.games ?? [];
  const patch = (p: Partial<Game>) => { setF((x) => ({ ...x, ...p })); setErr(""); };

  const edit = (id: number, p: Partial<Game>) =>
    onG((x) => ({
      ...x,
      games: (x.games ?? []).map((y) =>
        y.id === id ? { ...y, ...p } : p.featured ? { ...y, featured: false } : y),
    }));

  const move = (id: number, d: -1 | 1) => onG((x) => {
    const l = [...(x.games ?? [])];
    const i = l.findIndex((y) => y.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return x;
    [l[i], l[j]] = [l[j], l[i]];
    return { ...x, games: l };
  });

  const add = () => {
    const name = (f.name ?? "").trim();
    if (!name) return setErr("Escreva o nome do jogo.");
    const parts = (f.parts ?? [])
      .map((x) => ({ label: x.label.trim(), link: safeLink(x.link) }))
      .filter((x) => x.link);
    const link = safeLink(f.link ?? "") || parts[0]?.link || "";
    if (!link) return setErr("Cole o link de download ou adicione uma parte com link.");
    if (games.length >= 60) return setErr("Máximo de 60 jogos. Apague algum.");
    const game: Game = {
      ...f, id: uid(), name, link, active: true, createdAt: Date.now(),
      description: (f.description ?? "").trim(), cover: f.cover || undefined,
      trailer: (f.trailer ?? "").trim() || undefined,
      parts: parts.length ? parts : undefined,
    };
    onG((x) => ({
      ...x,
      games: [game, ...(x.games ?? []).map((y) => (game.featured ? { ...y, featured: false } : y))].slice(0, 60),
    }));
    setF({}); setN((v) => v + 1); setErr("");
  };

  return (
    <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <div className={card} key={n}>
        <p className={cn(lbl, "mb-2")}>Novo jogo</p>
        <div className="space-y-2">
          {f.cover && <img src={f.cover} alt="" className="h-32 w-32 rounded-xl object-cover" />}
          <Picker label={f.cover ? "Trocar capa" : "Escolher capa (quadrada)"} aspect={1}
            maxSide={640} quality={0.72} onError={onWarn} onPick={(i) => patch({ cover: i[0] ?? "" })} />
          <input value={f.name ?? ""} onChange={(e) => patch({ name: e.target.value })}
            placeholder="Nome do jogo" className={fieldCls} />
          <textarea value={f.description ?? ""} onChange={(e) => patch({ description: e.target.value })}
            placeholder="Descrição do jogo" rows={3} className={cn(fieldCls, "resize-none")} />
          <input value={f.link ?? ""} onChange={(e) => patch({ link: e.target.value })}
            placeholder="Link de download (ou use as partes abaixo)" inputMode="url"
            autoCapitalize="none" className={fieldCls} />
          <GameInfoFields v={f} on={patch} />
          <GameMediaFields v={f} on={patch} Picker={Picker} onWarn={onWarn} />
          <ErrorBox msg={err} />
          <button onClick={add} className={cn(btn, "w-full bg-[#7CFF1A] text-black")}>
            <Plus size={13} className="mr-1 inline" />Publicar na Sala de Jogos
          </button>
        </div>
      </div>

      {games.length === 0 && <p className="text-center text-[12px] text-neutral-500">Ainda sem jogos.</p>}
      {games.map((x, i) => (
        <div key={x.id} className={card}>
          <div className="flex gap-3">
            {x.cover
              ? <img src={x.cover} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              : <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#7CFF1A]/10 text-[#7CFF1A]"><Gamepad2 size={22} /></span>}
            <div className="min-w-0 flex-1 space-y-1.5">
              <input value={x.name} onChange={(e) => edit(x.id, { name: e.target.value })}
                placeholder="Nome" className={cn(fieldCls, "py-1.5")} />
              <input value={x.link} onChange={(e) => edit(x.id, { link: e.target.value })}
                placeholder="Link" className={cn(fieldCls, "py-1.5")} />
            </div>
          </div>
          {!safeLink(x.link) && !(x.parts ?? []).some((p) => safeLink(p.link)) && (
            <p className="mt-1 text-[11px] font-semibold text-[#FF8FA3]">Sem link válido: o download fica indisponível.</p>
          )}
          <button onClick={() => setOpen(open === x.id ? null : x.id)}
            className={cn(btn, "mt-2 w-full bg-white/10")}>
            {open === x.id ? "Fechar detalhes" : "Editar detalhes"}
          </button>
          {open === x.id && (
            <div className="mt-2 space-y-2">
              <Picker label="Trocar capa" aspect={1} maxSide={640} quality={0.72}
                onError={onWarn} onPick={(im) => edit(x.id, { cover: im[0] ?? x.cover })} />
              <textarea value={x.description} onChange={(e) => edit(x.id, { description: e.target.value })}
                rows={3} placeholder="Descrição" className={cn(fieldCls, "resize-none")} />
              <GameInfoFields v={x} on={(p) => edit(x.id, p)} />
              <GameMediaFields v={x} on={(p) => edit(x.id, p)} Picker={Picker} onWarn={onWarn} />
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => edit(x.id, { active: !x.active })}
              className={cn(btn, "flex-1", x.active ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-white/10")}>
              {x.active ? "Visível" : "Escondido"}
            </button>
            <button disabled={i === 0} onClick={() => move(x.id, -1)} className={cn(btn, "bg-white/10")} aria-label="Subir"><ChevronUp size={14} /></button>
            <button disabled={i === games.length - 1} onClick={() => move(x.id, 1)} className={cn(btn, "bg-white/10")} aria-label="Descer"><ChevronDown size={14} /></button>
            <button onClick={() => onG((y) => ({ ...y, games: (y.games ?? []).filter((z) => z.id !== x.id) }))}
              className={cn(btn, "bg-[#FF4D6D]/15 text-[#FF4D6D]")} aria-label="Apagar"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
