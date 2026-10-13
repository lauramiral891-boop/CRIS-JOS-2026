import { Download, Gamepad2, Star } from "lucide-react";
import type { Game } from "../lib/types";

export const BOX =
  "rounded-2xl border border-[#00FF88]/20 bg-[#0a1a14] p-3.5";

export function Cover({ g, className }: { g: Game; className: string }) {
  if (g.cover) {
    return (
      <img src={g.cover} alt={g.name} loading="lazy"
        className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} grid place-items-center bg-[#00FF88]/10 text-[#00FF88]`}>
      <Gamepad2 size={34} />
    </div>
  );
}

const RATE =
  "inline-flex items-center gap-1 rounded-lg bg-[#00FF88]/15 px-2 py-0.5 text-[12px] font-extrabold text-[#00FF88]";

export function Rate({ v }: { v?: number }) {
  if (!v) return null;
  return (
    <span className={RATE}>
      <Star size={11} fill="currentColor" />
      {v.toFixed(1)}
    </span>
  );
}

const CARD =
  "overflow-hidden rounded-2xl border border-[#00FF88]/20 bg-[#0a1a14] text-left active:scale-[0.97]";

export function Card(p: { g: Game; onOpen: () => void; wide?: boolean }) {
  const w = p.wide ? "w-full" : "w-[150px] shrink-0";
  return (
    <button onClick={p.onOpen} className={`${w} ${CARD}`}>
      <Cover g={p.g} className="aspect-square w-full" />
      <div className="space-y-1 p-2.5">
        <p className="line-clamp-2 text-[13px] font-bold leading-tight">{p.g.name}</p>
        {p.g.genre && (
          <p className="truncate text-[11px] text-neutral-400">{p.g.genre}</p>
        )}
        <div className="flex items-center pt-1">
          <Rate v={p.g.rating} />
          <Download size={15} className="ml-auto text-neutral-300" />
        </div>
      </div>
    </button>
  );
}
