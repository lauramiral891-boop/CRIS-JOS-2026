import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleHelp, GraduationCap, SkipForward, X } from "lucide-react";
import type { Room } from "../lib/types";

type MainTab = "home" | "bookings" | "players" | "finances" | "settings";
interface Step { tab: MainTab; target: string; title: string; text: string; tip: string }
const STEPS: Step[] = [
  { tab: "home", target: "home", title: "Painel principal e máquinas", text: "Aqui vê o mapa das máquinas, sessões em curso e indicadores do dia. Toque numa máquina para abrir as opções reais dessa máquina.", tip: "Confirme o estado das máquinas antes de iniciar uma sessão." },
  { tab: "home", target: "start", title: "Máquinas e sessões", text: "A ação rápida Iniciar Sessão abre o formulário para escolher máquina, jogador, pacote e duração. As sessões temporizadas mostram o tempo e podem gerar avisos de fim.", tip: "Confira o pacote e o preço antes de confirmar o início." },
  { tab: "bookings", target: "bookings", title: "Reservas", text: "Consulte e registe as reservas existentes nesta área. As opções disponíveis dependem das permissões da sua conta.", tip: "Confirme data, hora e máquina antes de guardar." },
  { tab: "players", target: "players", title: "Jogadores e clientes", text: "Esta sala contém os registos de jogadores/clientes existentes. Use os formulários e a pesquisa da interface para consultar ou atualizar os registos permitidos.", tip: "Registe apenas os dados necessários e mantenha os contactos corretos." },
  { tab: "home", target: "sell", title: "Vendas e stock", text: "Em Ações Rápidas, Vender Produtos abre o fluxo de venda. Sala de Stock permite gerir o inventário, se tiver essa permissão. As vendas registadas aparecem nas finanças.", tip: "Confirme quantidade, preço e total antes de concluir uma venda." },
  { tab: "finances", target: "reports", title: "Finanças, relatórios e PDF", text: "Consulte entradas, despesas e resultados. Abra Ver Relatórios para escolher dia, semana, mês, trimestre, ano ou calendário. O PDF inclui os movimentos reais do período e, para o proprietário, o resumo de utilização das máquinas e funcionários.", tip: "Reveja o período e os totais antes de descarregar ou partilhar o PDF." },
  { tab: "settings", target: "settings", title: "Definições e perfil", text: "Aqui encontra as configurações que a sua conta tem autorização para alterar: perfil, horário, pacotes, notificações, cópia de segurança e outras opções visíveis.", tip: "Nunca partilhe palavras-passe, códigos de convite ou chaves de API." },
  { tab: "settings", target: "staff", title: "Gestão de funcionários", text: "O proprietário pode abrir Funcionários para gerir acessos e permissões. Os funcionários não recebem esta opção a menos que o sistema lhes permita explicitamente.", tip: "Dê a cada funcionário apenas as permissões necessárias." },
];

const TAB_INTROS: Record<MainTab, { title: string; text: string; tip: string }> = {
  home: { title: "Início: painel e máquinas", text: "Este painel reúne o mapa das máquinas, sessões ativas, indicadores do dia e ações rápidas disponíveis para a sua conta.", tip: "Use o botão de ajuda sempre que precisar de rever os passos." },
  bookings: { title: "Reservas: como usar", text: "Nesta área pode consultar e gerir as reservas registadas na aplicação, usando as datas e opções visíveis no ecrã.", tip: "Confirme a data, a hora e a máquina antes de guardar." },
  players: { title: "Jogadores: como usar", text: "Aqui ficam os registos de jogadores/clientes disponíveis para a sua conta. As ações apresentadas respeitam as permissões atribuídas.", tip: "Mantenha os registos corretos e evite dados desnecessários." },
  finances: { title: "Finanças: como usar", text: "Veja as entradas, despesas e resultados. O botão Ver Relatórios abre os períodos e permite preparar um PDF quando tem essa permissão.", tip: "Confirme os valores antes de exportar ou partilhar." },
  settings: { title: "Definições: como usar", text: "Esta área apresenta as preferências e ferramentas permitidas para a sua conta. As opções de proprietário, incluindo a equipa, não são mostradas a funcionários sem autorização.", tip: "Não partilhe palavras-passe nem chaves de API." },
};

