import { useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { hasSession } from "../lib/cloud";
import CommunityFeed from "./CommunityFeed";

type Acc = { ownerName?: string; houseName?: string; login?: string; photo?: string };
type Props = { onClose: () => void; account: object };

export default function CommunityRoom({ onClose, account }: Props) {
  const [q, setQ] = useState("");
  const a = account as Acc;
  const email = String(a.login ?? "").trim().toLowerCase();
  const name = a.ownerName || a.houseName || "Jogador";
  const linked = !!email && hasSession(email);

  return (
    <div className="fade absolute inset-0 z-40 flex flex-col bg-[#050d0a] text-white">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 pb-10 pt-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Voltar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
            <ChevronLeft size={18} />
          </button>
          <img src="./logo-192.png" alt="CJ"
            className="h-12 w-12 shrink-0 rounded-full object-cover shadow-[0_0_18px_rgba(0,255,136,0.45)]" />
          <div className="leading-tight">
            <h3 className="font-display text-[21px] font-extrabold">
              Cris José<span className="text-[#00FF88]">Gamers</span>
            </h3>
            <p className="text-[11px] italic text-neutral-300">Mais que jogos, é paixão!</p>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar publicações, pessoas…"
            className="w-full rounded-full border border-[#00FF88]/40 bg-[#0a1a14] py-3 pl-10 pr-9 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#00FF88]" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Limpar"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <X size={15} />
            </button>
          )}
        </div>

        {linked ? (
          <CommunityFeed email={email} name={name} photo={a.photo ?? ""} q={q} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center">
            <p className="text-[14px] font-bold">Ligue a sua conta à nuvem</p>
            <p className="mt-1 text-[12.5px] text-neutral-400">
              Para entrar na Comunidade, abra Definições → Conta online (nuvem) → Ligar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
