import type { AdminData, AppData, PlanKind, SaleKind, StationStatus } from "./types";
import { norm } from "./assistant";
import { pad, formatAOAshort } from "./format";
import { uid } from "./storage";
import { DAY, confirmPayment } from "./billing";

export interface World { data: AppData; admin: AdminData }

export type AdminAction =
  | { type: "set_house"; houseName?: string; openTime?: string; closeTime?: string; dailyGoal?: number }
  | { type: "add_stations"; count: number }
  | { type: "rename_station"; station: string; name: string }
  | { type: "remove_station"; station: string }
  | { type: "station_status"; station: string; status: StationStatus }
  | { type: "add_plan"; station: string; name: string; kind: PlanKind; price: number; minutes?: number }
  | { type: "set_plan_price"; station: string; plan: string; price: number }
  | { type: "add_catalog"; name: string; kind: SaleKind; price: number }
  | { type: "set_catalog_price"; name: string; price: number }
  | { type: "add_inventory"; name: string; stock: number; min: number }
  | { type: "staff_active"; name: string; active: boolean }
  | { type: "charge"; amount: number; days?: number; dueDate?: string; note?: string }
  | { type: "billing_block"; blocked: boolean }
  | { type: "confirm_payment" }
  | { type: "add_ad"; title: string; text: string; link?: string }
  | { type: "toggle_ads"; on: boolean }
  | { type: "add_room"; name: string; emoji?: string; content: string }
  | { type: "notice"; title: string; text: string };

/** Ações que merecem atenção extra no ecrã de confirmação. */
export const isRisky = (a: AdminAction) => a.type === "remove_station" || a.type === "billing_block" || a.type === "staff_active";

/* ---------- validação (o que vem da IA nunca é aplicado sem passar aqui) ---------- */
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const hhmm = (v: unknown) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim()) ? v.trim() : undefined);

export function sanitize(raw: unknown): AdminAction | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  switch (r.type) {
    case "set_house": {
      const a: AdminAction = { type: "set_house", houseName: str(r.houseName, 60) || undefined, openTime: hhmm(r.openTime), closeTime: hhmm(r.closeTime), dailyGoal: num(r.dailyGoal, 0, 1e8) ?? undefined };
      return a.houseName || a.openTime || a.closeTime || a.dailyGoal !== undefined ? a : null;
    }
    case "add_stations": { const n = num(r.count, 1, 50); return n ? { type: "add_stations", count: Math.round(n) } : null; }
    case "rename_station": return str(r.station) && str(r.name, 40) ? { type: "rename_station", station: str(r.station), name: str(r.name, 40) } : null;
    case "remove_station": return str(r.station) ? { type: "remove_station", station: str(r.station) } : null;
    case "station_status": return str(r.station) && ["free", "reserved", "maintenance"].includes(String(r.status)) ? { type: "station_status", station: str(r.station), status: r.status as StationStatus } : null;
    case "add_plan": {
      const price = num(r.price, 0, 1e7); const kind = r.kind === "fixed" ? "fixed" : "timed";
      const minutes = num(r.minutes, 1, 1440) ?? undefined;
      if (price === null || !str(r.name, 40) || !str(r.station) || (kind === "timed" && !minutes)) return null;
      return { type: "add_plan", station: str(r.station), name: str(r.name, 40), kind, price, minutes: kind === "timed" ? minutes : undefined };
    }
    case "set_plan_price": { const price = num(r.price, 0, 1e7); return price !== null && str(r.station) && str(r.plan) ? { type: "set_plan_price", station: str(r.station), plan: str(r.plan), price } : null; }
    case "add_catalog": { const price = num(r.price, 0, 1e7); return price !== null && str(r.name, 40) ? { type: "add_catalog", name: str(r.name, 40), kind: r.kind === "servico" ? "servico" : "produto", price } : null; }
    case "set_catalog_price": { const price = num(r.price, 0, 1e7); return price !== null && str(r.name, 40) ? { type: "set_catalog_price", name: str(r.name, 40), price } : null; }
    case "add_inventory": { const stock = num(r.stock, 0, 1e6); return stock !== null && str(r.name, 40) ? { type: "add_inventory", name: str(r.name, 40), stock, min: num(r.min, 0, 1e6) ?? 0 } : null; }
    case "staff_active": return str(r.name, 60) && typeof r.active === "boolean" ? { type: "staff_active", name: str(r.name, 60), active: r.active } : null;
    case "charge": {
      const amount = num(r.amount, 1, 1e9); if (amount === null) return null;
      const dueDate = typeof r.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) ? r.dueDate : undefined;
      return { type: "charge", amount, days: num(r.days, 1, 365) ?? undefined, dueDate, note: str(r.note, 120) || undefined };
    }
    case "billing_block": return typeof r.blocked === "boolean" ? { type: "billing_block", blocked: r.blocked } : null;
    case "confirm_payment": return { type: "confirm_payment" };
    case "add_ad": return str(r.title, 60) && str(r.text, 160) ? { type: "add_ad", title: str(r.title, 60), text: str(r.text, 160), link: /^https?:\/\//.test(str(r.link, 300)) ? str(r.link, 300) : undefined } : null;
    case "toggle_ads": return typeof r.on === "boolean" ? { type: "toggle_ads", on: r.on } : null;
    case "add_room": return str(r.name, 30) ? { type: "add_room", name: str(r.name, 30), emoji: str(r.emoji, 4) || undefined, content: str(r.content, 2000) } : null;
    case "notice": return str(r.title, 60) ? { type: "notice", title: str(r.title, 60), text: str(r.text, 200) } : null;
    default: return null;
  }
}

