import { loadGlobalAdm as loadGlobalAdmForBlock } from "../lib/adm";
import { useEffect, useState } from "react";
import { Lock, X, BellRing, Megaphone, Clock3, Phone, MessageCircle, ExternalLink, Send, ChevronLeft } from "lucide-react";
import type { Ad, AdminData, Room, RoomBlock } from "../lib/types";
import type { BillInfo } from "../lib/billing";
import { Field, PrimaryButton, ErrorBox, fieldCls } from "./ui";
import { formatAOAshort } from "../lib/format";
import { cn } from "../utils/cn";

/** Ecrã mostrado a quem tem o acesso bloqueado por falta de pagamento. Os dados ficam guardados. */
export function Paywall({
  admin, houseName, isOwner, onSubmit, onRedeem,
}: {
  admin: AdminData; houseName: string; isOwner: boolean;
  onSubmit: (amount: number, method: string, ref: string) => void;
  onRedeem: (code: string) => Promise<boolean>;
}) {
  const b = admin.billing;
  const pending = b.payments.some((p) => p.status === "pending");
  const [f, setF] = useState({ amount: String(b.amount || ""), method: "", ref: "" });
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [redeeming, setRedeeming] = useState(false);
  return (
    <div className="thin-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-6">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FF4D6D]/15 text-[#FF4D6D]"><Lock size={28} /></span>
      <h2 className="text-center font-display text-[24px] font-extrabold uppercase">Acesso suspenso</h2>
      <p className="text-center text-[13px] leading-relaxed text-neutral-300">
        {b.manualBlock ? `O acesso de ${houseName || "esta casa"} foi suspenso pelo administrador.` : `O pagamento de ${houseName || "esta casa"} está em atraso.`} Os seus dados estão guardados e voltam assim que o acesso for renovado.
      </p>
      {b.amount > 0 && <p className="text-center font-display text-[26px] font-extrabold text-[#FFC107]">{formatAOAshort(b.amount)}</p>}
      {b.instructions && <div className="whitespace-pre-line rounded-2xl border border-white/10 bg-[#1b1b1b] p-3.5 text-[12.5px] text-neutral-300">{b.instructions}</div>}
      <p className="text-center text-[11px] text-neutral-500">ID desta casa: <b className="text-neutral-300">{admin.houseId}</b></p>

      {!isOwner ? (
        <p className="rounded-xl bg-white/[0.05] p-3 text-center text-[12px] text-neutral-400">Fale com o proprietário para regularizar o pagamento.</p>
      ) : pending ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-[#FFC107]/10 p-3 text-center text-[12.5px] font-semibold text-[#FFC107]"><Clock3 size={15} /> Pagamento enviado — à espera de confirmação do ADM.</p>
      ) : (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-[#1b1b1b] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Já paguei</p>
          <Field label="Valor pago (AOA)"><input inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={fieldCls} /></Field>
          <Field label="Forma de pagamento"><input value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} placeholder="Multicaixa, Unitel Money, transferência…" className={fieldCls} /></Field>
          <Field label="Referência / comprovativo"><input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} className={fieldCls} /></Field>
          <PrimaryButton tone="cyan" disabled={!(Number(f.amount.replace(/\D/g, "")) > 0)} onClick={() => onSubmit(Number(f.amount.replace(/\D/g, "")), f.method.trim() || "Não indicado", f.ref.trim())}>Enviar para confirmação</PrimaryButton>
        </div>
      )}

      {isOwner && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-[#1b1b1b] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Tenho um código de ativação</p>
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(""); }} placeholder="PAG-XXXX-XXXXXXXX" className={cn(fieldCls, "font-mono")} />
          <ErrorBox msg={err} />
          <PrimaryButton tone="green" disabled={!code.trim() || redeeming} onClick={async () => { setRedeeming(true); setErr(""); try { if (!await onRedeem(code)) setErr("Código inválido, expirado ou de outra casa. Verifica a internet e tenta novamente."); } catch { setErr("Não foi possível validar o código. Verifica a internet e tenta novamente."); } finally { setRedeeming(false); } }}>{redeeming ? "A validar..." : "Ativar"}</PrimaryButton>
        </div>
      )}
    </div>
  );
}

