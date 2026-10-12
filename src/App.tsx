import { useEffect, useRef, useState } from "react";
import {
  Home, CalendarDays, Users, Wallet, Settings as SettingsIcon, X, CheckCircle2, Sparkles,
  Sparkles, Zap, Bell, Trash2, Bot, CircleHelp,
} from "lucide-react";
import { TopHeader } from "./components/shared";
import StartSessionModal from "./components/StartSessionModal";
import StationManager from "./components/StationManager";
import AlarmModal from "./components/AlarmModal";
import SetupWizard, { type SetupResult } from "./components/SetupWizard";
import ReportsView, { type ReportTab } from "./components/ReportsView";
import StockRoom from "./components/StockRoom";
import GamesRoom from "./components/GamesRoom";
import SalesView, { type CartLine } from "./components/SalesView";
import AssistantView from "./components/AssistantView";
import OnboardingGuide from "./components/OnboardingGuide";
import PdfShareSheet from "./components/PdfShareSheet";
import MyCashCard, { todaysOf } from "./components/MyCashCard";
import StaffManager, { type NewStaff } from "./components/StaffManager";
import ActivityView from "./components/ActivityView";
import StaffProfile from "./components/StaffProfile";
import Confirm from "./components/Confirm";
import { GoalSheet } from "./components/SettingsSheets";
import { AdBanner, BillBanner, NotifPrompt, Paywall, BlockedScreen, RoomChips, RoomView } from "./components/BillingUI";
import type { PlanDraft } from "./components/PlanForm";
import HomeScreen from "./screens/Home";
import BookingsScreen, { type NewBooking } from "./screens/Bookings";
import PlayersScreen, { type NewPlayer } from "./screens/Players";
import FinanceScreen from "./screens/Finance";
import SettingsScreen from "./screens/Settings";
import type {
  ActivitySeverity, AdminData, Ad, GlobalAdm, Room, AppData, AppNotification, BookingStatus, Config, Perm, Plan, SaleItem, Session, SessionRecord,
  Staff, Invoice, StationStatus, StockMove, StockReason, Tone, TxCategory,
} from "./lib/types";
import {
  clearData, defaultData, downloadFile, loadAdmin, loadData, normalize, saveAdmin, saveData, uid, type Auth,
} from "./lib/storage";
import { hashPass, normCode } from "./lib/auth";
import { inviteTaken, type Account, type Session as LoginSession } from "./lib/accounts";
import { clockHM, formatAOA, formatAOAshort, formatClock, pad, playerMatches, timeAgo } from "./lib/format";
import { addDays, bookingTs, sod, startOfWeek, ymd } from "./lib/dates";
import { buildReport, checkClosedPeriods, totals, type Report } from "./lib/reports";
import { fmtTime, fullDate } from "./lib/pdf";
import type { AiContext } from "./lib/assistant";
import { startAlarm, stopAlarm, unlockAudio } from "./utils/alarm";
import { ADM_EVENT, loadGlobalAdm, loadSeenNotices, saveGlobalAdm, saveSeenNotices } from "./lib/adm";
import { billInfo, newPayment } from "./lib/billing";
import { inviteFree, licenseRequest } from "./lib/cloud";
import { channelFor, wipeShadow, type Snap } from "./lib/sync";
import { useLiveSync } from "./lib/useLiveSync";
import { merge3, mergeData } from "./lib/merge";
import { askNotifPermission, notifPermission, syncAlarms, systemNotify, updateMachineCountdown } from "./lib/push";
import { cn } from "./utils/cn";

type Tab = "home" | "bookings" | "players" | "finances" | "settings";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "bookings", label: "Reservas", icon: CalendarDays },
  { id: "players", label: "Jogadores", icon: Users },
  { id: "finances", label: "Finanças", icon: Wallet },
  { id: "settings", label: "Definições", icon: SettingsIcon },
];

interface Toast { id: number; title: string; desc?: string; tone: Tone }

const toneBorder: Record<Tone, string> = {
  green: "border-[#00FF88]/40", cyan: "border-[#00E5FF]/40", red: "border-[#FF4D6D]/40", amber: "border-[#FFC107]/40",
};
const toneIcon: Record<Tone, string> = {
  green: "bg-[#00FF88]/15 text-[#00FF88]", cyan: "bg-[#00E5FF]/15 text-[#00E5FF]",
  red: "bg-[#FF4D6D]/15 text-[#FF4D6D]", amber: "bg-[#FFC107]/15 text-[#FFC107]",
};

const DAY = 24 * 3600 * 1000;

interface WorkspaceProps {
  account: Account;
  session: LoginSession;
  /** true logo depois de entrar (para registar o login uma só vez) */
  fresh: boolean;
  onExit: () => void;
  onAccountPatch: (p: Partial<Pick<Account, "ownerName" | "houseName" | "photo" | "passHash">>) => void;
}