export function describe(a: AdminAction): string {
  switch (a.type) {
    case "set_house": return `Casa: ${[a.houseName && `nome "${a.houseName}"`, a.openTime && `abre ${a.openTime}`, a.closeTime && `fecha ${a.closeTime}`, a.dailyGoal !== undefined && `meta ${formatAOAshort(a.dailyGoal)}`].filter(Boolean).join(", ")}`;
    case "add_stations": return `Adicionar ${a.count} máquina${a.count === 1 ? "" : "s"}`;
    case "rename_station": return `Renomear "${a.station}" para "${a.name}"`;
    case "remove_station": return `APAGAR máquina "${a.station}"`;
    case "station_status": return `Máquina "${a.station}" → ${a.status === "free" ? "livre" : a.status === "reserved" ? "reservada" : "manutenção"}`;
    case "add_plan": return `Pacote "${a.name}" (${a.kind === "timed" ? `${a.minutes} min` : "preço fixo"}) ${formatAOAshort(a.price)} em ${/tod|all/.test(norm(a.station)) ? "todas as máquinas" : `"${a.station}"`}`;
    case "set_plan_price": return `Preço de "${a.plan}" em "${a.station}" → ${formatAOAshort(a.price)}`;
    case "add_catalog": return `Catálogo: ${a.kind} "${a.name}" a ${formatAOAshort(a.price)}`;
    case "set_catalog_price": return `Preço de "${a.name}" → ${formatAOAshort(a.price)}`;
    case "add_inventory": return `Stock: "${a.name}" (${a.stock} un., mínimo ${a.min})`;
    case "staff_active": return `${a.active ? "Desbloquear" : "BLOQUEAR"} funcionário "${a.name}"`;
    case "charge": return `Cobrar ${formatAOAshort(a.amount)}${a.dueDate ? ` até ${a.dueDate}` : a.days ? ` (${a.days} dias)` : ""}`;
    case "billing_block": return a.blocked ? "BLOQUEAR o acesso à app" : "Desbloquear o acesso à app";
    case "confirm_payment": return "Confirmar o pagamento pendente mais recente";
    case "add_ad": return `Novo anúncio: "${a.title}"`;
    case "toggle_ads": return a.on ? "Ligar anúncios" : "Desligar anúncios";
    case "add_room": return `Nova sala: ${a.emoji ?? "🚪"} ${a.name}`;
    case "notice": return `Aviso: "${a.title}"`;
  }
}

/* ---------- aplicar (função pura: devolve o novo estado) ---------- */
export interface Applied { w: World; ok: boolean; msg: string; notice?: { title: string; text: string } }

function findStation(d: AppData, ref: string) {
  const q = norm(ref);
  const n = q.match(/\d+/)?.[0];
  return d.stations.find((s) => norm(s.name) === q)
    ?? (n ? d.stations.find((s) => s.id === Number(n) || norm(s.name).endsWith(n.padStart(2, "0"))) : undefined)
    ?? d.stations.find((s) => norm(s.name).includes(q));
}

