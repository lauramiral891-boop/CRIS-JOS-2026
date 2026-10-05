import { Bell } from "lucide-react";
import { cn } from "../utils/cn";
import { initialsOf } from "../lib/format";

export function Logo({ big }: { big?: boolean }) {
  if (big) {
    return (
      <div className="flex flex-col items-center">
        <img src="./logo.png" alt="CJ Gerenciamento" className="h-44 w-44 rounded-full object-cover shadow-[0_0_40px_rgba(57,255,20,0.35)]" />
        <div className="mt-3 font-display text-[30px] font-extrabold uppercase leading-none tracking-wide">
          <span className="text-white">CJ </span><span className="bg-gradient-to-r from-[#7CFF1A] to-[#00FF88] bg-clip-text text-transparent">Gerenciamento</span>
        </div>
        <div className="mt-1 text-[10px] font-bold tracking-[0.28em] text-neutral-400">GESTÃO DE CASAS DE JOGOS</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <img src="./logo-192.png" alt="CJ Gerenciamento" className="h-10 w-10 rounded-full object-cover shadow-[0_0_14px_rgba(57,255,20,0.35)]" />
      <div className="leading-none">
        <div className="font-display text-[18px] font-extrabold uppercase tracking-wide">
          <span className="text-white">CJ </span><span className="bg-gradient-to-r from-[#7CFF1A] to-[#00FF88] bg-clip-text text-transparent">Gerenciamento</span>
        </div>
        <div className="mt-0.5 text-[8.5px] font-bold tracking-[0.2em] text-neutral-400">GESTÃO DE CASAS DE JOGOS</div>
      </div>
    </div>
  );
}

/** Foto da Game House (ou iniciais, se por algum motivo não houver foto). */
export function HouseAvatar({ photo, name, className }: { photo?: string; name: string; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-amber-500 to-rose-600 font-display font-extrabold text-white", className)}>
      {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" /> : initialsOf(name || "GH")}
    </span>
  );
}

export function TopHeader({
  onBell, notifCount, userName, houseName, photo,
}: {
  onBell: () => void;
  notifCount: number;
  userName: string;
  houseName: string;
  photo: string;
}) {
  const first = userName.trim().split(/\s+/)[0] || "Proprietário";
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <HouseAvatar photo={photo} name={houseName} className="h-10 w-10 rounded-xl border border-white/10 text-[13px]" />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-[17px] font-extrabold uppercase tracking-wide">{houseName}</div>
          <div className="truncate text-[10px] font-bold tracking-[0.18em] text-neutral-500">CJ GERENCIAMENTO</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="max-w-[72px] truncate text-[12.5px] font-medium text-neutral-200">Olá, {first}</span>
        <button
          onClick={onBell}
          className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#1e1e1e] text-neutral-200 transition active:scale-95"
          aria-label="Notificações"
        >
          <Bell size={17} className={notifCount > 0 ? "bell-shake" : ""} />
          {notifCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF4D6D] px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(255,77,109,0.8)]">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="font-display text-[17px] font-bold uppercase tracking-[0.08em] text-white">{children}</h2>
      {right}
    </div>
  );
}

export function NeonCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-[#1e1e1e]", className)}>{children}</div>
  );
}

export function ProgressBar({
  value, color, track = "bg-white/10", live = false,
}: { value: number; color: string; track?: string; live?: boolean }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", track)}>
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-linear", live && "bar-live")}
        style={{
          width: `${Math.max(3, Math.min(100, value))}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    </div>
  );
}
