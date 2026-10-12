import { useMemo, useState } from "react";
import { ChevronLeft, Download, Gamepad2, Search, X } from "lucide-react";
import type { Game } from "../lib/types";

/** Só aceita links http/https (evita «javascript:» e outros esquemas perigosos). */
export const safeLink = (raw: string): string => {
  let t = raw.trim();
  if (!t) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch { return ""; }
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Sala de Jogos: capa, nome, descrição e botão que leva ao link de download. Busca rápida pelo nome. */
export default function GamesRoom({ games, onClose }: { games: Game[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = norm(q);
    return n ? games.filter((g) => norm(g.name).includes(n)) : games;
  }, [games, q]);

  return (
    <div className="fade absolute inset-0 z-40 flex flex-col bg-[#121212]">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="shrink-0 border-b border-white/[0.07] bg-gradient-to-b from-[#7CFF1A]/10 to-transparent px-4 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:scale-95" aria-label="Voltar"><ChevronLeft size={18} /></button>
          <img src="./logo-192.png" alt="CJ Gerenciamento" className="h-14 w-14 shrink-0 rounded-full object-cover shadow-[0_0_18px_rgba(57,255,20,0.4)]" />
          <div className="min-w-0 flex-1 leading-none">
            <h3 className="font-display text-[22px] font-extrabold uppercase">Sala de Jogos</h3>
            <p className="mt-1 text-[11px] font-semibold text-[#7CFF1A]">CJ Gerenciamento • Cris José</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jogo pelo nome…" inputMode="search" enterKeyHint="search"
            className="w-full rounded-xl border border-white/10 bg-[#1e1e1e] py-2.5 pl-10 pr-9 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#7CFF1A]/60"
          />
          {q && <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" aria-label="Limpar"><X size={15} /></button>}
        </div>
      </div>

      <div className="thin-scroll flex-1 space-y-7 overflow-y-auto px-4 pb-10 pt-4">
        {games.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <Gamepad2 size={34} className="text-neutral-600" />
            <p className="text-[13px] text-neutral-400">Ainda não há jogos publicados. Volte em breve!</p>
          </div>
        )}
        {games.length > 0 && list.length === 0 && <p className="pt-10 text-center text-[13px] text-neutral-500">Nenhum jogo com «{q.trim()}».</p>}
        {list.map((g) => {
          const href = safeLink(g.link);
          return (
            <article key={g.id} className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b]">
              <div className="relative">
                {g.cover
                  ? <img src={g.cover} alt={g.name} loading="lazy" className="aspect-[16/10] w-full rounded-t-2xl object-contain bg-black/40" />
                  : <div className="grid aspect-[16/10] w-full place-items-center rounded-t-2xl bg-gradient-to-br from-[#7CFF1A]/15 to-[#00E5FF]/10 text-[#7CFF1A]"><Gamepad2 size={40} /></div>}
                {/* botão flutuante sobre a capa, ligado ao link do jogo */}
                {href ? (
                  <a
                    href={href} target="_blank" rel="noopener noreferrer"
                    className="absolute -bottom-5 left-4 right-4 z-10 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7CFF1A] to-[#00FF88] py-3 text-[13px] font-extrabold uppercase text-black shadow-[0_8px_22px_rgba(0,255,136,0.35)] active:scale-[0.97]"
                  >
                    <Download size={16} /> Clique aqui para baixar
                  </a>
                ) : (
                  <span className="absolute -bottom-5 left-4 right-4 z-10 flex items-center justify-center rounded-full bg-neutral-700 py-3 text-[12px] font-bold uppercase text-neutral-300">Link indisponível</span>
                )}
              </div>
              <div className="px-4 pb-4 pt-8">
                <h4 className="font-display text-[19px] font-extrabold uppercase leading-tight">{g.name}</h4>
                {g.description && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">{g.description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