export function applyAction(w: World, a: AdminAction, now: number): Applied {
  const { data: d, admin } = w;
  const fail = (msg: string): Applied => ({ w, ok: false, msg });
  const done = (data: AppData, adm: AdminData, msg: string, notice?: Applied["notice"]): Applied => ({ w: { data, admin: adm }, ok: true, msg, notice });
  const setD = (p: Partial<AppData>, msg: string) => done({ ...d, ...p }, admin, msg);
  const setA = (p: Partial<AdminData>, msg: string, notice?: Applied["notice"]) => done(d, { ...admin, ...p }, msg, notice);

  switch (a.type) {
    case "set_house":
      return setD({ config: { ...d.config, ...(a.houseName ? { houseName: a.houseName } : {}), ...(a.openTime ? { openTime: a.openTime } : {}), ...(a.closeTime ? { closeTime: a.closeTime } : {}), ...(a.dailyGoal !== undefined ? { dailyGoal: a.dailyGoal } : {}) } }, describe(a));
    case "add_stations": {
      let id = d.stations.reduce((m, s) => Math.max(m, s.id), 0);
      const add = Array.from({ length: a.count }, () => {
        id += 1;
        return { id, name: `Máquina ${pad(id)}`, status: "free" as const, plans: d.config.defaultPlans.map((p, i) => ({ ...p, id: `p${id}-${i}-${uid()}` })) };
      });
      return setD({ stations: [...d.stations, ...add] }, `${a.count} máquina(s) adicionada(s)`);
    }
    case "rename_station": {
      const s = findStation(d, a.station); if (!s) return fail(`Máquina "${a.station}" não encontrada`);
      return setD({ stations: d.stations.map((x) => (x.id === s.id ? { ...x, name: a.name } : x)) }, `${s.name} renomeada para ${a.name}`);
    }
    case "remove_station": {
      const s = findStation(d, a.station); if (!s) return fail(`Máquina "${a.station}" não encontrada`);
      if (d.sessions.some((x) => x.stationId === s.id)) return fail(`${s.name} tem uma sessão ativa — encerre-a primeiro`);
      return setD({ stations: d.stations.filter((x) => x.id !== s.id) }, `${s.name} apagada`);
    }
    case "station_status": {
      const s = findStation(d, a.station); if (!s) return fail(`Máquina "${a.station}" não encontrada`);
      return setD({ stations: d.stations.map((x) => (x.id === s.id ? { ...x, status: a.status } : x)) }, `${s.name} atualizada`);
    }
    case "add_plan": {
      const all = /tod|all/.test(norm(a.station));
      const targets = all ? d.stations : [findStation(d, a.station)].filter((x): x is NonNullable<typeof x> => !!x);
      if (!targets.length) return fail(`Máquina "${a.station}" não encontrada`);
      const ids = new Set(targets.map((t) => t.id));
      return setD({ stations: d.stations.map((s) => (ids.has(s.id) ? { ...s, plans: [...s.plans, { id: `p${uid()}`, name: a.name, kind: a.kind, price: a.price, minutes: a.minutes }] } : s)) }, `Pacote "${a.name}" criado em ${targets.length} máquina(s)`);
    }
    case "set_plan_price": {
      const s = findStation(d, a.station); if (!s) return fail(`Máquina "${a.station}" não encontrada`);
      const pl = s.plans.find((p) => norm(p.name).includes(norm(a.plan))); if (!pl) return fail(`Pacote "${a.plan}" não existe em ${s.name}`);
      return setD({ stations: d.stations.map((x) => (x.id === s.id ? { ...x, plans: x.plans.map((p) => (p.id === pl.id ? { ...p, price: a.price } : p)) } : x)) }, `${pl.name} (${s.name}) → ${formatAOAshort(a.price)}`);
    }
    case "add_catalog":
      return setD({ catalog: [...d.catalog, { id: uid(), name: a.name, kind: a.kind, price: a.price, invId: null }] }, `"${a.name}" adicionado ao catálogo`);
    case "set_catalog_price": {
      const it = d.catalog.find((c) => norm(c.name).includes(norm(a.name))); if (!it) return fail(`"${a.name}" não está no catálogo`);
      return setD({ catalog: d.catalog.map((c) => (c.id === it.id ? { ...c, price: a.price } : c)) }, `${it.name} → ${formatAOAshort(a.price)}`);
    }
    case "add_inventory":
      return setD({ inventory: [...d.inventory, { id: uid(), name: a.name, stock: a.stock, min: a.min }] }, `Stock "${a.name}" criado`);
    case "staff_active": {
      const st = d.staff.find((x) => norm(x.name).includes(norm(a.name))); if (!st) return fail(`Funcionário "${a.name}" não encontrado`);
      return setD({ staff: d.staff.map((x) => (x.id === st.id ? { ...x, active: a.active } : x)) }, `${st.name} ${a.active ? "desbloqueado" : "bloqueado"}`);
    }
    case "charge": {
      const dueAt = a.dueDate ? new Date(`${a.dueDate}T23:59:59`).getTime() : now + (a.days ?? admin.billing.periodDays) * DAY;
      return setA({ billing: { ...admin.billing, enabled: true, amount: a.amount, dueAt, note: a.note ?? admin.billing.note } }, `Cobrança de ${formatAOAshort(a.amount)} definida`,
        { title: "Nova cobrança", text: `${formatAOAshort(a.amount)} — pagar até ${new Date(dueAt).toLocaleDateString("pt-PT")}` });
    }
    case "billing_block":
      return setA({ billing: { ...admin.billing, manualBlock: a.blocked } }, a.blocked ? "Acesso bloqueado" : "Acesso desbloqueado");
    case "confirm_payment": {
      const p = admin.billing.payments.find((x) => x.status === "pending");
      if (!p) return fail("Não há pagamentos pendentes");
      return setA({ billing: confirmPayment(admin.billing, p.id, now) }, `Pagamento de ${formatAOAshort(p.amount)} confirmado`, { title: "Pagamento confirmado", text: "Obrigado! O acesso foi renovado." });
    }
    case "add_ad":
      return setA({ ads: [...admin.ads, { id: uid(), title: a.title, text: a.text, link: a.link ?? "", active: true, views: 0, clicks: 0 }], adsOn: true }, `Anúncio "${a.title}" criado`);
    case "toggle_ads":
      return setA({ adsOn: a.on }, a.on ? "Anúncios ligados" : "Anúncios desligados");
    case "add_room":
      return setA({ rooms: [...admin.rooms, { id: uid(), name: a.name, emoji: a.emoji ?? "🚪", content: a.content, active: true }] }, `Sala "${a.name}" criada`);
    case "notice":
      return done(d, admin, `Aviso "${a.title}" enviado`, { title: a.title, text: a.text });
  }
}

