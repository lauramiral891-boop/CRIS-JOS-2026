import { useState } from "react";
import {
  User, Lock, Star, Monitor, DollarSign, Clock3, BellRing, Globe, CloudUpload, ShoppingCart, FileText, Bot,
  Info, LogOut, ChevronRight, LifeBuoy, Cloud, Volume2, Vibrate, AlarmClock, Target, Sun, Moon, UserPlus, History,
} from "lucide-react";
import { checkPass, hashPass } from "../lib/auth";
import {
  AboutSheet, BackupSheet, GoalSheet, HoursSheet, LanguageSheet, LogoutConfirm,
  PackagesSheet, PasswordSheet, ProfileSheet, SubscriptionSheet, subName,
} from "../components/SettingsSheets";
import type { PlanDraft } from "../components/PlanForm";
import HelpSheet from "../components/HelpSheet";
import CloudSheet from "../components/CloudSheet";
import { cloudOn, hasSession } from "../lib/cloud";
import { getAccount } from "../lib/accounts";
import { loadGlobalAdm } from "../lib/adm";
import { getNamespace } from "../lib/storage";
import type { Config, Tone } from "../lib/types";
import { formatAOAshort } from "../lib/format";
import { HouseAvatar } from "../components/shared";
import { uid } from "../lib/storage";
import { askNotifPermission } from "../lib/push";
import { cn } from "../utils/cn";

interface Row {
  icon: React.ElementType;
  label: string;
  value?: string;
  color: string;
  danger?: boolean;
  toggleOn?: boolean;
  action: () => void;
}

interface Props {
  config: Config;
  stationCount: number;
  now: number;
  onPatch: (p: Partial<Config>) => void;
  photo: string;
  accountId: string;
  onProfile: (p: Partial<Config>, photo: string) => void;
  onOpenStations: () => void;
  onTestAlarm: () => void;
  onLogout: () => void;
  onApplyPlans: () => void;
  onExport: () => void;
  onImport: (f: File) => void;
  onReset: () => void;
  onOpenSales: () => void;
  onOpenPdf: () => void;
  onOpenAI: () => void;
  isOwner?: boolean;
  onOpenStaff: () => void;
  onOpenActivity: () => void;
  staffCount: number;
  notify: (title: string, desc?: string, tone?: Tone) => void;
  toast: (title: string, desc?: string, tone?: Tone) => void;
}

type Sheet = null | "profile" | "password" | "sub" | "hours" | "packages" | "lang" | "backup" | "about" | "goal" | "logout" | "help" | "cloud";

const langName = { "pt-AO": "Português (AO)", "pt-PT": "Português (PT)", "pt-BR": "Português (BR)" } as const;

