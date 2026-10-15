import { useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { hasSession } from "../lib/cloud";
import CommunityFeed from "./CommunityFeed";

type Acc = { ownerName?: string; houseName?: string; login?: string; photo?: string };
type Props = { onClose: () => void; account: object };

export default function CommunityRoom({ onClose, account }: Props) {
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const a = account as Acc;
  const email = String(a.login ?? "").trim().toLowerCase();
  const name = a.ownerName || a.houseName || "Jogador";
  const linked = !!email && hasSession(email);
  const toggle = () => {
    setFind((v) => !v);
    setQ("");
  };

  return (
    <div className="fade absolute inset-0 z-40 flex flex-col bg-[#050d0a] text-white">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
        <button onClick={onClose} aria-label="Voltar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-center font-display text-[17px] font-extrabold uppercase">
          Cris José Gamers
        </h3>
        <button onClick={toggle} aria-label="Pesquisar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
          {find ? <X size={17} /> : <Search size={17} />}
        </button>
      </div>
      {find && (
        <div className="relative mx-3 my-2">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar publicações, pessoas…"
            className="w-full rounded-full border border-[#00FF88]/40 bg-[#0a1a14] py-2.5 pl-10 pr-4 text-[13.5px] outline-none placeholder:text-neutral-500 focus:border-[#00FF88]" />
        </div>
      )}
      <div className="thin-scroll flex-1 overflow-y-auto pb-10">
        {linked ? (
          <CommunityFeed email={email} name={name} photo={a.photo ?? ""} q={q} />
        ) : (
          <div className="m-4 rounded-2xl border border-dashed border-white/20 p-6 text-center">
            <p className="text-[14px] font-bold">Ligue a sua conta à nuvem</p>
            <p className="mt-1 text-[12.5px] text-neutral-400">
              Para entrar no grupo, abra Definições → Conta online (nuvem) → Ligar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