/* ---------- IA online: pede JSON e valida ---------- */
export function buildAdminPrompt(w: World): string {
  const { data: d, admin } = w;
  return [
    `És o agente ADM da app "CJ Gerenciamento". O administrador escreve pedidos e tu devolves as alterações a fazer.`,
    `Responde APENAS com JSON válido, sem texto fora dele: {"reply": "frase curta em português de Angola", "actions": [ ... ]}`,
    `Sê um administrador técnico profissional: confirma o objetivo, usa nomes e valores claros, não inventes estado da conta e nunca peças segredos. Prepara apenas ações permitidas; ações destrutivas devem ser descritas claramente e a app pedirá confirmação antes de as aplicar.`,
    `Ações permitidas (campo "type"): set_house{houseName,openTime"HH:MM",closeTime,dailyGoal}, add_stations{count}, rename_station{station,name}, remove_station{station}, station_status{station,status:free|reserved|maintenance}, add_plan{station("todas" ou nome),name,kind:timed|fixed,price,minutes}, set_plan_price{station,plan,price}, add_catalog{name,kind:produto|servico,price}, set_catalog_price{name,price}, add_inventory{name,stock,min}, staff_active{name,active}, charge{amount,days|dueDate"YYYY-MM-DD",note}, billing_block{blocked}, confirm_payment{}, add_ad{title,text,link}, toggle_ads{on}, add_room{name,emoji,content}, notice{title,text}.`,
    `Preços em Kwanzas (número). Se o pedido for só uma pergunta, devolve actions vazio. Nunca inventes ações fora da lista. Se faltar informação essencial, pergunta no "reply" e devolve actions vazio.`,
    `Estado atual: casa "${d.config.houseName}", horário ${d.config.openTime}-${d.config.closeTime}.`,
    `Máquinas: ${d.stations.map((s) => `${s.name}[${s.plans.map((p) => p.name).join("/")}]`).join(", ") || "nenhuma"}.`,
    `Funcionários: ${d.staff.map((s) => `${s.name}${s.active ? "" : "(bloqueado)"}`).join(", ") || "nenhum"}. Catálogo: ${d.catalog.map((c) => c.name).join(", ") || "vazio"}.`,
    `Cobrança: ${admin.billing.enabled ? `ativa, ${formatAOAshort(admin.billing.amount)}/${admin.billing.periodDays} dias` : "desligada"}${admin.billing.manualBlock ? ", acesso bloqueado" : ""}. Pagamentos pendentes: ${admin.billing.payments.filter((p) => p.status === "pending").length}. Anúncios: ${admin.ads.length}. Salas extra: ${admin.rooms.map((r) => r.name).join(", ") || "nenhuma"}.`,
  ].join("\n");
}