interface Props {
  userKey: string;
  tab: MainTab;
  onNavigate: (tab: MainTab) => void;
  isOwner: boolean;
  room: Room | null;
  openTrigger: number;
}
interface Progress { welcomeSeen: boolean; tourComplete: boolean; completed: string[]; seenRooms: string[] }
const blank: Progress = { welcomeSeen: false, tourComplete: false, completed: [], seenRooms: [] };
const storageKey = (key: string) => `cjg-guide-v1:${encodeURIComponent(key)}`;
function loadProgress(key: string): Progress {
  try { return { ...blank, ...(JSON.parse(localStorage.getItem(storageKey(key)) ?? "{}") as Partial<Progress>) }; }
  catch { return { ...blank }; }
}

export default function OnboardingGuide({ userKey, tab, onNavigate, isOwner, room, openTrigger }: Props) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(userKey));
  const [mode, setMode] = useState<"welcome" | "tour" | "tab" | "room" | null>(null);
  const [index, setIndex] = useState(0);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [pendingTab, setPendingTab] = useState<MainTab | null>(null);
  const prevTrigger = useRef(openTrigger);
  const steps = useMemo(() => isOwner ? STEPS : STEPS.filter((step) => step.target !== "staff"), [isOwner]);
  const current = steps[Math.min(index, steps.length - 1)];
  const tabIntro = pendingTab ? TAB_INTROS[pendingTab] : null;
  const roomTitle = room?.name?.trim() || "Esta sala";
  const roomDescription = room?.subtitle?.trim() || room?.content?.trim() || `Veja os conteúdos e as ações apresentados nesta sala. As opções disponíveis são as que aparecem no ecrã.`;

  useEffect(() => {
    const next = loadProgress(userKey);
    setProgress(next);
    setIndex(0);
    setMode(next.welcomeSeen ? null : "welcome");
    setPendingRoom(null);
  }, [userKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(userKey), JSON.stringify(progress)); } catch { /* o guia continua disponível nesta sessão */ }
  }, [progress, userKey]);

  useEffect(() => {
    if (openTrigger !== prevTrigger.current) {
      prevTrigger.current = openTrigger;
      setPendingRoom(null);
      setIndex(0);
      setMode("welcome");
    }
  }, [openTrigger]);

  useEffect(() => {
    if (!room) return;
    const roomKey = String(room.id);
    if (progress.seenRooms.includes(roomKey)) return;
    setPendingRoom(room);
    if (mode === null) setMode("room");
  }, [room?.id, progress.seenRooms, mode]);

  useEffect(() => {
    if (!progress.welcomeSeen || mode !== null || room) return;
    const key = `tab:${tab}`;
    if (progress.completed.includes(key)) return;
    setPendingTab(tab);
    setMode("tab");
  }, [tab, progress.welcomeSeen, progress.completed, mode, room]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-guide-id].guide-highlight").forEach((el) => el.classList.remove("guide-highlight"));
    if (mode !== "tour") return;
    const el = document.querySelector<HTMLElement>(`[data-guide-id="${current.target}"]`);
    if (el) {
      el.classList.add("guide-highlight");
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
    return () => { el?.classList.remove("guide-highlight"); };
  }, [mode, current.target, tab]);

  const closeWelcome = () => {
    setProgress((p) => ({ ...p, welcomeSeen: true }));
    setMode(null);
  };
  const closeTabIntro = () => {
    if (pendingTab) {
      const key = `tab:${pendingTab}`;
      setProgress((p) => ({ ...p, completed: p.completed.includes(key) ? p.completed : [...p.completed, key] }));
    }
    setPendingTab(null);
    setMode(null);
  };
  const startTour = () => {
    setProgress((p) => ({ ...p, welcomeSeen: true }));
    setIndex(0);
    onNavigate(steps[0].tab);
    setMode("tour");
  };
  const skipTour = () => {
    setProgress((p) => ({ ...p, welcomeSeen: true, tourComplete: true }));
    setMode(null);
  };
  const closeRoom = () => {
    if (pendingRoom) {
      const roomId = String(pendingRoom.id);
      setProgress((p) => ({ ...p, seenRooms: p.seenRooms.includes(roomId) ? p.seenRooms : [...p.seenRooms, roomId] }));
    }
    setPendingRoom(null);
    setMode(null);
  };
  const next = () => {
    setProgress((p) => {
      const keys = [`tab:${current.tab}`, `step:${current.target}`];
      return { ...p, completed: [...new Set([...p.completed, ...keys])] };
    });
    if (index >= steps.length - 1) {
      setProgress((p) => ({ ...p, tourComplete: true, welcomeSeen: true }));
      setMode(null);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    onNavigate(steps[nextIndex].tab);
  };
  const back = () => {
    if (index <= 0) { setMode("welcome"); return; }
    const prev = index - 1;
    setIndex(prev);
    onNavigate(steps[prev].tab);
  };
  const title = useMemo(() => isOwner ? "Bem-vindo à CJ Gerenciamento" : "Bem-vindo à CJ Gerenciamento", [isOwner]);
  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Guia da CJ Gerenciamento">
      <section className="w-full max-w-[430px] overflow-hidden rounded-3xl border border-[#00FF88]/35 bg-[#141816] shadow-[0_0_45px_rgba(0,255,136,0.18)]">
        <div className="h-1 bg-gradient-to-r from-[#00E5FF] via-[#00FF88] to-[#7CFF1A]" />
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="./logo-192.png" alt="Logótipo CJ Gerenciamento" className="h-12 w-12 rounded-full object-cover shadow-[0_0_18px_rgba(0,255,136,0.25)]" />
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#00FF88]">Guia inteligente</p><h2 className="mt-1 text-lg font-extrabold leading-tight text-white">{mode === "welcome" ? title : mode === "room" ? roomTitle : mode === "tab" ? (tabIntro?.title ?? "Ajuda da sala") : current.title}</h2></div>
            </div>
            <button onClick={mode === "room" ? closeRoom : mode === "tab" ? closeTabIntro : mode === "welcome" ? closeWelcome : skipTour} aria-label="Fechar guia" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-neutral-300"><X size={17} /></button>
          </div>

          {mode === "welcome" && <>
            <p className="text-sm leading-relaxed text-neutral-300">Vamos mostrar-lhe como usar as áreas reais da aplicação para gerir máquinas, sessões, reservas, clientes e finanças. As explicações ficam guardadas nesta conta e também funcionam sem internet.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={startTour} className="flex items-center justify-center gap-2 rounded-xl bg-[#00FF88] px-3 py-3 text-sm font-extrabold text-black"><GraduationCap size={17} /> Iniciar tutorial</button>
              <button onClick={closeWelcome} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-3 text-sm font-bold text-neutral-200"><SkipForward size={16} /> Saltar</button>
            </div>
            <button onClick={startTour} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-2.5 text-xs font-semibold text-neutral-300"><BookOpen size={15} /> Aprender passo a passo</button>
          </>}

          {mode === "tab" && tabIntro && <>
            <p className="text-sm leading-relaxed text-neutral-200">{tabIntro.text}</p>
            <p className="mt-3 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/[0.06] p-3 text-xs leading-relaxed text-neutral-300"><span className="font-extrabold text-[#00E5FF]">Dica: </span>{tabIntro.tip}</p>
            <button onClick={closeTabIntro} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-3 text-sm font-extrabold text-black"><CheckCircle2 size={16} /> Entendi, continuar</button>
          </>}

          {mode === "tour" && <>
            <div className="mb-3 flex items-center gap-1.5">{steps.map((s, i) => <span key={`${s.target}-${i}`} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-[#00FF88]" : "bg-white/10"}`} />)}</div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#00E5FF]">Passo {index + 1} de {steps.length} · {current.tab === "home" ? "Início" : current.tab === "bookings" ? "Reservas" : current.tab === "players" ? "Jogadores" : current.tab === "finances" ? "Finanças" : "Definições"}</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-200">{current.text}</p>
            <p className="mt-3 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/[0.06] p-3 text-xs leading-relaxed text-neutral-300"><span className="font-extrabold text-[#00E5FF]">Dica: </span>{current.tip}</p>
            {current.tab === "settings" && isOwner && <p className="mt-2 text-xs text-neutral-400">A gestão de funcionários só deve ser usada pelo proprietário e pelas contas autorizadas. A Sala ADM fica no ecrã de entrada e exige autorização própria.</p>}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={back} className="flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-neutral-300"><ArrowLeft size={15} /> Voltar</button>
              <button onClick={skipTour} className="px-2 py-2 text-xs font-semibold text-neutral-500">Saltar</button>
              <button onClick={next} className="flex items-center gap-1 rounded-xl bg-[#00FF88] px-4 py-2.5 text-xs font-extrabold text-black">{index === steps.length - 1 ? "Concluir" : "Avançar"} {index === steps.length - 1 ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}</button>
            </div>
          </>}

          {mode === "room" && <>
            <p className="text-sm leading-relaxed text-neutral-300">{roomDescription}</p>
            <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs leading-relaxed text-neutral-400">Esta explicação usa o nome e a descrição da sala configurada. Não altera os dados nem acrescenta permissões à sua conta.</p>
            <button onClick={closeRoom} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-3 text-sm font-extrabold text-black"><CircleHelp size={16} /> Entendi, continuar</button>
          </>}
        </div>
      </section>
    </div>
  );
}