/** Aviso no topo quando o pagamento está a vencer ou em atraso. */
export function BillBanner({ info, onAdm }: { info: BillInfo; onAdm?: () => void }) {
  if (info.status !== "soon" && info.status !== "overdue") return null;
  const late = info.status === "overdue";
  return (
    <p className={cn("mx-4 mt-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold", late ? "border-[#FF4D6D]/40 bg-[#FF4D6D]/10 text-[#FF8FA3]" : "border-[#FFC107]/40 bg-[#FFC107]/10 text-[#FFC107]")}>
      {late ? "Pagamento em atraso: o acesso será suspenso em breve." : `O acesso vence em ${Math.max(0, info.daysLeft ?? 0)} dia(s).`} {onAdm && <button onClick={onAdm} className="underline">Pagar</button>}
    </p>
  );
}

/** Pede permissão para notificações do telemóvel. */
export function NotifPrompt({ onAllow, onLater }: { onAllow: () => void; onLater: () => void }) {
  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#00E5FF]/20 text-[#00E5FF]"><BellRing size={17} /></span>
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-neutral-200">Receba alertas no telemóvel (tempo esgotado, reservas, pagamentos).</p>
      <button onClick={onAllow} className="shrink-0 rounded-lg bg-[#00E5FF] px-3 py-1.5 text-[11px] font-extrabold uppercase text-black">Ativar</button>
      <button onClick={onLater} aria-label="Mais tarde" className="shrink-0 text-neutral-500"><X size={15} /></button>
    </div>
  );
}