export function parsePlan(text: string): { reply: string; actions: AdminAction[] } | null {
  const i = text.indexOf("{"); const j = text.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try {
    const o = JSON.parse(text.slice(i, j + 1)) as { reply?: unknown; actions?: unknown };
    const actions = (Array.isArray(o.actions) ? o.actions : []).map(sanitize).filter((x): x is AdminAction => !!x).slice(0, 12);
    return { reply: str(o.reply, 600) || (actions.length ? "Preparei estas alterações:" : "Ok."), actions };
  } catch {
    return null;
  }
}

/* ---------- modo offline: comandos simples sem IA ---------- */
export function localPlan(text: string): { reply: string; actions: AdminAction[] } | null {
  const q = norm(text);
  const ok = (reply: string, a: AdminAction) => ({ reply, actions: [a] });
  let m: RegExpMatchArray | null;
  if ((m = q.match(/(adicion|cri|aument|acrescent)\w*\s+(\d+)\s+(maquina|computador|pc)/))) return ok("Vou adicionar as máquinas:", { type: "add_stations", count: Number(m[2]) });
  if ((m = q.match(/(desbloque|libera|reativ)\w*\s+(o\s+)?funcionario\s+(.+)/))) return ok("Vou desbloquear:", { type: "staff_active", name: m[3], active: true });
  if ((m = q.match(/(bloque|suspend)\w*\s+(o\s+)?funcionario\s+(.+)/))) return ok("Vou bloquear:", { type: "staff_active", name: m[3], active: false });
  if (/(desbloque|libera)\w*\s+(o\s+)?(acesso|app)/.test(q)) return ok("Vou desbloquear o acesso:", { type: "billing_block", blocked: false });
  if (/bloque\w*\s+(o\s+)?(acesso|app)/.test(q)) return ok("Vou bloquear o acesso:", { type: "billing_block", blocked: true });
  if (/confirm\w*\s+(o\s+)?pagamento/.test(q)) return ok("Vou confirmar:", { type: "confirm_payment" });
  if ((m = q.match(/cobr\w*\s+(\d[\d.\s]*\d|\d)(?:.*?(\d+)\s*dias)?/))) return ok("Vou definir a cobrança:", { type: "charge", amount: Number(m[1].replace(/[.\s]/g, "")), days: m[2] ? Number(m[2]) : undefined });
  if (/(desativ|desligar)\w*\s+(os\s+)?anuncios/.test(q)) return ok("Vou desligar os anúncios:", { type: "toggle_ads", on: false });
  if (/(ativ|ligar)\w*\s+(os\s+)?anuncios/.test(q)) return ok("Vou ligar os anúncios:", { type: "toggle_ads", on: true });
  if ((m = text.match(/an[uú]ncio\s*[:\-]\s*(.+)/i))) return ok("Vou criar o anúncio:", { type: "add_ad", title: m[1].slice(0, 40), text: m[1].slice(0, 160) });
  if ((m = text.match(/(?:cri\w*|adicion\w*)\s+(?:uma\s+)?sala\s+(?:chamada\s+)?(.+)/i))) return ok("Vou criar a sala:", { type: "add_room", name: m[1].slice(0, 30), content: "" });
  if ((m = text.match(/nome da casa.*?(?:para|:)\s*(.+)/i))) return ok("Vou mudar o nome:", { type: "set_house", houseName: m[1].slice(0, 60) });
  return null;
}
