import { Bot, Clock3, MessageCircle, Users } from "lucide-react";
import type { Manager } from "../lib/types";
import Sheet from "./Sheet";
import { waLink } from "./BillingUI";
import { BRAND } from "../lib/brain";

/** Mensagem pronta para o gerente: já leva o nome da casa, do dono e o ID. */
export const helpMessage = (m: Manager, house: string, owner: string, id: string, topic = "") =>
  `Olá ${m.name.split(" ")[0]}! Sou ${owner || "proprietário(a)"}, da Game House "${house || "—"}"${id ? ` (ID ${id})` : ""}. Preciso de ajuda${topic ? ` com: ${topic}` : ""}. Vim pela app ${BRAND.name}.`;

export const activeManagers = (l: Manager[]) => l.filter((m) => m.active && m.whatsapp.replace(/\D/g, "").length >= 9);

export function ManagerButtons({ managers, house, owner, id, topic, limit }: { managers: Manager[]; house: string; owner: string; id: string; topic?: string; limit?: number }) {
  const list = activeManagers(managers).slice(0, limit ?? 12);
  if (!list.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {list.map((m) => (
        <a key={m.id} href={waLink(m.whatsapp, helpMessage(m, house, owner, id, topic))} target="_blank" rel="noreferrer"
          className="flex items-center gap-2.5 rounded-xl bg-[#25D366] px-3 py-2 text-black active:scale-[0.98]">
          <MessageCircle size={17} className="shrink-0" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-extrabold">{m.name}</span>
            <span className="block truncate text-[11px] font-semibold opacity-75">{m.role}{m.hours ? ` • ${m.hours}` : ""}</span>
          </span>
          <span className="shrink-0 text-[11px] font-extrabold uppercase">WhatsApp</span>
        </a>
      ))}
    </div>
  );
}

export default function HelpSheet({ managers, house, owner, id, onAsk, onClose }: {
  managers: Manager[]; house: string; owner: string; id: string; onAsk?: () => void; onClose: () => void;
}) {
  const has = activeManagers(managers).length > 0;
  return (
    <Sheet title="Ajuda" subtitle={`Estamos juntos! Equipa ${BRAND.name}`} accent="#25D366" onClose={onClose} z={70}>
      <div className="mt-3 space-y-3">
        {onAsk && (
          <button onClick={() => { onClose(); onAsk(); }} className="flex w-full items-center gap-3 rounded-2xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 p-3 text-left active:scale-[0.98]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#00FF88] text-black"><Bot size={20} /></span>
            <span className="leading-tight"><b className="block text-[14px]">Falar com a assistente IA</b><span className="text-[11.5px] text-neutral-400">Respondo na hora sobre a app e o seu negócio</span></span>
          </button>
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400"><Users size={13} /> Gerentes reais</p>
        {has ? (
          <>
            <p className="text-[12px] leading-relaxed text-neutral-400">Toque no gerente para abrir o WhatsApp. A mensagem já vai com o nome da sua Game House e o seu ID.</p>
            <ManagerButtons managers={managers} house={house} owner={owner} id={id} />
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-500"><Clock3 size={12} /> Para pagamentos, tenha o comprovativo à mão.</p>
          </>
        ) : (
          <p className="rounded-xl bg-white/[0.05] p-3 text-[12.5px] leading-relaxed text-neutral-300">Os contactos dos gerentes ainda não foram publicados. Enquanto isso, pergunte à assistente IA — e volte aqui mais tarde.</p>
        )}
      </div>
    </Sheet>
  );
}