export default function Workspace({ account, session, fresh, onExit, onAccountPatch }: WorkspaceProps) {
  const [data, setData] = useState<AppData>(() => loadData() ?? defaultData());
  const dataRef = useRef(data);
  dataRef.current = data;
  const { config, stations, sessions, bookings, players, transactions, notifications, inventory, catalog, staff } = data;


  const [admin, setAdmin] = useState<AdminData>(() => loadAdmin());
  const adminRef = useRef(admin);
  adminRef.current = admin;
  // Anúncios (fotos), salas e avisos vêm do ADM global (a Sala do ADM fica no ecrã de cadastro)
  const [gadm, setGadm] = useState<GlobalAdm>(() => loadGlobalAdm());
  const [room, setRoom] = useState<Room | null>(null);
  const [showGames, setShowGames] = useState(false);
  const [notifAsk, setNotifAsk] = useState(true);

  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>("home");
  const [guideManualOpen, setGuideManualOpen] = useState(0);
  const auth: Auth = session.role === "owner" ? { role: "owner" } : { role: "staff", staffId: session.staffId };
  const [confirm, setConfirm] = useState<{ msg: string; label?: string; run: () => void } | null>(null);
  const [showStaff, setShowStaff] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const [ringing, setRinging] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [pdfSheet, setPdfSheet] = useState<{ open: boolean; report: Report | null; own?: boolean }>({ open: false, report: null });
  const [reports, setReports] = useState<{ open: boolean; kind: ReportTab }>({ open: false, kind: "day" });
  const [startModal, setStartModal] = useState<{ open: boolean; stationId: number | null }>({ open: false, stationId: null });
  const [manager, setManager] = useState<{ open: boolean; stationId: number | null }>({ open: false, stationId: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const ringingRef = useRef<number[]>([]);
  ringingRef.current = ringing;

  /* ---------- quem está a usar a app ---------- */
  const me: Staff | null = auth?.role === "staff" ? staff.find((x) => x.id === auth.staffId && x.active) ?? null : null;
  const isOwner = auth?.role === "owner";
  const can = (perm: Perm | "owner") => (isOwner ? true : perm === "owner" ? false : !!me && me.perms.includes(perm));
  const actor = isOwner
    ? { id: "owner", name: config.ownerName || "Proprietário", role: "owner" as const }
    : { id: me?.id ?? "?", name: me?.name ?? "Funcionário", role: "staff" as const };
  const actorRef = useRef(actor);
  actorRef.current = actor;

  /* ---------- helpers de estado ---------- */
  const upd = <K extends keyof AppData>(k: K, fn: (v: AppData[K]) => AppData[K]) =>
    setData((d) => ({ ...d, [k]: fn(d[k]) }) as AppData);
  const patchConfig = (p: Partial<Config>) => setData((d) => ({ ...d, config: { ...d.config, ...p } }));

  const toast = (title: string, desc?: string, tone: Tone = "green") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, title, desc, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  /** Registo permanente de atividade (quem fez o quê). Nunca é apagado pela app. */
  const logAs = (
    a: { id: string; name: string; role: "owner" | "staff" },
    action: string, label: string, detail?: string, severity: ActivitySeverity = "info", snapshot?: unknown
  ) => {
    setData((d) => ({
      ...d,
      activity: [
        {
          id: uid(), ts: Date.now(), actorId: a.id, actorName: a.name, role: a.role, action, label, detail, severity,
          snapshot: snapshot === undefined ? undefined : JSON.stringify(snapshot),
        },
        ...d.activity,
      ].slice(0, 3000),
    }));
  };
  const logAct = (action: string, label: string, detail?: string, severity: ActivitySeverity = "info", snapshot?: unknown) =>
    logAs(actorRef.current, action, label, detail, severity, snapshot);
  const logDel = (entity: string, label: string, snap: unknown) =>
    logAct("apagar", `${entity} apagado: ${label}`, undefined, "delete", snap);

  /** Regista uma notificação (guardada 24h) e mostra um aviso, se as notificações estiverem ativas. */
  const notify = (title: string, desc?: string, tone: Tone = "green", opts?: { noLog?: boolean }) => {
    if (!opts?.noLog) logAct("acao", title, desc, tone === "red" ? "warn" : "info");
    if (!dataRef.current.config.notifOn) return;
    const n: AppNotification = { id: uid(), ts: Date.now(), title, desc, tone, read: false };
    setData((d) => ({ ...d, notifications: [n, ...d.notifications].slice(0, 300) }));
    toast(title, desc, tone);
    // Com a app em segundo plano / ecrã bloqueado, avisa no sistema do telemóvel
    if (document.visibilityState === "hidden") void systemNotify(title, desc, tone === "red" ? "alerta" : undefined, tone === "red");
  };

  /** Aviso do ADM: aparece sempre (sino, ecrã e sistema do telemóvel). */
  const broadcast = (title: string, text: string) => {
    const n: AppNotification = { id: uid(), ts: Date.now(), title, desc: text || undefined, tone: "cyan", read: false };
    setData((d) => ({ ...d, notifications: [n, ...d.notifications].slice(0, 300) }));
    toast(title, text || undefined, "cyan");
    void systemNotify(title, text || undefined, "adm");
  };

  const addTx = (type: "in" | "out", value: number, label: string, detail = "", category: TxCategory = "manual", plan?: string) =>
    setData((d) => ({
      ...d,
      transactions: [{ id: uid(), type, value, label, detail, ts: Date.now(), category, plan, actorId: actorRef.current.id, actorName: actorRef.current.name }, ...d.transactions],
    }));

  const stationName = (id: number) => stations.find((s) => s.id === id)?.name ?? `Máquina ${id}`;

  /* ---------- derivados ---------- */
  const balance =
    config.openingBalance +
    transactions.reduce((a, t) => a + (t.type === "in" ? t.value : -t.value), 0);
  const unread = notifications.filter((n) => !n.read).length;
  const ringSession = sessions.find((s) => s.id === ringing[0]);
  const loggedIn = isOwner || !!me;
  const needSetup = !config.setupDone;
  const visibleTabs = tabs.filter((t) =>
    isOwner ||
    t.id === "home" || t.id === "settings" ||
    (t.id === "bookings" && can("bookings")) ||
    (t.id === "players" && can("players")) ||
    (t.id === "finances" && can("finance"))
  );
  const deny = () => toast("Sem permissão", "O proprietário não lhe deu acesso a esta ação.", "red");
  /** Só deixa executar se tiver a permissão */
  const g = <A extends unknown[]>(perm: Perm | "owner", fn: (...a: A) => void) => (...a: A) => {
    if (can(perm)) fn(...a);
    else deny();
  };
  /** Pede confirmação antes de executar */
  const ask = <A extends unknown[]>(msg: (...a: NoInfer<A>) => string, fn: (...a: A) => void) => (...a: A) =>
    setConfirm({ msg: msg(...a), run: () => fn(...a) });

  /* ---------- efeitos ---------- */
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { setStorageFull(!saveData(data)); }, [data]);
  useEffect(() => { saveAdmin(admin); }, [admin]);

  /* Anúncios, salas e avisos do ADM: atualizam sozinhos quando o ADM altera algo neste telemóvel */
  useEffect(() => {
    const pull = () => setGadm(loadGlobalAdm());
    window.addEventListener(ADM_EVENT, pull);
    window.addEventListener("storage", pull);
    return () => { window.removeEventListener(ADM_EVENT, pull); window.removeEventListener("storage", pull); };
  }, []);

  /* Cada aviso do ADM aparece uma só vez por casa (avisos anteriores à criação da conta não aparecem) */
  useEffect(() => {
    const seen = loadSeenNotices(account.id);
    const unseen = gadm.notices.filter((n) => !seen.includes(n.id));
    if (!unseen.length) return;
    saveSeenNotices(account.id, [...seen, ...unseen.map((n) => n.id)]);
    unseen.filter((n) => n.ts >= account.createdAt).reverse().forEach((n) => broadcast(n.title, n.text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadm.notices]);

  /* Funcionário removido ou bloqueado enquanto usa a app → sai */
  useEffect(() => {
    if (auth.role === "staff" && !data.staff.some((x) => x.id === auth.staffId && x.active)) onExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.staff]);

  /* Quem não é o proprietário nunca configura a casa */
  useEffect(() => { if (needSetup && !isOwner) onExit(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needSetup, isOwner]);

  /* Mantém o nome/palavra-passe da casa iguais aos da conta (a conta é a fonte da verdade) */
  useEffect(() => {
    if (!config.setupDone) return;
    if (config.houseName !== account.houseName || config.ownerName !== account.ownerName || config.password !== account.passHash) {
      patchConfig({ houseName: account.houseName, ownerName: account.ownerName, password: account.passHash });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.houseName, account.ownerName, account.passHash, config.setupDone]);

  /* Registo do login (uma só vez, logo depois de entrar) */
  const loginLogged = useRef(false);
  useEffect(() => {
    if (!fresh || loginLogged.current || !dataRef.current.config.setupDone) return;
    loginLogged.current = true;
    if (auth.role === "owner") {
      logAs({ id: "owner", name: dataRef.current.config.ownerName || "Proprietário", role: "owner" }, "login", "Proprietário entrou na app");
    } else {
      const st = dataRef.current.staff.find((x) => x.id === auth.staffId);
      if (!st) return;
      const t = Date.now();
      setData((d) => ({
        ...d,
        staff: d.staff.map((x) => (x.id === st.id ? { ...x, lastLogin: t } : x)),
        notifications: [
          { id: uid(), ts: t, title: "Funcionário entrou", desc: `${st.name} iniciou sessão.`, tone: "cyan" as const, read: false },
          ...d.notifications,
        ].slice(0, 300),
      }));
      logAs({ id: st.id, name: st.name, role: "staff" }, "login", `${st.name} entrou na app`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Mantém o ecrã ligado enquanto há máquinas a contar (para o alarme tocar) */
  useEffect(() => {
    if (sessions.length === 0) return;
    type WL = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WL> } };
    if (!nav.wakeLock) return;
    let lock: WL | null = null;
    let dead = false;
    const ask = () => nav.wakeLock!.request("screen").then((l) => { if (dead) void l.release(); else lock = l; }).catch(() => undefined);
    void ask();
    const vis = () => { if (document.visibilityState === "visible") void ask(); };
    document.addEventListener("visibilitychange", vis);
    return () => { dead = true; document.removeEventListener("visibilitychange", vis); void lock?.release().catch(() => undefined); };
  }, [sessions.length > 0]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", config.theme === "light");
    document.documentElement.lang = config.lang;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", config.theme === "light" ? "#f3f6fa" : "#0a0a0a");
  }, [config.theme, config.lang]);

  /* Fim do tempo → alarme */
  useEffect(() => {
    const due = sessions.filter((s) => s.kind === "timed" && !s.alarmFired && now >= s.startedAt + s.durationSec * 1000);
    if (due.length === 0) return;
    const ids = due.map((d) => d.id);
    setData((d) => ({ ...d, sessions: d.sessions.map((s) => (ids.includes(s.id) ? { ...s, alarmFired: true } : s)) }));
    setRinging((prev) => [...prev, ...ids.filter((i) => !prev.includes(i))]);
    due.forEach((s) => notify("Tempo esgotado!", `${stationName(s.stationId)} • ${s.player} (${s.plan})`, "red", { noLog: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, sessions]);

  useEffect(() => {
    if (ringing.length > 0) startAlarm({ sound: config.soundOn, vibrate: config.vibrateOn });
    else stopAlarm();
  }, [ringing.length, config.soundOn, config.vibrateOn]);

  useEffect(() => () => stopAlarm(), []);

  /* Nuvem: sincronização ao vivo entre o telemóvel do proprietário e o dos funcionários.
     Envia as alterações logo a seguir, traz as do outro telemóvel de 10 em 10 s e funde as duas. */
  const [srvBlocked, setSrvBlocked] = useState(() => { try { return localStorage.getItem(`cjg-blocked:${account.id}`) === "1"; } catch { return false; } });
  useEffect(() => {
    const h = (e: Event) => {
      const v = !!(e as CustomEvent<boolean>).detail;
      setSrvBlocked(v);
      try { if (v) localStorage.setItem(`cjg-blocked:${account.id}`, "1"); else localStorage.removeItem(`cjg-blocked:${account.id}`); } catch { /* ignora */ }
    };
    window.addEventListener("cj-blocked", h);
    return () => window.removeEventListener("cj-blocked", h);
  }, [account.id]);
  const live = useLiveSync({
    account,
    getSnap: (): Snap => ({
      data: dataRef.current, admin: adminRef.current,
      acc: { ownerName: account.ownerName, houseName: account.houseName, photo: account.photo, passHash: account.passHash },
    }),
    applySnap: (prev, merged, role) => {
      setData((cur) => mergeData(prev.data, cur, merged.data, role));
      setAdmin((cur) => (role === "staff"
        ? { ...cur, billing: { ...merged.admin.billing, payments: cur.billing.payments } }
        : (merge3(prev.admin, cur, merged.admin) as AdminData)));
      const patch: Parameters<typeof onAccountPatch>[0] = {};
      if (merged.acc.ownerName && merged.acc.ownerName !== account.ownerName) patch.ownerName = merged.acc.ownerName;
      if (merged.acc.houseName && merged.acc.houseName !== account.houseName) patch.houseName = merged.acc.houseName;
      if (merged.acc.photo && merged.acc.photo !== account.photo) patch.photo = merged.acc.photo;
      if (role === "owner" && merged.acc.passHash && merged.acc.passHash !== account.passHash) patch.passHash = merged.acc.passHash;
      if (Object.keys(patch).length) onAccountPatch(patch);
    },
    onIncoming: (list) => {
      if (!dataRef.current.config.notifOn) return;
      list.slice(0, 3).forEach((n) => {
        toast(n.title, n.desc, n.tone);
        if (document.visibilityState === "hidden") void systemNotify(n.title, n.desc, n.tone === "red" ? "alerta" : undefined, n.tone === "red");
      });
    },
    onDenied: (msg) => {
      try { sessionStorage.setItem("cjg-flash", msg); } catch { /* ignora */ }
      wipeShadow(account.id);
      onExit();
    },
    onWarn: (msg) => toast("Sincronização", msg, "amber"),
  });
  useEffect(() => { live.touch(); }, [data, admin]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Agenda no telemóvel o aviso de «tempo esgotado» para cada sessão (funciona com a app fechada) */
  const alarmSig = sessions.filter((s) => s.kind === "timed" && !s.alarmFired).map((s) => `${s.id}:${s.startedAt + s.durationSec * 1000}`).join(",");
  const notifGranted = notifPermission() === "granted";
  useEffect(() => {
    if (!config.notifOn) return;
    void syncAlarms(
      dataRef.current.sessions
        .filter((s) => s.kind === "timed" && !s.alarmFired)
        .map((s) => ({ id: s.id, at: s.startedAt + s.durationSec * 1000, title: "Tempo esgotado!", body: `${stationName(s.stationId)} • ${s.player} (${s.plan})` }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmSig, config.notifOn, notifGranted]);

  /* Notificação persistente: usa o mesmo relógio das máquinas */
  useEffect(() => {
    if (!config.notifOn || notifPermission() !== "granted") return;
    const active = dataRef.current.sessions
      .filter((s) => s.kind === "timed" && !s.alarmFired)
      .map((s) => ({
        id: s.id,
        station: stationName(s.stationId),
        player: s.player,
        remainingSec: s.durationSec - (now - s.startedAt) / 1000,
      }))
      .filter((s) => s.remainingSec > 0);
    void updateMachineCountdown(active);
  }, [now, config.notifOn, notifGranted]);

  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener("pointerdown", h, { once: true });
    return () => window.removeEventListener("pointerdown", h);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => { if (!visibleTabs.some((t) => t.id === tab)) setTab("home"); });

  /* A cada minuto: apaga notificações com +24h, fecha períodos e avisa reservas */
  const minuteKey = Math.floor(now / 60000);
  useEffect(() => {
    const d = dataRef.current;
    if (!d.config.setupDone) return;
    const t = Date.now();
    const cutoff = t - DAY;
    const items = isOwner ? checkClosedPeriods(d.lastTick, t, d.transactions) : [];
    const due = d.bookings.filter((b) => {
      if (b.alerted || b.status === "cancelled") return false;
      const diff = bookingTs(b.date, b.start) - t;
      return diff <= 15 * 60000 && diff > -30 * 60000;
    });
    setData((prev) => {
      const kept = prev.notifications.filter((n) => n.ts >= cutoff);
      return {
        ...prev,
        lastTick: t,
        notifications: kept.length === prev.notifications.length ? prev.notifications : kept,
        bookings: due.length ? prev.bookings.map((b) => (due.some((x) => x.id === b.id) ? { ...b, alerted: true } : b)) : prev.bookings,
      };
    });
    items.forEach((i) => notify(i.title, i.desc, i.tone, { noLog: true }));
    due.forEach((b) => notify("Reserva a começar", `${b.start} • ${b.stationName} • ${b.players}`, "amber", { noLog: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey]);

  /* ---------- configuração inicial ---------- */
  const finishSetup = (r: SetupResult) => {
    const t = Date.now();
    setData((d) => ({
      ...d,
      config: {
        ...d.config, setupDone: true, houseName: account.houseName, ownerName: account.ownerName, phone: r.phone, email: r.email,
        address: r.address, password: account.passHash, openTime: r.openTime, closeTime: r.closeTime, openDays: r.openDays,
        dailyGoal: r.dailyGoal, openingBalance: r.openingBalance, defaultPlans: r.plans, subSince: t,
      },
      stations: Array.from({ length: r.count }, (_, i) => ({
        id: i + 1, name: `${r.prefix} ${pad(i + 1)}`, status: "free" as const,
        plans: r.plans.map((p, k) => ({ ...p, id: `p${i + 1}-${k}-${uid()}` })),
      })),
      lastTick: t,
    }));
    setTimeout(() => notify("Game House criada!", `${account.houseName} • ${r.count} máquinas prontas a funcionar.`, "green", { noLog: true }), 60);
  };

  /* ---------- sessões ---------- */
  const startSession = (stationId: number, plan: Plan, player: string) => {
    const t = Date.now();
    const timed = plan.kind === "timed";
    const minutes = plan.minutes ?? 0;
    const s: Session = {
      id: uid(), stationId, plan: plan.name, kind: plan.kind, price: plan.price,
      rate: timed && minutes > 0 ? plan.price / minutes : 0, player, startedAt: t,
      durationSec: timed ? minutes * 60 : 0, alarmFired: false,
    };
    setData((d) => ({
      ...d,
      sessions: [s, ...d.sessions],
      stations: d.stations.map((x) => (x.id === stationId && x.status === "reserved" ? { ...x, status: "free" } : x)),
      players: d.players.map((p) => (playerMatches(p, player) ? { ...p, lastActive: t } : p)),
    }));
    addTx("in", plan.price, `Sessão: ${stationName(stationId)} (${plan.name})`, `- ${player}`, "sessao", plan.name);
    setStartModal({ open: false, stationId: null });
    unlockAudio();
    notify(
      timed ? "Cronómetro iniciado" : "Sessão de preço fixo registada",
      `${stationName(stationId)} • ${plan.name} • ${timed ? `${minutes} min` : formatAOAshort(plan.price)} • ${player}`,
      "green"
    );
  };

  const extendSession = (id: number, minutes: number) => {
    const s = dataRef.current.sessions.find((x) => x.id === id);
    if (!s || s.kind !== "timed") return;
    const elapsed = (Date.now() - s.startedAt) / 1000;
    const expired = elapsed >= s.durationSec;
    const newDur = expired ? elapsed + minutes * 60 : s.durationSec + minutes * 60;
    const fee = Math.max(50, Math.round((s.rate * minutes) / 50) * 50);
    upd("sessions", (v) => v.map((x) => (x.id === id ? { ...x, durationSec: newDur, alarmFired: false, price: x.price + fee } : x)));
    setRinging((r) => r.filter((x) => x !== id));
    addTx("in", fee, `Extensão +${minutes} min: ${stationName(s.stationId)}`, `- ${s.player}`, "extensao");
    notify(`+${minutes} minutos adicionados`, `${stationName(s.stationId)} • +${formatAOAshort(fee)}`, "cyan");
  };

  const endSession = (id: number) => {
    const s = dataRef.current.sessions.find((x) => x.id === id);
    upd("sessions", (v) => v.filter((x) => x.id !== id));
    setRinging((r) => r.filter((x) => x !== id));
    if (s) {
      const rec: SessionRecord = {
        id: s.id, stationId: s.stationId, stationName: stationName(s.stationId), player: s.player, plan: s.plan,
        kind: s.kind, price: s.price, startedAt: s.startedAt, endedAt: Date.now(), endedBy: actorRef.current.name,
      };
      setData((d) => ({ ...d, history: [rec, ...d.history].slice(0, 3000) }));
    }
    if (s) notify("Sessão encerrada", `${stationName(s.stationId)} • ${s.player} — máquina livre.`, "amber");
  };

  const setStationStatus = (id: number, status: StationStatus) => {
    upd("stations", (v) => v.map((s) => (s.id === id ? { ...s, status } : s)));
    const labels = { free: "libertada", reserved: "reservada", maintenance: "em manutenção" } as const;
    notify(`${stationName(id)} ${labels[status]}`, undefined, status === "maintenance" ? "amber" : "cyan");
  };

  /* ---------- máquinas e preços ---------- */
  const addStations = (n: number) => {
    setData((d) => {
      let id = d.stations.reduce((m, s) => Math.max(m, s.id), 0);
      const add = Array.from({ length: n }, () => {
        id += 1;
        return {
          id, name: `Máquina ${pad(id)}`, status: "free" as const,
          plans: d.config.defaultPlans.map((p, i) => ({ ...p, id: `p${id}-${i}-${uid()}` })),
        };
      });
      return { ...d, stations: [...d.stations, ...add] };
    });
    notify("Máquinas adicionadas", `+${n} nova${n === 1 ? "" : "s"} máquina${n === 1 ? "" : "s"}.`, "green");
  };

  const renameStation = (id: number, name: string) => {
    upd("stations", (v) => v.map((s) => (s.id === id ? { ...s, name } : s)));
    logAct("editar", `Máquina renomeada: ${name}`);
    toast("Nome guardado", name, "cyan");
  };

  const removeStation = (id: number) => {
    const name = stationName(id);
    const st = dataRef.current.stations.find((s) => s.id === id);
    upd("stations", (v) => v.filter((s) => s.id !== id));
    if (st) logDel("Máquina", name, st);
    notify("Máquina removida", name, "red", { noLog: true });
  };

  const addPlan = (stationId: number, d: PlanDraft) => {
    upd("stations", (v) => v.map((s) => (s.id === stationId ? { ...s, plans: [...s.plans, { ...d, id: `p${uid()}` }] } : s)));
    notify("Opção adicionada", `${stationName(stationId)} (${d.name}) • ${formatAOAshort(d.price)}`, "green");
  };

  const removePlan = (stationId: number, planId: string) => {
    const pl = dataRef.current.stations.find((s) => s.id === stationId)?.plans.find((x) => x.id === planId);
    upd("stations", (v) => v.map((s) => (s.id === stationId ? { ...s, plans: s.plans.filter((x) => x.id !== planId) } : s)));
    if (pl) logDel("Opção de preço", `${pl.name} (${stationName(stationId)})`, pl);
  };

  const copyAll = (stationId: number) => {
    const src = dataRef.current.stations.find((s) => s.id === stationId);
    if (!src) return;
    upd("stations", (v) => v.map((s) => ({ ...s, plans: src.plans.map((pl, i) => ({ ...pl, id: `p${s.id}-${i}-${uid()}` })) })));
    notify("Opções copiadas", `Aplicadas a todas as ${dataRef.current.stations.length} máquinas.`, "cyan");
  };

  const applyDefaultPlans = () => {
    const plans = dataRef.current.config.defaultPlans;
    upd("stations", (v) => v.map((s) => ({ ...s, plans: plans.map((pl, i) => ({ ...pl, id: `p${s.id}-${i}-${uid()}` })) })));
    notify("Pacotes aplicados", `Todas as máquinas usam agora os ${plans.length} pacotes padrão.`, "cyan");
  };

  /* ---------- reservas ---------- */
  const addBooking = (b: NewBooking) => {
    const clash = dataRef.current.bookings.find(
      (x) => x.status !== "cancelled" && x.date === b.date && x.stationName === b.stationName && b.start < x.end && x.start < b.end
    );
    if (clash) return toast("Horário ocupado", `${clash.stationName} já está reservada ${clash.start}-${clash.end}.`, "red");
    upd("bookings", (v) => [...v, { ...b, id: uid() }]);
    notify("Reserva criada", `${b.stationName} • ${b.start}-${b.end} • ${b.players}`, "cyan");
  };
  const setBookingStatus = (id: number, s: BookingStatus) => {
    upd("bookings", (v) => v.map((b) => (b.id === id ? { ...b, status: s } : b)));
    notify(s === "confirmed" ? "Reserva confirmada" : s === "cancelled" ? "Reserva cancelada" : "Reserva atualizada", undefined, s === "cancelled" ? "red" : "green");
  };
  const removeBooking = (id: number) => {
    const bk = dataRef.current.bookings.find((b) => b.id === id);
    upd("bookings", (v) => v.filter((b) => b.id !== id));
    if (bk) logDel("Reserva", `${bk.stationName} ${bk.date} ${bk.start}`, bk);
    toast("Reserva apagada", undefined, "red");
  };

  /* ---------- jogadores ---------- */
  const registerPlayer = (np: NewPlayer) => {
    upd("players", (v) => [{ id: uid(), ...np, balance: 0, createdAt: Date.now(), lastActive: null }, ...v]);
    notify("Jogador registado", `${np.name} (${np.tag}) entrou para a casa.`, "green");
  };
  const topUp = (id: number, amount: number) => {
    const p = dataRef.current.players.find((x) => x.id === id);
    if (!p) return;
    upd("players", (v) => v.map((x) => (x.id === id ? { ...x, balance: x.balance + amount } : x)));
    addTx("in", amount, `Recarga: ${p.name}`, "", "recarga");
    notify("Saldo recarregado", `${p.name} +${formatAOAshort(amount)}`, "green");
  };
  const removePlayer = (id: number) => {
    const p = dataRef.current.players.find((x) => x.id === id);
    upd("players", (v) => v.filter((x) => x.id !== id));
    if (p) { logDel("Jogador", p.name, { ...p, photo: undefined }); toast("Jogador removido", p.name, "red"); }
  };
  const importPlayers = (rows: { name: string; tag: string; phone: string }[]) => {
    const existing = dataRef.current.players;
    const fresh = rows
      .filter((r) => !existing.some((p) => p.name.toLowerCase() === r.name.toLowerCase()))
      .map((r) => ({
        id: uid(), name: r.name, tag: "@" + r.tag.toLowerCase().replace("@", "").replace(/\s/g, "_"), email: "",
        phone: r.phone, birth: "", house: dataRef.current.config.houseName, balance: 0, createdAt: Date.now(), lastActive: null,
      }));
    if (!fresh.length) return toast("Nada para importar", "Nenhum jogador novo encontrado no ficheiro.", "amber");
    upd("players", (v) => [...fresh, ...v]);
    notify("Lista importada", `${fresh.length} jogador${fresh.length === 1 ? "" : "es"} adicionado${fresh.length === 1 ? "" : "s"}.`, "green");
  };

  /* ---------- Sala de Stock: entradas, saídas automáticas (vendas) e saídas manuais ---------- */
  const addInventory = (name: string, stock: number, min: number, unit = "un", cost = 0) => {
    const id = uid();
    const mv: StockMove | null = stock > 0 ? {
      id: uid(), ts: Date.now(), itemId: id, itemName: name, kind: "in", reason: "inicial", qty: stock, unit, unitCost: cost,
      before: 0, after: stock, note: "Stock inicial", actorId: actorRef.current.id, actorName: actorRef.current.name,
    } : null;
    setData((d) => ({ ...d, inventory: [...d.inventory, { id, name, stock, min, unit, cost }], stockMoves: mv ? [mv, ...d.stockMoves].slice(0, 3000) : d.stockMoves }));
    logAct("stock", `Item de stock adicionado: ${name}`, `${stock} ${unit}`);
    toast("Item adicionado", name, "green");
  };

  /** Devolve uma mensagem de erro, ou null se correu bem. */
  const stockMove = (
    itemId: number, kind: "in" | "out", reason: StockReason, qty: number,
    o: { unitCost?: number; note?: string; asExpense?: boolean; quiet?: boolean } = {}
  ): string | null => {
    const it = dataRef.current.inventory.find((i) => i.id === itemId);
    if (!it) return "Item não encontrado.";
    if (!(qty > 0)) return "Indique a quantidade.";
    const unit = it.unit ?? "un";
    if (kind === "out" && reason !== "venda" && qty > it.stock) return `Só há ${it.stock} ${unit} em stock.`;
    const newCost = kind === "in" && o.unitCost && o.unitCost > 0 ? o.unitCost : undefined;
    const cost = newCost ?? it.cost ?? 0;
    const actor = actorRef.current;
    let before = it.stock, after = it.stock;
    setData((d) => {
      const cur = d.inventory.find((i) => i.id === itemId);
      if (!cur) return d;
      before = cur.stock;
      after = Math.max(0, kind === "in" ? cur.stock + qty : cur.stock - qty);
      const mv: StockMove = {
        id: uid(), ts: Date.now(), itemId, itemName: cur.name, kind, reason, qty, unit, unitCost: cost, before, after,
        note: o.note?.trim() || undefined, actorId: actor.id, actorName: actor.name,
      };
      return {
        ...d,
        inventory: d.inventory.map((i) => (i.id === itemId ? { ...i, stock: after, cost: newCost ?? i.cost } : i)),
        stockMoves: [mv, ...d.stockMoves].slice(0, 3000),
      };
    });
    const label = { inicial: "Stock inicial", compra: "Entrada (compra)", venda: "Saída por venda", consumo: "Saída: alimentação", despesa: "Saída: despesa da casa", perda: "Saída: perda", ajuste: "Ajuste" }[reason];
    logAct("stock", `${label}: ${it.name}`, `${kind === "in" ? "+" : "−"}${qty} ${unit}`);
    if (kind === "in" && reason === "compra" && o.asExpense && cost > 0) {
      addTx("out", Math.round(qty * cost), `Compra de stock: ${it.name}`, `${qty} × ${formatAOAshort(cost)}`, "manual");
    }
    if (!o.quiet) toast(kind === "in" ? "Entrada registada" : "Saída registada", `${it.name} • ${kind === "in" ? "+" : "−"}${qty} ${unit}`, kind === "in" ? "green" : "amber");
    const left = Math.max(0, kind === "in" ? it.stock + qty : it.stock - qty);
    if (kind === "out" && left <= it.min && it.stock > it.min) notify("Stock baixo", `${it.name}: restam ${left} ${unit}`, "amber");
    return null;
  };
  const removeInventory = (id: number) => {
    const it = dataRef.current.inventory.find((i) => i.id === id);
    upd("inventory", (v) => v.filter((i) => i.id !== id));
    if (it) logDel("Item de stock", it.name, it);
  };

  /* ---------- vendas (produtos e serviços) ---------- */
  const addCatalogItem = (i: Omit<SaleItem, "id">) => {
    const same = (x: SaleItem) => x.kind === i.kind && x.name.toLowerCase() === i.name.toLowerCase();
    upd("catalog", (v) => (v.some(same) ? v.map((x) => (same(x) ? { ...x, price: i.price, invId: i.invId ?? x.invId } : x)) : [...v, { id: uid(), ...i }]));
    logAct("catalogo", `Catálogo: ${i.name}`, formatAOAshort(i.price));
    toast("Guardado no catálogo", `${i.name} • ${formatAOAshort(i.price)}`, "cyan");
  };
  const removeCatalogItem = (id: number) => {
    const it = dataRef.current.catalog.find((x) => x.id === id);
    upd("catalog", (v) => v.filter((x) => x.id !== id));
    if (it) logDel("Item do catálogo", it.name, it);
  };
  const updateCatalogPrice = (id: number, price: number) => {
    const old = dataRef.current.catalog.find((x) => x.id === id);
    upd("catalog", (v) => v.map((x) => (x.id === id ? { ...x, price } : x)));
    if (old) logAct("catalogo", `Preço alterado: ${old.name}`, `${formatAOAshort(old.price)} → ${formatAOAshort(price)}`, "warn");
    toast("Preço atualizado", formatAOAshort(price), "cyan");
  };

  const checkoutSale = (lines: CartLine[], method: string, customer: string) => {
    let total = 0;
    const stockUse = new Map<number, number>();
    lines.forEach((l) => {
      const amount = Math.round(l.unitPrice * l.qty * 100) / 100;
      total += amount;
      addTx(
        "in", amount,
        `${l.kind === "produto" ? "Venda" : "Serviço"}: ${l.qty}x ${l.name}`,
        `(${l.qty} x ${formatAOAshort(l.unitPrice)}) - ${method}${customer ? ` - ${customer}` : ""}`,
        l.kind === "produto" ? "venda" : "servico", l.name
      );
      if (l.invId) stockUse.set(l.invId, (stockUse.get(l.invId) ?? 0) + l.qty);
    });
    stockUse.forEach((qty, invId) => { stockMove(invId, "out", "venda", qty, { note: `Venda${customer ? ` • ${customer}` : ""}`, quiet: true }); });

    // Guardar a fatura separadamente, sem duplicar a receita.
    const invoiceTs = Date.now();
    const invoiceNumber = `CJ-${invoiceTs}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const invoice: Invoice = {
      id: invoiceTs,
      number: invoiceNumber,
      ts: invoiceTs,
      customer: customer || "Cliente geral",
      method,
      actorId: actorRef.current.id,
      actorName: actorRef.current.name,
      lines: lines.map((l) => ({
        name: l.name,
        kind: l.kind,
        qty: l.qty,
        unitPrice: l.unitPrice,
        total: Math.round(l.unitPrice * l.qty * 100) / 100,
        invId: l.invId,
      })),
      total: Math.round(total * 100) / 100,
    };
    setData((d) => ({ ...d, invoices: [invoice, ...(d.invoices ?? [])] }));

    notify("Venda concluída", `${lines.length} item(ns) • ${formatAOA(total)} • ${method}${actorRef.current.role === "staff" ? ` • por ${actorRef.current.name}` : ""}`, "green");
  };

  /* ---------- assistente IA: dados reais da Game House ---------- */
  const getAiCtx = (): AiContext => {
    const d = dataRef.current;
    const t = new Date();
    const d0 = sod(t);
    const d1 = addDays(d0, 1);
    const w0 = startOfWeek(t);
    const m0 = new Date(t.getFullYear(), t.getMonth(), 1);
    const m1 = new Date(t.getFullYear(), t.getMonth() + 1, 1);
    const today = totals(d.transactions, d0, d1);
    const salesToday = d.transactions
      .filter((x) => (x.category === "venda" || x.category === "servico") && x.type === "in" && x.ts >= d0.getTime() && x.ts < d1.getTime())
      .reduce((a, x) => a + x.value, 0);
    const busy = new Set(d.sessions.map((s) => s.stationId));
    const free = d.stations.filter((s) => !busy.has(s.id) && s.status === "free").length;
    const maint = d.stations.filter((s) => !busy.has(s.id) && s.status === "maintenance").length;
    const reserved = d.stations.filter((s) => !busy.has(s.id) && s.status === "reserved").length;
    const next = d.bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({ b, ts: bookingTs(b.date, b.start) }))
      .filter((x) => x.ts >= Date.now())
      .sort((a, b) => a.ts - b.ts)[0];
    return {
      houseName: d.config.houseName,
      ownerName: d.config.ownerName,
      nowText: `${fullDate(t)} às ${fmtTime(t)}`,
      stations: d.stations.length,
      free, maintenance: maint, reserved,
      occupied: d.stations.filter((s) => busy.has(s.id)).length,
      revenueToday: today.income,
      expenseToday: today.expense,
      revenueWeek: totals(d.transactions, w0, addDays(w0, 7)).income,
      revenueMonth: totals(d.transactions, m0, m1).income,
      salesToday,
      balance: d.config.openingBalance + d.transactions.reduce((a, x) => a + (x.type === "in" ? x.value : -x.value), 0),
      goal: d.config.dailyGoal,
      players: d.players.length,
      openTime: d.config.openTime,
      closeTime: d.config.closeTime,
      nextBooking: next ? `${next.b.date} ${next.b.start} - ${next.b.stationName} - ${next.b.players}` : "",
      lowStock: d.inventory.filter((i) => i.stock <= i.min).map((i) => `${i.name} (${i.stock})`),
    };
  };

  /* ---------- PDF ---------- */
  const openPdf = (report: Report) => setPdfSheet({ open: true, report });
  /** Funcionário: relatório PDF só com o que ele registou hoje */
  const myToday = !isOwner && me ? todaysOf(transactions, me.id, now) : [];
  const openMyCash = () =>
    setPdfSheet({ open: true, own: true, report: buildReport("day", new Date(), myToday, new Date()) });
  const openPdfFromSettings = () =>
    setPdfSheet({ open: true, report: buildReport("day", new Date(), dataRef.current.transactions, new Date()) });

  /* ---------- definições ---------- */
  const testAlarm = () => {
    unlockAudio();
    startAlarm({ sound: config.soundOn, vibrate: config.vibrateOn });
    toast("A testar alarme…", config.soundOn || config.vibrateOn ? "Som e vibração por 3 segundos." : "Som e vibração estão desativados.", "cyan");
    setTimeout(() => { if (ringingRef.current.length === 0) stopAlarm(); }, 3000);
  };

  const exportBackup = () => {
    downloadFile(`cris-jose-backup-${ymd(new Date())}.json`, JSON.stringify({ ...dataRef.current, config: { ...dataRef.current.config, aiKey: "" } }, null, 2), "application/json");
    patchConfig({ lastBackup: Date.now() });
    toast("Cópia de segurança guardada", "Ficheiro descarregado.", "green");
  };

  const importBackup = async (file: File) => {
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      if (!parsed) throw new Error("inválido");
      setData({
        ...parsed, lastTick: Date.now(),
        config: { ...parsed.config, setupDone: true, houseName: account.houseName, ownerName: account.ownerName, password: account.passHash },
      });
      setRinging([]);
      toast("Cópia restaurada", `${parsed.config.houseName || "Dados"} carregados com sucesso.`, "green");
    } catch {
      toast("Ficheiro inválido", "Escolha uma cópia de segurança desta app.", "red");
    }
  };

  const resetAll = () => {
    stopAlarm();
    clearData();
    setRinging([]);
    setShowNotif(false);
    setShowInventory(false);
    setShowSales(false);
    setShowAI(false);
    setPdfSheet({ open: false, report: null });
    setStartModal({ open: false, stationId: null });
    setManager({ open: false, stationId: null });
    setReports({ open: false, kind: "day" });
    setTab("home");
    setData(defaultData());
  };

  const handleQuick = (action: string) => {
    const need: Record<string, Perm | "owner"> = {
      "add-player": "players", book: "bookings", start: "sessions", inventory: "inventory", goal: "owner", sell: "sales",
    };
    if (need[action] && !can(need[action])) return deny();
    if (action === "add-player") setTab("players");
    else if (action === "book") setTab("bookings");
    else if (action === "start") setStartModal({ open: true, stationId: null });
    else if (action === "inventory") setShowInventory(true);
    else if (action === "goal") setShowGoal(true);
    else if (action === "sell") setShowSales(true);
  };

  const openNotif = () => {
    setShowNotif(true);
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
  };

  /* ---------- acesso e funcionários ---------- */
  const closeOverlays = () => {
    setShowNotif(false); setShowInventory(false); setShowSales(false); setShowAI(false);
    setShowStaff(false); setShowActivity(false); setShowGoal(false); setConfirm(null); setRoom(null); setShowGames(false);
    setPdfSheet({ open: false, report: null });
    setStartModal({ open: false, stationId: null });
    setManager({ open: false, stationId: null });
    setReports({ open: false, kind: "day" });
  };

  const logout = () => {
    if (me) {
      logAs({ id: me.id, name: me.name, role: "staff" }, "logout", `${me.name} saiu da app`);
      setData((d) => ({
        ...d,
        notifications: [{ id: uid(), ts: Date.now(), title: "Funcionário saiu", desc: `${me.name} terminou sessão.`, tone: "amber" as const, read: false }, ...d.notifications].slice(0, 300),
      }));
    }
    closeOverlays();
    setTab("home");
    if (account.shadow) void live.leave().finally(onExit);
    else onExit();
  };

  const createStaff = async (n: NewStaff): Promise<string | null> => {
    const inv = normCode(n.inviteCode);
    const uc = normCode(n.userCode);
    if (inv.length < 4) return "O código de convite é muito curto.";
    if (dataRef.current.staff.some((x) => normCode(x.inviteCode) === inv) || inviteTaken(n.inviteCode, account.id)) return "Este código de convite já está em uso. Gere outro.";
    if (dataRef.current.staff.some((x) => normCode(x.userCode) === uc)) return "Já existe um funcionário com este código de utilizador.";
    const ch = channelFor(account);
    if (ch?.kind === "owner") {
      const free = await inviteFree(ch.email, n.inviteCode);
      if (!free.ok) return "Sem ligação à internet para confirmar o convite. Ligue-se e tente de novo.";
      if (!free.data) return "Este código de convite já está em uso noutra conta. Gere outro.";
    }
    const st: Staff = {
      id: `s${uid()}`, name: n.name, phone: n.phone, inviteCode: n.inviteCode.toUpperCase(), userCode: n.userCode.toUpperCase(),
      pass: hashPass(n.password), perms: n.perms, active: true, createdAt: Date.now(), lastLogin: null,
    };
    upd("staff", (v) => [...v, st]);
    logAct("equipa", `Funcionário adicionado: ${st.name}`, `${st.perms.length} permissões`);
    toast("Funcionário criado", st.name, "green");
    return null;
  };

  const updateStaff = (id: string, patch: Partial<Pick<Staff, "name" | "phone" | "perms" | "active">>) => {
    const old = dataRef.current.staff.find((x) => x.id === id);
    if (!old) return;
    upd("staff", (v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (patch.perms) logAct("equipa", `Permissões alteradas: ${old.name}`, `${patch.perms.length} permissões`, "warn");
    if (patch.active !== undefined) logAct("equipa", `${old.name} ${patch.active ? "desbloqueado" : "bloqueado"}`, undefined, "warn");
  };

  const resetStaffPass = (id: string, password: string) => {
    const old = dataRef.current.staff.find((x) => x.id === id);
    if (!old) return;
    upd("staff", (v) => v.map((x) => (x.id === id ? { ...x, pass: hashPass(password) } : x)));
    logAct("equipa", `Nova palavra-passe gerada: ${old.name}`, undefined, "warn");
  };

  const removeStaff = (id: string) => {
    const old = dataRef.current.staff.find((x) => x.id === id);
    if (!old) return;
    upd("staff", (v) => v.filter((x) => x.id !== id));
    logDel("Funcionário", old.name, { ...old, pass: undefined });
    toast("Funcionário removido", old.name, "red");
  };


  /* ---------- ADM: cobrança, IA, anúncios ---------- */
  const bill = billInfo(admin.billing, now);
  const submitPayment = (amount: number, method: string, ref: string) => {
    setAdmin((a) => ({ ...a, billing: { ...a.billing, payments: [newPayment(amount, method, ref), ...a.billing.payments] } }));
    logAct("cobranca", `Pagamento enviado: ${formatAOAshort(amount)}`, `${method}${ref ? ` • ${ref}` : ""}`, "warn");
    toast("Pagamento enviado", "Aguarde a confirmação do ADM.", "cyan");
  };

  const redeemCode = async (code: string): Promise<boolean> => {
    const r = await licenseRequest("redeem", {
      houseId: adminRef.current.houseId.trim().toUpperCase(),
      code: code.trim().toUpperCase(),
    });
    if (!r.ok || r.data.valid !== true || typeof r.data.until !== "number") {
      return false;
    }
    const until = r.data.until;
    setAdmin((a) => ({ ...a, billing: { ...a.billing, enabled: true, manualBlock: false, dueAt: until, payments: [newPayment(a.billing.amount, "Código de ativação", code.trim().toUpperCase(), "confirmed"), ...a.billing.payments] } }));
    logAct("cobranca", "Acesso ativado por código", undefined, "warn");
    toast("Acesso ativado", `Válido até ${new Date(until).toLocaleDateString("pt-PT")}.`, "green");
    return true;
  };

  const activeAds = gadm.adsOn ? gadm.ads.filter((a) => a.active) : [];
  /** Contadores de vistas/toques: lê o estado mais recente do disco para não apagar edições do ADM. */
  const bumpAd = (id: number, field: "views" | "clicks") => {
    const cur = loadGlobalAdm();
    if (!cur.ads.some((x) => x.id === id)) return;
    const next = { ...cur, ads: cur.ads.map((x) => (x.id === id ? { ...x, [field]: x[field] + 1 } : x)) };
    saveGlobalAdm(next); // dispara ADM_EVENT, que atualiza o estado
  };
  const adView = (id: number) => bumpAd(id, "views");
  const adClick = (ad: Ad) => {
    bumpAd(ad.id, "clicks");
    if (ad.link) window.open(ad.link, "_blank", "noopener");
  };
  const allowNotif = () => {
    void askNotifPermission().then((p) => {
      setNotifAsk(false);
      if (p === "granted") void systemNotify("Notificações ativadas", "Vai receber os alertas da Game House neste telemóvel.", "ativadas");
      else toast("Notificações não ativadas", "Pode ativar nas definições do telemóvel.", "amber");
    });
  };

  /* ---------- app ---------- */
  return (
    <div className="cj-root relative h-[100dvh] overflow-hidden bg-[#050505]">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 top-[-80px] h-[420px] w-[420px] rounded-full bg-[#00E5FF]/[0.09] blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-[-80px] h-[420px] w-[420px] rounded-full bg-[#00FF88]/[0.08] blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/[0.07] blur-[130px]" />

      <div className="cj-deskpanel pointer-events-none absolute left-[6%] top-1/2 hidden w-[300px] -translate-y-1/2 xl:block">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#00E5FF]"><Sparkles size={14} /> CJ Gerenciamento • v4.5</div>
        <h1 className="mt-3 font-display text-[52px] font-extrabold uppercase leading-[0.95]">
          CJ<br /><span className="bg-gradient-to-r from-[#00E5FF] to-[#00FF88] bg-clip-text text-transparent">Gerenciamento</span>
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
          Máquinas com cronómetro ou preço fixo, vendas, assistente IA, reservas, jogadores e relatórios em PDF para o WhatsApp — tudo em Kwanzas.
        </p>
        {config.setupDone && loggedIn && (
          <div className="mt-5 space-y-2 text-[12px] font-semibold text-neutral-300">
            {[`${sessions.length}/${stations.length} máquinas ativas agora`, `${formatAOAshort(balance)} em caixa`].map((t) => (
              <div key={t} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00FF88]" /> {t}</div>
            ))}
          </div>
        )}
      </div>

      {config.setupDone && loggedIn && sessions.length > 0 && (
        <div className="cj-deskpanel pointer-events-none absolute right-[6%] top-1/2 hidden w-[270px] -translate-y-1/2 xl:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Estado da Casa</p>
            <div className="mt-3 space-y-3">
              {sessions.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-2.5">
                  <span className="live-dot h-2 w-2 rounded-full bg-[#00FF88]" />
                  <div className="flex-1 truncate text-[12px] font-semibold">{stationName(s.stationId)} • {s.plan}</div>
                  <span className="text-[11px] font-bold tabular-nums text-neutral-400">{s.kind === "timed" ? formatClock(s.durationSec - (now - s.startedAt) / 1000) : "fixo"}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[#00E5FF]/10 p-3 text-[11px] font-semibold text-[#00E5FF]"><Zap size={12} className="mr-1 inline" /> Tudo sincronizado com a hora real.</div>
          </div>
        </div>
      )}

      <div className="cj-col relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col">
        <div className="cj-frame relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#121212]">
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

          {needSetup ? (
            <SetupWizard account={account} onFinish={finishSetup} onBack={onExit} />
          ) : srvBlocked ? (
            <BlockedScreen houseId={account.id} houseName={config.houseName} />
          ) : bill.status === "blocked" ? (
            <Paywall admin={admin} houseName={config.houseName} isOwner={isOwner} onSubmit={submitPayment} onRedeem={redeemCode} />
          ) : (
            <>
              <TopHeader userName={isOwner ? config.ownerName : actor.name} houseName={account.houseName} photo={account.photo} onBell={openNotif} notifCount={unread} />
              <BillBanner info={bill} />
              {notifAsk && config.notifOn && notifPermission() === "default" && <NotifPrompt onAllow={allowNotif} onLater={() => setNotifAsk(false)} />}
              <RoomChips rooms={gadm.rooms.filter((r) => r.active)} onOpen={setRoom} gamesCount={gadm.games.filter((x) => x.active).length} onGames={() => setShowGames(true)} />
              {storageFull && (
                <p className="mx-4 mt-2 rounded-xl border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 px-3 py-2 text-[11.5px] font-semibold text-[#FF8FA3]">
                  Memória do telemóvel cheia: as últimas alterações não estão a ser guardadas. Faça uma cópia de segurança.
                </p>
              )}

              <div ref={scrollRef} className="thin-scroll relative mt-2 flex-1 overflow-y-auto pb-20">
                {tab === "home" && !isOwner && me && <div className="mb-3"><MyCashCard mine={myToday} onSendPdf={openMyCash} /></div>}
                {tab === "home" && (
                  <HomeScreen
                    config={can("finance") ? config : { ...config, dailyGoal: 0 }} stations={stations} sessions={sessions}
                    transactions={can("finance") ? transactions : []}
                    bookings={bookings} inventory={inventory} now={now}
                    onQuick={handleQuick} onExtend={g("sessions", extendSession)} onEnd={g("sessions", endSession)} onSetStatus={g("sessions", setStationStatus)}
                    onStartOn={g("sessions", (id: number) => setStartModal({ open: true, stationId: id }))}
                    onManage={g("stations", (id: number | null) => setManager({ open: true, stationId: id }))}
                    onOpenReports={g("reports", () => setReports({ open: true, kind: "day" }))}
                  />
                )}
                {tab === "bookings" && (
                  <BookingsScreen bookings={bookings} stations={stations} now={now} lang={config.lang} onAdd={g("bookings", addBooking)} onStatus={g("bookings", setBookingStatus)} onRemove={g("bookings", ask(() => "Apagar esta reserva? Fica registado quem a apagou.", removeBooking))} />
                )}
                {tab === "players" && (
                  <PlayersScreen players={players} sessions={sessions} now={now} houseName={config.houseName} onRegister={g("players", registerPlayer)} onTopUp={g("players", topUp)} onRemove={g("players", ask((id: number) => `Apagar o jogador ${dataRef.current.players.find((x) => x.id === id)?.name ?? ""}? Fica registado quem o apagou.`, removePlayer))} onImport={g("players", importPlayers)} />
                )}
                {tab === "finances" && (
                  <FinanceScreen
                    transactions={transactions} balance={balance} now={now}
                    onAdd={g("finance", (type: "in" | "out", value: number, label: string) => { addTx(type, value, (type === "in" ? "Receita: " : "Despesa: ") + label); notify(type === "in" ? "Entrada registada" : "Despesa registada", `${type === "in" ? "+" : "-"} ${formatAOAshort(value)} • ${label}`, type === "in" ? "green" : "red"); })}
                    onOpenReports={g("reports", (t: ReportTab) => setReports({ open: true, kind: t }))}
                    onOpenSales={g("sales", () => setShowSales(true))}
                  />
                )}
                {tab === "settings" && !isOwner && me && (
                  <StaffProfile staff={me} houseName={account.houseName} photo={account.photo} onLogout={logout} />
                )}
                {tab === "settings" && isOwner && (
                  <SettingsScreen
                    config={config} stationCount={stations.length} now={now}
                    onPatch={(patch) => { patchConfig(patch); if (patch.password) onAccountPatch({ passHash: patch.password }); }}
                    photo={account.photo} accountId={account.id} isOwner={isOwner}
                    onProfile={(patch, photo) => {
                      patchConfig(patch);
                      onAccountPatch({ houseName: patch.houseName, ownerName: patch.ownerName, photo });
                    }}
                    onOpenStations={() => setManager({ open: true, stationId: null })}
                    onTestAlarm={testAlarm}
                    onLogout={logout}
                    onOpenStaff={() => setShowStaff(true)}
                    onOpenActivity={() => setShowActivity(true)}
                    staffCount={staff.length}
                    onApplyPlans={applyDefaultPlans}
                    onExport={exportBackup}
                    onImport={(f) => void importBackup(f)}
                    onReset={resetAll}
                    onOpenSales={() => setShowSales(true)}
                    onOpenPdf={openPdfFromSettings}
                    onOpenAI={() => setShowAI(true)}
                    notify={notify} toast={toast}
                  />
                )}
              </div>

              {/* Botão flutuante do assistente IA */}
              {isOwner && <button
                onClick={() => setShowAI(true)}
                aria-label="Assistente IA"
                className="absolute bottom-[108px] right-3 z-30 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#00FF88] text-black shadow-[0_0_22px_rgba(0,229,255,0.55)] transition active:scale-90"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-[#00E5FF]/30" />
                <Sparkles size={23} className="relative" />
              </button>}

              {activeAds.length > 0 && <div className="relative pt-2"><AdBanner ads={activeAds} slideSec={gadm.slideSec} onView={adView} onClick={adClick} /></div>}

              <nav className="relative border-t border-white/[0.08] bg-[#0e0e0e]/95 px-2 pt-2 backdrop-blur" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))" }}>
                <div className="absolute -top-[1.5px] left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent" />
                <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleTabs.length + 1}, minmax(0, 1fr))` }}>
                  {visibleTabs.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)} className="group flex flex-col items-center gap-1 py-1.5 transition active:scale-95">
                        <span className={cn("relative grid h-7 w-12 place-items-center rounded-full transition-all", active && (t.id === "home" ? "bg-[#00FF88]/15" : "bg-[#00E5FF]/12"))}>
                          <t.icon
                            size={20}
                            className={cn("transition-all", active ? (t.id === "home" ? "text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]" : "text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]") : "text-neutral-500 group-hover:text-neutral-300")}
                            strokeWidth={active ? 2.4 : 1.8}
                          />
                          {active && <span className={cn("absolute -top-2.5 h-[2.5px] w-8 rounded-full", t.id === "home" ? "bg-[#00FF88] shadow-[0_0_10px_#00FF88]" : "bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]")} />}
                        </span>
                        <span className={cn("text-[10.5px] font-semibold", active ? (t.id === "home" ? "text-[#00FF88]" : "text-[#00E5FF]") : "text-neutral-500")}>{t.id === "settings" && !isOwner ? "Conta" : t.label}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => setGuideManualOpen((n) => n + 1)} aria-label="Tutorial" className="group flex flex-col items-center gap-1 py-1.5 transition active:scale-95">
                    <span className="grid h-7 w-12 place-items-center rounded-full text-[#00E5FF]"><CircleHelp size={20} /></span>
                    <span className="text-[10.5px] font-semibold text-neutral-500">Tutorial</span>
                  </button>
                </div>
              </nav>

              {showNotif && (
                <div className="fade absolute inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShowNotif(false)}>
                  <div className="modal-sheet absolute inset-x-0 top-0 max-h-[85%] overflow-y-auto thin-scroll rounded-b-[24px] border-b border-[#00E5FF]/30 bg-[#161616] p-5" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-display text-[19px] font-extrabold uppercase">Notificações <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{notifications.length}</span></h3>
                      <div className="flex gap-2">
                        {notifications.length > 0 && isOwner && (
                          <button onClick={() => upd("notifications", () => [])} className="flex items-center gap-1 rounded-full bg-[#FF4D6D]/10 px-3 py-1 text-[11px] font-bold text-[#FF4D6D]"><Trash2 size={12} /> Limpar</button>
                        )}
                        <button onClick={() => setShowNotif(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={15} /></button>
                      </div>
                    </div>
                    <p className="mb-3 text-[11px] text-neutral-500">Cada aviso apaga-se sozinho 24h depois.{!config.notifOn && " (Notificações desativadas em Definições)"}</p>
                    {notifications.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-[12.5px] text-neutral-500">
                        <Bell size={22} className="mx-auto mb-2 opacity-50" />
                        Sem notificações. Tudo o que fizer na app aparece aqui.
                      </div>
                    )}
                    {notifications.map((n) => (
                      <div key={n.id} className="mb-2 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#1e1e1e] p-3">
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", toneIcon[n.tone])}><CheckCircle2 size={17} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold">{n.title}</p>
                          {n.desc && <p className="text-[12px] text-neutral-400">{n.desc}</p>}
                          <p className="mt-0.5 text-[10.5px] text-neutral-600">{clockHM(n.ts)} • {timeAgo(n.ts, now)} • apaga em {Math.max(1, Math.ceil((n.ts + DAY - now) / 3600000))}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {startModal.open && (
                <StartSessionModal
                  key={startModal.stationId ?? "auto"} stations={stations} sessions={sessions} players={players}
                  initialStationId={startModal.stationId} onStart={startSession}
                  onClose={() => setStartModal({ open: false, stationId: null })}
                  onManage={g("stations", (id: number | null) => { setStartModal({ open: false, stationId: null }); setManager({ open: true, stationId: id }); })}
                />
              )}

              {manager.open && (
                <StationManager
                  key={manager.stationId ?? "list"} stations={stations} sessions={sessions} initialStationId={manager.stationId}
                  onClose={() => setManager({ open: false, stationId: null })}
                  onAddPlan={addPlan} onRemovePlan={removePlan} onCopyAll={copyAll}
                  onAddStations={addStations} onRename={renameStation}
                  onRemoveStation={ask((id: number) => `Apagar ${stationName(id)}? Fica registado quem a apagou.`, removeStation)} onSetStatus={setStationStatus}
                />
              )}

              {reports.open && (
                <ReportsView
                  key={reports.kind} transactions={transactions} now={now} lang={config.lang} initial={reports.kind}
                  onSendPdf={g("pdf", openPdf)}
                  onClose={() => setReports({ open: false, kind: "day" })}
                />
              )}

              {showSales && (
                <SalesView
                  catalog={catalog} inventory={inventory} transactions={transactions} invoices={data.invoices ?? []} houseName={config.houseName} now={now}
                  onAddItem={g("catalog", addCatalogItem)}
                  onRemoveItem={g("owner", ask(() => "Apagar este item do catálogo?", removeCatalogItem))}
                  onUpdatePrice={g("catalog", updateCatalogPrice)}
                  canManage={can("catalog")} canRemove={isOwner} onlyActorId={isOwner ? null : actor.id}
                  onCheckout={g("sales", checkoutSale)} onClose={() => setShowSales(false)}
                />
              )}

              {showAI && isOwner && (
                <AssistantView config={config} ownerName={config.ownerName} getCtx={getAiCtx} onPatch={patchConfig} onClose={() => setShowAI(false)} />
              )}

              {showInventory && (
                <StockRoom items={inventory} moves={data.stockMoves} catalog={catalog} now={now}
                  onCreate={g("inventory", addInventory)} onMove={(...a: Parameters<typeof stockMove>) => (can("inventory") ? stockMove(...a) : (deny(), "Sem permissão."))}
                  onRemove={g("inventory", ask((id: number) => `Apagar ${dataRef.current.inventory.find((x) => x.id === id)?.name ?? "este item"} da Sala de Stock?`, removeInventory))} onClose={() => setShowInventory(false)} />
              )}

              {showGoal && (
                <GoalSheet
                  goal={config.dailyGoal} onClose={() => setShowGoal(false)}
                  onSave={(v) => { patchConfig({ dailyGoal: v }); setShowGoal(false); notify(v > 0 ? "Meta diária definida" : "Meta diária removida", v > 0 ? formatAOA(v) : undefined, "green"); }}
                />
              )}

              {pdfSheet.open && (
                <PdfShareSheet
                  config={config} report={pdfSheet.report} txs={pdfSheet.own ? myToday : transactions}
                  staffName={!isOwner ? actor.name : undefined} ownCash={pdfSheet.own}
                  onPatch={patchConfig} notify={notify} toast={toast}
                  onClose={() => setPdfSheet({ open: false, report: null })}
                />
              )}

              {showStaff && isOwner && (
                <StaffManager
                  staff={staff} activity={data.activity} houseName={config.houseName} now={now}
                  onClose={() => setShowStaff(false)} onCreate={createStaff} onUpdate={updateStaff}
                  onResetPass={resetStaffPass} onRemove={removeStaff}
                />
              )}

              {showActivity && isOwner && (
                <ActivityView activity={data.activity} history={data.history} staff={staff} onClose={() => setShowActivity(false)} />
              )}

              {confirm && (
                <Confirm message={confirm.msg} confirmLabel={confirm.label} onCancel={() => setConfirm(null)} onConfirm={() => { const r = confirm.run; setConfirm(null); r(); }} />
              )}

              {ringSession && (
                <AlarmModal
                  label={stationName(ringSession.stationId)} player={ringSession.player} plan={ringSession.plan}
                  overtimeSec={Math.max(0, (now - ringSession.startedAt) / 1000 - ringSession.durationSec)}
                  onSilence={() => setRinging((r) => r.filter((x) => x !== ringSession.id))}
                  onExtend={g("sessions", (m: number) => extendSession(ringSession.id, m))}
                  onEnd={g("sessions", () => endSession(ringSession.id))}
                />
              )}
            </>
          )}

          {room && <RoomView room={room} onClose={() => setRoom(null)} />}
          {showGames && <GamesRoom games={gadm.games.filter((x) => x.active)} onClose={() => setShowGames(false)} />}
      <OnboardingGuide userKey={String(account.id)} manualOpen={guideManualOpen} tab={tab} onNavigate={setTab} isOwner={isOwner} room={room} />

          <div className="pointer-events-none absolute inset-x-4 bottom-28 z-[80] flex flex-col gap-2">
            {toasts.map((t) => (
              <div key={t.id} className={cn("toast-anim pointer-events-auto flex items-center gap-3 rounded-2xl border bg-[#1a1a1a]/95 p-3 backdrop-blur", toneBorder[t.tone])}>
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", toneIcon[t.tone])}><CheckCircle2 size={18} /></span>
                <div className="min-w-0"><p className="text-[13px] font-bold">{t.title}</p>{t.desc && <p className="truncate text-[12px] text-neutral-400">{t.desc}</p>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