export default function SettingsScreen(p: Props) {
  const { config, notify, toast } = p;
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);

  const groups: Row[][] = [
    [
      { icon: User, label: "Informações do Perfil", value: config.ownerName.split(" ")[0], color: "text-[#00E5FF]", action: () => setSheet("profile") },
      { icon: Lock, label: "Alterar Palavra-passe", color: "text-[#00E5FF]", action: () => setSheet("password") },
      { icon: UserPlus, label: "Funcionários", value: p.staffCount > 0 ? `${p.staffCount} na equipa` : "Adicionar", color: "text-[#FFC107]", action: p.onOpenStaff },
      { icon: History, label: "Registo de Atividade", value: "Ver", color: "text-[#FFC107]", action: p.onOpenActivity },
      { icon: Star, label: "Gestão de Subscrição", value: `Plano ${subName(config.subPlan)}`, color: "text-[#FFC107]", action: () => setSheet("sub") },
    ],
    [
      { icon: Monitor, label: "Gestão de Máquinas", value: `${p.stationCount} Máquina${p.stationCount === 1 ? "" : "s"}`, color: "text-[#00E5FF]", action: p.onOpenStations },
      { icon: DollarSign, label: "Tempos, Preços e Pacotes", value: `${config.defaultPlans.length} pacotes`, color: "text-[#00FF88]", action: () => setSheet("packages") },
      { icon: Clock3, label: "Horário de Funcionamento", value: `${config.openTime} - ${config.closeTime}`, color: "text-[#00FF88]", action: () => setSheet("hours") },
      { icon: Target, label: "Meta Diária", value: config.dailyGoal > 0 ? formatAOAshort(config.dailyGoal) : "Definir", color: "text-[#FFC107]", action: () => setSheet("goal") },
      { icon: ShoppingCart, label: "Vendas (produtos e serviços)", value: "Abrir", color: "text-[#00FF88]", action: p.onOpenSales },
      { icon: FileText, label: "Relatório PDF e WhatsApp", value: config.waNumber ? `${config.waDdi} ${config.waNumber}` : "Configurar", color: "text-[#00FF88]", action: p.onOpenPdf },
    ],
    [
      {
        icon: Volume2, label: "Som do Alarme", value: config.soundOn ? "Ativado" : "Desativado", color: "text-[#FF4D6D]", toggleOn: config.soundOn,
        action: () => { p.onPatch({ soundOn: !config.soundOn }); toast(config.soundOn ? "Som do alarme desativado" : "Som do alarme ativado", undefined, "cyan"); },
      },
      {
        icon: Vibrate, label: "Vibração do Telemóvel", value: config.vibrateOn ? "Ativada" : "Desativada", color: "text-[#FF4D6D]", toggleOn: config.vibrateOn,
        action: () => { p.onPatch({ vibrateOn: !config.vibrateOn }); toast(config.vibrateOn ? "Vibração desativada" : "Vibração ativada", undefined, "cyan"); },
      },
      { icon: AlarmClock, label: "Testar Alarme", value: "Tocar", color: "text-[#FFC107]", action: p.onTestAlarm },
    ],
    [
      {
        icon: config.theme === "dark" ? Moon : Sun, label: "Tema", value: config.theme === "dark" ? "Modo Escuro" : "Modo Claro", color: "text-orange-400", toggleOn: config.theme === "dark",
        action: () => {
          const t = config.theme === "dark" ? "light" : "dark";
          p.onPatch({ theme: t });
          toast(t === "dark" ? "Modo escuro ativado" : "Modo claro ativado", undefined, "cyan");
        },
      },
      {
        icon: BellRing, label: "Notificações", value: config.notifOn ? "Ativadas" : "Desativadas", color: "text-[#00E5FF]", toggleOn: config.notifOn,
        action: () => {
          const on = !config.notifOn;
          p.onPatch({ notifOn: on });
          if (on) void askNotifPermission();
          if (on) setTimeout(() => notify("Notificações ativadas", "Vai receber avisos de tudo o que acontecer. Apagam-se após 24h.", "green"), 50);
          else toast("Notificações desativadas", "Deixa de receber avisos.", "amber");
        },
      },
      { icon: Globe, label: "Idioma", value: langName[config.lang], color: "text-[#00E5FF]", action: () => setSheet("lang") },
    ],
    [
      ...(cloudOn() && p.isOwner !== false ? [{ icon: Cloud, label: "Conta online (nuvem)", value: (() => { const a = getAccount(getNamespace()); return a && hasSession(a.login) ? "Ligada" : "Ligar"; })(), color: "text-[#00E5FF]", action: () => setSheet("cloud") }] : []),
      { icon: LifeBuoy, label: "Ajuda e Gerentes", value: "WhatsApp", color: "text-[#25D366]", action: () => setSheet("help") },
      { icon: Bot, label: "Assistente IA", value: "Perguntar", color: "text-[#00E5FF]", action: p.onOpenAI },
      { icon: CloudUpload, label: "Cópia de Segurança", value: config.lastBackup ? "Feita" : "Pendente", color: "text-[#00E5FF]", action: () => setSheet("backup") },
      { icon: Info, label: "Sobre a App e Legal", color: "text-[#00E5FF]", action: () => setSheet("about") },
      { icon: LogOut, label: "Terminar Sessão", color: "text-[#FF4D6D]", danger: true, action: () => setSheet("logout") },
    ],
  ];

  const renderRow = (r: Row) => (
    <button key={r.label} data-guide-id={r.label === "Funcionários" ? "staff" : r.label === "Relatório PDF e WhatsApp" ? "pdf-settings" : undefined} onClick={r.action} className="flex w-full items-center gap-3 bg-[#1e1e1e] px-3.5 py-[13px] text-left transition active:bg-[#2a2a2a]">
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.05]", r.color)}>
        <r.icon size={16} />
      </span>
      <span className={cn("flex-1 text-[13.5px]", r.danger ? "font-bold text-[#FF4D6D]" : "font-medium text-neutral-100")}>{r.label}</span>
      {r.toggleOn !== undefined ? (
        <>
          <span className="text-[11.5px] text-neutral-400">{r.value}</span>
          <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", r.toggleOn ? "bg-[#00E5FF]/90" : "bg-white/15")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", r.toggleOn ? "left-[22px]" : "left-0.5")} />
          </span>
        </>
      ) : (
        <>
          {r.value && <span className="max-w-[120px] truncate text-[12px] text-neutral-400">{r.value}</span>}
          <ChevronRight size={16} className="text-neutral-600" />
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-3.5 px-4 pb-6">
      <h1 className="rise pt-1 text-center font-display text-[26px] font-extrabold uppercase tracking-wide">Definições</h1>

      <button onClick={() => setSheet("profile")} className="rise rise-1 flex w-full items-center gap-3 rounded-2xl border border-[#00E5FF]/25 bg-gradient-to-r from-[#00E5FF]/10 to-transparent p-3.5 text-left">
        <HouseAvatar photo={p.photo} name={config.houseName} className="h-12 w-12 rounded-xl text-[16px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[19px] font-extrabold uppercase leading-none">{config.houseName}</span>
          <span className="block truncate text-[12px] text-neutral-400">{config.ownerName}{config.phone ? ` • ${config.phone}` : ""}</span>
          <span className="block truncate text-[10.5px] font-bold tracking-wider text-neutral-500">ID {p.accountId}</span>
        </span>
        <ChevronRight size={16} className="text-neutral-500" />
      </button>

      {groups.map((g, i) => (
        <div key={i} className={cn("rise overflow-hidden rounded-2xl border border-white/[0.07] divide-y divide-white/[0.06]", `rise-${(i % 5) + 1}`)}>
          {g.map(renderRow)}
        </div>
      ))}

      <p className="pt-1 text-center text-[10.5px] font-medium text-neutral-600">
        CJ GERENCIAMENTO v5.7.0 • Feito em Angola 🇦🇴
      </p>

      {sheet === "profile" && (
        <ProfileSheet config={config} photo={p.photo} onClose={close} onSave={(patch, photo) => { p.onProfile(patch, photo); close(); notify("Perfil atualizado", "As suas informações foram guardadas.", "green"); }} />
      )}
      {sheet === "password" && (
        <PasswordSheet verify={(x) => checkPass(x, config.password)} onClose={close} onSave={(pw) => { p.onPatch({ password: hashPass(pw) }); close(); notify("Palavra-passe alterada", "Use a nova palavra-passe no próximo acesso.", "amber"); }} />
      )}
      {sheet === "sub" && (
        <SubscriptionSheet config={config} onClose={close} onChange={(pl) => { p.onPatch({ subPlan: pl }); notify("Subscrição alterada", `Agora está no plano ${subName(pl)}.`, "amber"); }} />
      )}
      {sheet === "hours" && (
        <HoursSheet config={config} onClose={close} onSave={(patch) => { p.onPatch(patch); close(); notify("Horário atualizado", `${patch.openTime} – ${patch.closeTime}`, "green"); }} />
      )}
      {sheet === "goal" && (
        <GoalSheet goal={config.dailyGoal} onClose={close} onSave={(v) => { p.onPatch({ dailyGoal: v }); close(); notify(v > 0 ? "Meta diária definida" : "Meta diária removida", v > 0 ? formatAOAshort(v) : undefined, "green"); }} />
      )}
      {sheet === "packages" && (
        <PackagesSheet
          plans={config.defaultPlans}
          stationCount={p.stationCount}
          onClose={close}
          onAdd={(d: PlanDraft) => { p.onPatch({ defaultPlans: [...config.defaultPlans, { ...d, id: `d${uid()}` }] }); toast("Pacote adicionado", d.name, "green"); }}
          onRemove={(id) => p.onPatch({ defaultPlans: config.defaultPlans.filter((x) => x.id !== id) })}
          onApplyAll={() => { p.onApplyPlans(); close(); }}
        />
      )}
      {sheet === "lang" && (
        <LanguageSheet value={config.lang} onClose={close} onSelect={(l) => { p.onPatch({ lang: l }); close(); toast("Idioma alterado", langName[l], "cyan"); }} />
      )}
      {sheet === "backup" && (
        <BackupSheet
          lastBackup={config.lastBackup}
          now={p.now}
          onClose={close}
          onExport={p.onExport}
          onImport={(f) => { p.onImport(f); close(); }}
          onReset={() => { close(); p.onReset(); }}
        />
      )}
      {sheet === "about" && <AboutSheet onClose={close} />}
      {sheet === "cloud" && <CloudSheet onClose={close} />}
      {sheet === "help" && <HelpSheet managers={loadGlobalAdm().managers} house={config.houseName} owner={config.ownerName} id={getNamespace()} onAsk={config.ownerName ? p.onOpenAI : undefined} onClose={close} />}
      {sheet === "logout" && <LogoutConfirm onCancel={close} onConfirm={() => { close(); p.onLogout(); }} />}
    </div>
  );
}
