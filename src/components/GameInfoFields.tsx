import { useState } from "react";
import type { Game } from "../lib/types";
import { cn } from "../utils/cn";
import { fieldCls } from "./ui";

const PLATS = ["PS3/PS4", "PC", "Switch", "XBOX"];
export type Patch = (p: Partial<Game>) => void;

function Rating(p: { value?: number; onChange: (n?: number) => void }) {
  const [t, setT] = useState(p.value == null ? "" : String(p.value));
  const set = (raw: string) => {
    const s = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    setT(s);
    const n = parseFloat(s);
    p.onChange(Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : undefined);
  };
  return (
    <input value={t} onChange={(e) => set(e.target.value)} inputMode="decimal"
      placeholder="Nota de 0 a 10 (ex.: 9.5)" className={fieldCls} />
  );
}

function T(p: { ph: string; v?: string; on: (s: string) => void }) {
  return (
    <input value={p.v ?? ""} onChange={(e) => p.on(e.target.value)}
      placeholder={p.ph} className={fieldCls} />
  );
}

const CHIP = "rounded-full border px-3 py-1.5 text-[12px] font-bold";
const CHIP_ON = "border-[#7CFF1A] bg-[#7CFF1A] text-black";
const CHIP_OFF = "border-white/15 text-neutral-300";

export function GameInfoFields({ v, on }: { v: Partial<Game>; on: Patch }) {
  const plats = v.platforms ?? [];
  const tog = (p: string) =>
    on({ platforms: plats.includes(p) ? plats.filter((x) => x !== p) : [...plats, p] });
  return (
    <div className="space-y-2">
      <Rating value={v.rating} onChange={(n) => on({ rating: n })} />
      <div className="flex flex-wrap gap-2">
        {PLATS.map((p) => (
          <button key={p} type="button" onClick={() => tog(p)}
            className={cn(CHIP, plats.includes(p) ? CHIP_ON : CHIP_OFF)}>{p}</button>
        ))}
      </div>
      <T ph="Tamanho (ex.: 23.6 GB)" v={v.size} on={(s) => on({ size: s })} />
      <T ph="Lançamento (ex.: 17 de setembro de 2013)" v={v.releaseDate} on={(s) => on({ releaseDate: s })} />
      <T ph="Desenvolvedora" v={v.developer} on={(s) => on({ developer: s })} />
      <T ph="Género (ex.: Ação / Aventura)" v={v.genre} on={(s) => on({ genre: s })} />
      <T ph="Idioma (ex.: PT-BR)" v={v.language} on={(s) => on({ language: s })} />
      <button type="button" onClick={() => on({ featured: !v.featured })}
        className={cn(CHIP, "w-full", v.featured ? CHIP_ON : CHIP_OFF)}>
        {v.featured ? "Em destaque no início" : "Pôr em destaque no início"}
      </button>
    </div>
  );
}
