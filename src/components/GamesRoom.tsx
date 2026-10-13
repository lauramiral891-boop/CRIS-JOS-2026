import { useMemo, useState } from "react";
import { ChevronLeft, ExternalLink, Flame, Gamepad2 } from "lucide-react";
import { LayoutGrid, Monitor, Search, X } from "lucide-react";
import type { Game } from "../lib/types";
import { norm } from "../lib/gameUtils";
import { Card, Cover, Rate } from "./GameBits";
import GameDetail from "./GameDetail";

export { safeLink } from "../lib/gameUtils";

const PLATS = ["Todos", "PS3/PS4", "PC", "Switch", "XBOX"];
const TILE =
  "flex w-[74px] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11.5px] font-semibold";
const ON = "border-[#00FF88] bg-[#00FF88]/15 text-white";
const OFF = "border-white/10 bg-[#0a1a14] text-neutral-300";

type Props = { games: Game[]; onClose: () => void };

export default function GamesRoom({ games, onClose }: Props) {
  const [q, setQ] = useState("");
  const [plat, setPlat] = useState("Todos");
  const [catOpen, setCatOpen] = useState(false);
  const [genre, setGenre] = useState("");
  const [sel, setSel] = useState<Game | null>(null);
  const [player, setPlayer] = useState("");
  const [shot, setShot] = useState("");

  const genres = useMemo(() => {
    const l = games.map((g) => (g.genre ?? "").trim()).filter(Boolean);
    return Array.from(new Set(l));
  }, [games]);

  const filtered = useMemo(() => {
    const n = norm(q);
    return games.filter((g) => {
      if (n && !norm(g.name).includes(n)) return false;
      if (plat !== "Todos" && !(g.platforms ?? []).includes(plat)) return false;
      if (genre && norm(g.genre ?? "") !== norm(genre)) return false;
      return true;
    });
  }, [games, q, plat, genre]);

  const filtering = !!q.trim() || plat !== "Todos" || !!genre;
  const featured = games.find((g) => g.featured) ?? games[0];
  const recommended = useMemo(() => {
    const l = [...games].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return l.slice(0, 8);
  }, [games]);
  const more = games.filter((g) => !recommended.some((r) => r.id === g.id));

  return (
    <div className="fade absolute inset-0 z-40 flex flex-col bg-[#050d0a] text-white">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      {sel ? (
        <GameDetail g={sel} onBack={() => setSel(null)} onPlay={setPlayer} onShot={setShot} />
      ) : (
        <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 pb-24 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label="Voltar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
              <ChevronLeft size={18} />
            </button>
            <img src="./logo-192.png" alt="CJ"
              className="h-12 w-12 shrink-0 rounded-full object-cover shadow-[0_0_18px_rgba(0,255,136,0.45)]" />
            <div className="min-w-0 leading-tight">
              <h3 className="font-display text-[22px] font-extrabold">
                Cris José<span className="text-[#00FF88]">Gamers</span>
              </h3>
              <p className="text-[11px] italic text-neutral-300">Mais que jogos, é paixão!</p>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar jogos, categorias…" inputMode="search" enterKeyHint="search"
              className="w-full rounded-full border border-[#00FF88]/40 bg-[#0a1a14] py-3 pl-10 pr-9 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#00FF88]" />
            {q && (
              <button onClick={() => setQ("")} aria-label="Limpar"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <X size={15} />
              </button>
            )}
          </div>

          {games.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 pt-14 text-center">
              <Gamepad2 size={34} className="text-neutral-600" />
              <p className="text-[13px] text-neutral-400">Ainda não há jogos publicados. Volte em breve!</p>
            </div>
          )}

          {!filtering && featured && (
            <div className="relative overflow-hidden rounded-2xl border border-[#00FF88]/30">
              <Cover g={featured} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050d0a] via-[#050d0a]/75 to-transparent" />
              <div className="relative flex min-h-[170px] flex-col items-start justify-center gap-2 p-4 pr-24">
                <span className="rounded-md bg-[#00FF88] px-2 py-0.5 text-[10.5px] font-extrabold uppercase text-black">Em destaque</span>
                <h4 className="font-display text-[21px] font-extrabold leading-tight">{featured.name}</h4>
                {featured.description && (
                  <p className="line-clamp-2 text-[12px] text-neutral-200">{featured.description}</p>
                )}
                <button onClick={() => setSel(featured)}
                  className="mt-1 rounded-xl bg-[#00FF88] px-4 py-2 text-[13px] font-extrabold text-black active:scale-95">
                  Ver Detalhes
                </button>
              </div>
              <div className="absolute right-3 top-3"><Rate v={featured.rating} /></div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {PLATS.map((p) => (
              <button key={p} onClick={() => setPlat(p)} className={`${TILE} ${plat === p ? ON : OFF}`}>
                {p === "PC" ? <Monitor size={22} /> : <Gamepad2 size={22} />}
                {p}
              </button>
            ))}
            <button onClick={() => setCatOpen((v) => !v)} className={`${TILE} ${catOpen || genre ? ON : OFF}`}>
              <LayoutGrid size={22} />Categorias
            </button>
          </div>
          {catOpen && (
            <div className="flex flex-wrap gap-2">
              {genres.length === 0 && <p className="text-[12px] text-neutral-500">Ainda sem categorias.</p>}
              {genres.map((x) => (
                <button key={x} onClick={() => setGenre(genre === x ? "" : x)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${genre === x ? "border-[#00FF88] bg-[#00FF88] text-black" : "border-white/15 text-neutral-300"}`}>
                  {x}
                </button>
              ))}
            </div>
          )}

          {filtering ? (
            filtered.length === 0 ? (
              <p className="pt-6 text-center text-[13px] text-neutral-500">Nenhum jogo encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((g) => <Card key={g.id} g={g} wide onOpen={() => setSel(g)} />)}
              </div>
            )
          ) : (
            <>
              {recommended.length > 0 && (
                <section className="space-y-2">
                  <h4 className="flex items-center gap-2 text-[16px] font-extrabold">
                    <Flame size={18} className="text-[#00FF88]" />Jogos Recomendados
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {recommended.map((g) => <Card key={g.id} g={g} onOpen={() => setSel(g)} />)}
                  </div>
                </section>
              )}
              {more.length > 0 && (
                <section className="space-y-2">
                  <h4 className="flex items-center gap-2 text-[16px] font-extrabold">
                    <Gamepad2 size={18} className="text-[#00FF88]" />Mais Jogos
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {more.map((g) => <Card key={g.id} g={g} wide onOpen={() => setSel(g)} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {player && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-black">
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
          <div className="flex items-center justify-between px-3 py-2">
            <button onClick={() => setPlayer("")} aria-label="Fechar"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <X size={18} />
            </button>
            <a href={`https://www.youtube.com/watch?v=${player}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold">
              <ExternalLink size={13} />Abrir no YouTube
            </a>
          </div>
          <div className="flex flex-1 items-center">
            <div className="aspect-video w-full">
              <iframe title="Vídeo do jogo" className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${player}?autoplay=1&rel=0&playsinline=1`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {shot && (
        <div onClick={() => setShot("")}
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 p-2">
          <img src={shot} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
