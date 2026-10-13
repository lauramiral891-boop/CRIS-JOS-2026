import { useRef, useState } from "react";
import { Check, ChevronLeft, Copy, Download } from "lucide-react";
import { ExternalLink, Play } from "lucide-react";
import type { Game } from "../lib/types";
import { partsOf, ytId } from "../lib/gameUtils";
import { BOX, Cover, Rate } from "./GameBits";

type Props = {
  g: Game;
  onBack: () => void;
  onPlay: (id: string) => void;
  onShot: (src: string) => void;
};

const TABS: [string, string][] = [
  ["desc", "Descrição"],
  ["video", "Vídeo"],
  ["shots", "Capturas"],
  ["links", "Links"],
];

const BIG =
  "flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7CFF1A] to-[#00FF88] py-3.5 text-[14px] font-extrabold text-black active:scale-[0.98]";

function PlayBtn({ vid, onPlay }: { vid: string; onPlay: (id: string) => void }) {
  const thumb = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
  return (
    <button onClick={() => onPlay(vid)} className="relative block w-full overflow-hidden rounded-2xl">
      <img src={thumb} alt="" className="aspect-video w-full object-cover" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-black/50">
          <Play size={28} fill="white" />
        </span>
      </span>
    </button>
  );
}

export default function GameDetail({ g, onBack, onPlay, onShot }: Props) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [tab, setTab] = useState("desc");
  const [copied, setCopied] = useState("");
  const vid = ytId(g.trailer ?? "");
  const parts = partsOf(g);
  const shots = g.shots ?? [];
  const info: [string, string | undefined][] = [
    ["Lançamento", g.releaseDate],
    ["Desenvolvedora", g.developer],
    ["Género", g.genre],
    ["Idioma", g.language],
  ];

  const go = (k: string) => {
    setTab(k);
    refs.current[k]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const el = document.createElement("textarea");
      el.value = t;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { /* ignora */ }
      el.remove();
    }
    setCopied(t);
    setTimeout(() => setCopied(""), 1600);
  };

  return (
    <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 pb-16 pt-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display text-[19px] font-extrabold">Detalhes do Jogo</h3>
      </div>

      {vid ? <PlayBtn vid={vid} onPlay={onPlay} /> : (
        <Cover g={g} className="aspect-video w-full rounded-2xl" />
      )}

      <div className={`${BOX} flex gap-3`}>
        <Cover g={g} className="h-28 w-24 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-display text-[20px] font-extrabold leading-tight">{g.name}</h4>
            <Rate v={g.rating} />
          </div>
          {g.genre && <p className="text-[12px] text-neutral-400">{g.genre}</p>}
          <div className="flex flex-wrap gap-1.5">
            {(g.platforms ?? []).map((p) => (
              <span key={p} className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-neutral-300">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {parts.length === 1 && (
        <a href={parts[0].href} target="_blank" rel="noopener noreferrer" className={BIG}>
          <Download size={17} />Baixar Agora
        </a>
      )}
      {parts.length > 1 && (
        <button onClick={() => go("links")} className={BIG}>
          <Download size={17} />Baixar Agora ({parts.length} partes)
        </button>
      )}
      {parts.length === 0 && (
        <p className="rounded-full bg-neutral-700 py-3 text-center text-[12px] font-bold uppercase text-neutral-300">Link indisponível</p>
      )}
      {g.size && <p className="-mt-2 text-center text-[12px] text-neutral-400">Tamanho: {g.size}</p>}

      <div className="flex gap-5 overflow-x-auto border-b border-white/10">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => go(k)}
            className={`shrink-0 border-b-2 pb-2 text-[14px] font-semibold ${tab === k ? "border-[#00FF88] text-[#00FF88]" : "border-transparent text-neutral-300"}`}>
            {l}
          </button>
        ))}
      </div>

      <section ref={(el) => { refs.current.desc = el; }} className={`${BOX} space-y-3`}>
        <h5 className="text-[16px] font-extrabold">Sobre o Jogo</h5>
        {g.description && (
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-200">{g.description}</p>
        )}
        {info.filter((r) => r[1]).map(([l, v]) => (
          <div key={l} className="text-[12.5px]">
            <p className="text-neutral-400">{l}</p>
            <p className="font-semibold">{v}</p>
          </div>
        ))}
      </section>

      {vid && (
        <section ref={(el) => { refs.current.video = el; }} className={`${BOX} space-y-2`}>
          <h5 className="text-[16px] font-extrabold">Vídeo do Jogo</h5>
          <PlayBtn vid={vid} onPlay={onPlay} />
        </section>
      )}

      {shots.length > 0 && (
        <section ref={(el) => { refs.current.shots = el; }} className={`${BOX} space-y-2`}>
          <h5 className="text-[16px] font-extrabold">Capturas de Ecrã</h5>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {shots.map((s, i) => (
              <button key={i} onClick={() => onShot(s)} className="shrink-0">
                <img src={s} alt="" loading="lazy" className="h-24 w-36 rounded-lg object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section ref={(el) => { refs.current.links = el; }} className={`${BOX} space-y-2`}>
        <h5 className="text-[16px] font-extrabold">
          {parts.length > 1 ? "Download por partes" : "Links e Recursos"}
        </h5>
        {parts.length === 0 && (
          <p className="text-[12.5px] text-neutral-400">Sem links por agora.</p>
        )}
        {parts.map((p) => (
          <div key={p.href} className="rounded-xl border border-white/10 bg-black/30 p-2.5">
            <p className="text-[13px] font-bold">{p.label}</p>
            <p className="truncate text-[11px] text-neutral-500">{p.href}</p>
            <div className="mt-2 flex gap-2">
              <a href={p.href} target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00FF88] py-2 text-[12.5px] font-extrabold text-black">
                <Download size={14} />Baixar
              </a>
              <button onClick={() => copy(p.href)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#00FF88]/50 py-2 text-[12.5px] font-bold text-[#00FF88]">
                {copied === p.href ? <Check size={14} /> : <Copy size={14} />}
                {copied === p.href ? "Copiado" : "Copiar Link"}
              </button>
            </div>
          </div>
        ))}
        {vid && (
          <a href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-[12.5px] font-semibold">
            <ExternalLink size={15} className="text-[#00FF88]" />Abrir trailer no YouTube
          </a>
        )}
      </section>

      <p className="px-2 text-center text-[10.5px] text-neutral-500">
        Sempre use fontes confiáveis e verifique a compatibilidade do seu dispositivo.
      </p>
    </div>
  );
}