/* ---------------- Rodapé de anúncios: fotos do ADM que deslizam ---------------- */
export function AdBanner({ ads, slideSec = 5, onView, onClick }: { ads: Ad[]; slideSec?: number; onView: (id: number) => void; onClick: (ad: Ad) => void }) {
  const [i, setI] = useState(0); const [hidden, setHidden] = useState(false);
  const [drag, setDrag] = useState<{ x0: number; dx: number } | null>(null);
  const n = ads.length;
  const key = ads.map((a) => a.id).join(",");
  useEffect(() => { setI(0); }, [key]);
  useEffect(() => {
    if (n < 2 || drag) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), Math.max(2, slideSec) * 1000);
    return () => clearInterval(t);
  }, [key, n, slideSec, drag]);
  const cur = ads[Math.min(i, Math.max(0, n - 1))];
  useEffect(() => { if (cur && !hidden) onView(cur.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cur?.id, hidden]);
  if (!cur || hidden) return null;

  const go = (d: number) => setI((x) => (x + d + n) % n);
  const end = () => {
    if (drag && Math.abs(drag.dx) > 40 && n > 1) go(drag.dx < 0 ? 1 : -1);
    setDrag(null);
  };
  const shift = drag ? drag.dx : 0;

  return (
    <div className="relative mx-3 mb-2 overflow-hidden rounded-2xl border border-[#FFC107]/25 bg-[#0e0e0e] select-none">
      <div
        className="flex touch-pan-y"
        style={{ transform: `translateX(calc(${-i * 100}% + ${shift}px))`, transition: drag ? "none" : "transform 480ms cubic-bezier(.22,.8,.3,1)" }}
        onTouchStart={(e) => setDrag({ x0: e.touches[0].clientX, dx: 0 })}
        onTouchMove={(e) => setDrag((d) => (d ? { ...d, dx: e.touches[0].clientX - d.x0 } : d))}
        onTouchEnd={end}
        onTouchCancel={() => setDrag(null)}
      >
        {ads.map((a) => (
          <button key={a.id} onClick={() => { if (Math.abs(shift) < 8) onClick(a); }} className="relative block h-[104px] w-full shrink-0 text-left">
            {a.image ? (
              <>
                <img src={a.image} alt={a.title || "Anúncio"} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                {(a.title || a.text) && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-6">
                    {a.title && <span className="block truncate text-[13px] font-extrabold text-white">{a.title}</span>}
                    {a.text && <span className="block truncate text-[11px] text-neutral-200">{a.text}</span>}
                  </span>
                )}
              </>
            ) : (
              <span className="flex h-full items-center gap-3 bg-gradient-to-r from-[#FFC107]/12 to-[#FF7A1A]/12 px-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFC107]/20 text-[#FFC107]"><Megaphone size={18} /></span>
                <span className="min-w-0"><span className="block truncate text-[13px] font-bold">{a.title}</span><span className="line-clamp-2 text-[11.5px] text-neutral-300">{a.text}</span></span>
              </span>
            )}
          </button>
        ))}
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-neutral-300">Anúncio</span>
      <button onClick={() => setHidden(true)} aria-label="Fechar anúncio" className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-neutral-200"><X size={13} /></button>
      {n > 1 && (
        <span className="pointer-events-none absolute right-2.5 bottom-2 flex gap-1">
          {ads.map((a, k) => <span key={a.id} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-4 bg-white" : "w-1.5 bg-white/45")} />)}
        </span>
      )}
    </div>
  );
}

/** Atalhos das salas criadas pelo ADM. */
export function RoomChips({ rooms, onOpen, gamesCount = 0, onGames }: { rooms: Room[]; onOpen: (r: Room) => void; gamesCount?: number; onGames?: () => void }) {
  if (!rooms.length && !(gamesCount > 0 && onGames)) return null;
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2">
      {gamesCount > 0 && onGames && (
        <button onClick={onGames} className="shrink-0 rounded-full border border-[#7CFF1A]/50 bg-[#7CFF1A]/10 px-3 py-1.5 text-[12px] font-extrabold text-[#7CFF1A]">
          🎮 Sala de Jogos
        </button>
      )}
      {rooms.map((r) => (
        <button key={r.id} onClick={() => onOpen(r)} style={r.color ? { borderColor: `${r.color}66`, background: `${r.color}14` } : undefined} className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold">
          {r.emoji} {r.name}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Sala: capa, cor e blocos com funções reais ---------------- */
const digits = (v: string) => v.replace(/\D/g, "");
/** 9 dígitos = número de Angola (+244). */
export const waLink = (number: string, msg = "") => {
  let d = digits(number);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = `244${d}`;
  return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
};

function Block({ b, color, roomName }: { b: RoomBlock; color: string; roomName: string }) {
  const [f, setF] = useState({ name: "", phone: "", extra: "" });
  const heading = (t?: string) => t ? <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider" style={{ color }}>{t}</p> : null;
  const card = "rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-3.5";
  switch (b.kind) {
    case "text":
      return <div className={card}>{heading(b.title)}<p className="whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-200">{b.text}</p></div>;
    case "list":
      return (
        <div className={card}>
          {heading(b.title || (b.variant === "prices" ? "Tabela de preços" : b.variant === "schedule" ? "Horários" : "Regras"))}
          {b.items.map((it, k) => (
            <div key={k} className="flex items-start justify-between gap-3 border-t border-white/[0.06] py-2 first:border-0 first:pt-0">
              <span className={cn("text-[13px]", b.variant === "rules" ? "text-neutral-200" : "font-semibold")}>{b.variant === "rules" ? `${k + 1}. ${it.left}` : it.left}</span>
              {b.variant !== "rules" && <span className="shrink-0 text-[13px] font-extrabold" style={{ color }}>{it.right}</span>}
            </div>
          ))}
        </div>
      );
    case "button": {
      const href = b.mode === "whatsapp" ? waLink(b.target, b.message) : b.mode === "call" ? `tel:${digits(b.target) || b.target}` : b.target;
      const Icon = b.mode === "whatsapp" ? MessageCircle : b.mode === "call" ? Phone : ExternalLink;
      return (
        <a href={href} target={b.mode === "link" ? "_blank" : undefined} rel="noopener noreferrer" style={{ background: color }} className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[13px] font-extrabold uppercase text-black active:scale-[0.98]">
          <Icon size={17} /> {b.label}
        </a>
      );
    }
    case "gallery":
      return (
        <div>
          {heading(b.title)}
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
            {b.images.map((src, k) => <img key={k} src={src} alt="" className="h-48 w-[78%] shrink-0 snap-center rounded-2xl object-cover" />)}
          </div>
        </div>
      );
    case "signup": {
      const ok = f.name.trim().length > 1 && digits(f.phone).length >= 9;
      const send = () => {
        const msg = [`Inscrição — ${b.title} (${roomName})`, `Nome: ${f.name.trim()}`, `Telefone: ${f.phone.trim()}`, b.askExtra && f.extra.trim() ? `${b.askExtra}: ${f.extra.trim()}` : ""].filter(Boolean).join("\n");
        window.open(waLink(b.whatsapp, msg), "_blank", "noopener");
      };
      const inp = "w-full rounded-xl border border-white/10 bg-[#252525] px-3 py-2.5 text-[13px] outline-none focus:border-white/40";
      return (
        <div className={card}>
          {heading(b.title)}
          {b.note && <p className="mb-2 text-[12px] text-neutral-400">{b.note}</p>}
          <div className="space-y-2">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="O seu nome" className={inp} />
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="Telefone / WhatsApp" className={inp} />
            {b.askExtra && <input value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} placeholder={b.askExtra} className={inp} />}
            <button disabled={!ok} onClick={send} style={{ background: color }} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold uppercase text-black disabled:opacity-40"><Send size={15} /> Enviar inscrição</button>
            <p className="text-center text-[10.5px] text-neutral-500">Abre o WhatsApp com a mensagem pronta — toque em enviar.</p>
          </div>
        </div>
      );
    }
  }
}

export function RoomView({ room, onClose }: { room: Room; onClose: () => void }) {
  const color = room.color || "#00E5FF";
  const blocks = room.blocks ?? [];
  return (
    <div className="fade absolute inset-0 z-40 flex flex-col bg-[#121212]">
      <div className="relative shrink-0">
        {room.cover ? (
          <div className="relative h-36">
            <img src={room.cover} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/30 to-black/40" />
          </div>
        ) : <div className="h-14" style={{ background: `linear-gradient(180deg, ${color}2e, transparent)` }} />}
        <button onClick={onClose} className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white" aria-label="Voltar"><ChevronLeft size={18} /></button>
        <div className={cn("px-4", room.cover ? "absolute inset-x-0 bottom-2" : "-mt-3 pb-1")}>
          <h3 className="font-display text-[26px] font-extrabold uppercase leading-none">{room.emoji} {room.name}</h3>
          {room.subtitle && <p className="mt-1 text-[12px] font-semibold" style={{ color }}>{room.subtitle}</p>}
        </div>
      </div>
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 pb-8 pt-3">
        {room.content && <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-neutral-200">{room.content}</p>}
        {blocks.map((b) => <Block key={b.id} b={b} color={color} roomName={room.name} />)}
        {!room.content && blocks.length === 0 && <p className="text-[13px] text-neutral-500">Esta sala ainda não tem conteúdo.</p>}
      </div>
    </div>
  );
}


/* Ecrã de conta bloqueada pelo servidor (texto e imagem editáveis pelo ADM) */
export function BlockedScreen({ houseId, houseName }: { houseId: string; houseName: string }) {
  const [cfg] = useState(() => loadGlobalAdmForBlock().blockScreen);
  const title = cfg?.title?.trim() || "Conta Bloqueada";
  const text = cfg?.text?.trim() || "Chame um assistente para fazer o pagamento.";
  const num = cfg?.whatsapp?.trim() || "945379003";
  const digits = num.replace(/\D/g, "");
  const msg = `Olá! A minha conta está bloqueada. Casa: ${houseName || "-"}. ID: ${houseId}. Quero fazer o pagamento.`;
  const bt = "block w-full rounded-xl px-3 py-3 text-center text-[13px] font-extrabold uppercase active:scale-95";
  return (
    <div className="thin-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-6">
      {cfg?.image
        ? <img src={cfg.image} alt="" className="mx-auto max-h-56 w-full rounded-2xl object-cover" />
        : <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FF4D6D]/15 text-[#FF4D6D]"><Lock size={28} /></span>}
      <h2 className="text-center font-display text-[24px] font-extrabold uppercase">{title}</h2>
      <p className="whitespace-pre-line text-center text-[13px] leading-relaxed text-neutral-300">{text}</p>
      <a href={waLink(digits, msg)} target="_blank" rel="noopener noreferrer" className={bt + " bg-[#00FF88] text-black"}>WhatsApp {num}</a>
      <a href={"tel:" + digits} className={bt + " bg-white/10 text-white"}>Ligar {num}</a>
      <p className="text-center text-[11px] text-neutral-500">ID desta casa: <b className="text-neutral-300">{houseId}</b></p>
    </div>
  );
}
