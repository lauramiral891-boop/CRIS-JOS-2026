import { useRef, useState } from "react";
import type { ReactionRow } from "../lib/commApi";

export const REACTS: [string, string][] = [
  ["👍", "Gosto"],
  ["❤️", "Adoro"],
  ["🥰", "Coragem"],
  ["😆", "Riso"],
  ["😮", "Surpresa"],
  ["😢", "Tristeza"],
  ["😡", "Ira"],
];

const KF =
  "@keyframes cjpop{0%{transform:scale(0) translateY(12px);opacity:0}70%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}";
const label = (e: string) => REACTS.find((r) => r[0] === e)?.[1] ?? "Reagiu";

export function Summary({ rs }: { rs: ReactionRow[] }) {
  if (rs.length === 0) return null;
  const c = new Map<string, number>();
  rs.forEach((r) => c.set(r.emoji, (c.get(r.emoji) ?? 0) + 1));
  const top = Array.from(c.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-neutral-300">
      <span className="flex -space-x-1">
        {top.map(([e]) => (
          <span key={e} className="grid h-5 w-5 place-items-center rounded-full bg-[#262626] text-[12px]">{e}</span>
        ))}
      </span>
      {rs.length}
    </span>
  );
}

type Props = { mine?: ReactionRow; onPick: (emoji: string) => void; bar?: boolean };
const NOSEL = { touchAction: "manipulation", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as const;

export function ReactButton({ mine, onPick, bar }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const timer = useRef(0);
  const long = useRef(false);
  const stop = () => window.clearTimeout(timer.current);
  const down = () => {
    long.current = false;
    timer.current = window.setTimeout(() => {
      long.current = true;
      setOpen(true);
    }, 420);
  };
  const up = () => {
    stop();
    if (!long.current) onPick(mine ? mine.emoji : "👍");
  };
  const choose = (e: string) => {
    setOpen(false);
    setCustom("");
    onPick(e);
  };
  const own = Array.from(custom.trim()).slice(0, 2).join("");
  const base = bar
    ? "flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 py-3 text-[13px] font-bold"
    : "inline-flex items-center gap-1 text-[12px] font-bold";
  const tone = mine ? "text-[#00FF88]" : "text-neutral-300";

  return (
    <span className={bar ? "relative block" : "relative inline-block"}>
      <style>{KF}</style>
      {open && (
        <>
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-max max-w-[92vw] rounded-3xl bg-[#1e1e1e] p-2 shadow-xl">
            <div className="flex gap-1">
              {REACTS.map(([e, n], i) => (
                <button key={e} onClick={() => choose(e)} aria-label={n}
                  style={{ animation: `cjpop .35s ${i * 40}ms both` }}
                  className="text-[28px] active:scale-125">{e}</button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Outro emoji…"
                className="min-w-0 flex-1 rounded-full bg-black/40 px-3 py-1.5 text-[12.5px] outline-none" />
              <button disabled={!own} onClick={() => choose(own)}
                className="rounded-full bg-[#00FF88] px-3 text-[12px] font-extrabold text-black disabled:opacity-40">OK</button>
            </div>
          </div>
        </>
      )}
      <button onPointerDown={down} onPointerUp={up} onPointerLeave={stop} onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()} style={NOSEL} className={`${base} ${tone}`}>
        {mine && <span key={mine.emoji} style={{ animation: "cjpop .35s both" }} className="inline-block">{mine.emoji}</span>}
        {mine ? label(mine.emoji) : "Gosto"}
      </button>
    </span>
  );
}
