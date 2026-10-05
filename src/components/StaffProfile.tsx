import { LogOut, ShieldCheck } from "lucide-react";
import type { Staff } from "../lib/types";
import { permLabel } from "../lib/permissions";
import { initialsOf } from "../lib/format";
import { HouseAvatar } from "./shared";

export default function StaffProfile({
  staff, houseName, photo, onLogout,
}: { staff: Staff; houseName: string; photo: string; onLogout: () => void }) {
  return (
    <div className="space-y-3.5 px-4 pb-6">
      <h1 className="rise pt-1 text-center font-display text-[26px] font-extrabold uppercase tracking-wide">Conta</h1>
      <div className="rise flex items-center gap-3 rounded-2xl border border-[#00E5FF]/25 bg-gradient-to-r from-[#00E5FF]/10 to-transparent p-3.5">
        <HouseAvatar photo={photo} name={houseName} className="h-14 w-14 rounded-2xl text-[18px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold uppercase tracking-widest text-neutral-400">A sua sala de trabalho</span>
          <span className="block truncate font-display text-[21px] font-extrabold uppercase leading-tight">{houseName}</span>
        </span>
      </div>
      <div className="rise rise-1 flex items-center gap-3 rounded-2xl border border-[#FFC107]/25 bg-gradient-to-r from-[#FFC107]/10 to-transparent p-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-rose-600 font-display text-[16px] font-extrabold text-white">{initialsOf(staff.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[19px] font-extrabold uppercase leading-none">{staff.name}</span>
          <span className="block truncate text-[12px] text-neutral-400">Funcionário • {houseName}</span>
        </span>
      </div>

      <div className="rise rise-2 rounded-2xl border border-white/[0.07] bg-[#1e1e1e] p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400"><ShieldCheck size={13} /> O que pode fazer</p>
        {staff.perms.length === 0 ? (
          <p className="text-[12.5px] text-neutral-500">O proprietário ainda não lhe deu permissões.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {staff.perms.map((x) => (
              <span key={x} className="rounded-full bg-[#00E5FF]/12 px-2.5 py-1 text-[11.5px] font-semibold text-[#00E5FF]">{permLabel(x)}</span>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-neutral-500">Tudo o que fizer na app fica registado e visível para o proprietário.</p>

      <button onClick={onLogout} className="rise rise-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF4D6D]/30 bg-[#FF4D6D]/10 py-3 text-[13.5px] font-bold text-[#FF4D6D] active:scale-[0.98]">
        <LogOut size={16} /> Terminar sessão
      </button>
    </div>
  );
}
