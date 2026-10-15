import { Globe, UserPlus } from "lucide-react";
import type { Member } from "../lib/commApi";
import { Avatar } from "./PostBits";

export default function GroupHeader({ members }: { members: Member[] }) {
  const invite = async () => {
    const text = "Entra na comunidade Cris José Gamers!";
    try {
      if (navigator.share) await navigator.share({ title: "Cris José Gamers", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelado */
    }
  };
  return (
    <div>
      <div className="grid h-40 place-items-center bg-gradient-to-br from-[#00FF88]/30 via-[#0a1a14] to-[#00E5FF]/25">
        <img src="./logo-192.png" alt="CJ"
          className="h-24 w-24 rounded-full object-cover shadow-[0_0_30px_rgba(0,255,136,0.5)]" />
      </div>
      <div className="space-y-3 bg-[#0e1512] px-4 py-4">
        <h2 className="font-display text-[26px] font-extrabold leading-tight">
          Cris José<span className="text-[#00FF88]">Gamers</span>
        </h2>
        <p className="flex items-center gap-2 text-[13px] text-neutral-300">
          <Globe size={15} />
          Grupo Público · <b className="text-white">{members.length}</b> {members.length === 1 ? "membro" : "membros"}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 6).map((m) => <Avatar key={m.id} name={m.name} photo={m.photo} size={36} />)}
          </div>
          <button onClick={invite}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#00FF88] px-4 py-2.5 text-[13px] font-extrabold text-black active:scale-95">
            <UserPlus size={15} />Convidar
          </button>
        </div>
      </div>
    </div>
  );
}
