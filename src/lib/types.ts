export type PlanKind = "timed" | "fixed";

export interface Plan {
  id: string;
  name: string;
  kind: PlanKind;
  price: number;
  minutes?: number;
}

export type StationStatus = "free" | "reserved" | "maintenance";

export interface Station {
  id: number;
  name: string;
  status: StationStatus;
  plans: Plan[];
}

export interface Session {
  id: number;
  stationId: number;
  plan: string;
  kind: PlanKind;
  price: number;
  rate: number;
  player: string;
  startedAt: number;
  durationSec: number;
  alarmFired: boolean;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface Booking {
  id: number;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  stationId: number | null;
  stationName: string;
  pkg: string;
  game: string;
  players: string;
  status: BookingStatus;
  alerted?: boolean;
}

export interface Player {
  id: number;
  name: string;
  tag: string;
  email: string;
  phone: string;
  birth: string;
  house: string;
  balance: number;
  createdAt: number;
  lastActive: number | null;
  photo?: string;
}

export type TxCategory = "sessao" | "extensao" | "recarga" | "manual" | "venda" | "servico";

export interface Transaction {
  id: number;
  type: "in" | "out";
  value: number;
  label: string;
  detail: string;
  ts: number;
  category: TxCategory;
  plan?: string;
  /** quem registou o movimento (funcionário ou proprietário) */
  actorId?: string;
  actorName?: string;
}

export type Tone = "green" | "cyan" | "red" | "amber";

export interface AppNotification {
  id: number;
  ts: number;
  title: string;
  desc?: string;
  tone: Tone;
  read: boolean;
}

export interface InventoryItem {
  id: number;
  name: string;
  stock: number;
  min: number;
  /** un, cx, kg, l… (por defeito «un») */
  unit?: string;
  /** último custo unitário em AOA (para valorizar o stock e as saídas) */
  cost?: number;
}

export type StockReason = "inicial" | "compra" | "venda" | "consumo" | "despesa" | "perda" | "ajuste";

/** Cada entrada ou saída da Sala de Stock. */
export interface StockMove {
  id: number;
  ts: number;
  itemId: number;
  itemName: string;
  kind: "in" | "out";
  reason: StockReason;
  qty: number;
  unit: string;
  /** custo unitário no momento (AOA) */
  unitCost: number;
  before: number;
  after: number;
  note?: string;
  actorId: string;
  actorName: string;
}

/** Item do catálogo de vendas (produto ou serviço) com preço unitário definido pelo dono. */
export type SaleKind = "produto" | "servico";

export interface SaleItem {
  id: number;
  name: string;
  kind: SaleKind;
  price: number; // preço unitário em AOA
  invId: number | null; // ligação opcional ao inventário (baixa de stock automática)
}

export type SubPlan = "basic" | "pro" | "premium";

export type PdfFontKey = "times" | "helvetica" | "courier";
export type PdfCaseKey = "normal" | "upper" | "lower" | "title";

export interface Config {
  setupDone: boolean;
  houseName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  openTime: string;
  closeTime: string;
  openDays: number[]; // 0 = domingo ... 6 = sábado
  dailyGoal: number;
  openingBalance: number;
  subPlan: SubPlan;
  subSince: number;
  theme: "dark" | "light";
  notifOn: boolean;
  lang: "pt-AO" | "pt-PT" | "pt-BR";
  soundOn: boolean;
  vibrateOn: boolean;
  defaultPlans: Plan[];
  lastBackup: number | null;
  // Relatório em PDF / WhatsApp
  waDdi: string;
  waNumber: string;
  pdfFont: PdfFontKey;
  pdfSize: number;
  pdfCase: PdfCaseKey;
  // Assistente IA (chave opcional)
  aiKey: string;
}

/** Permissões que o proprietário pode dar a cada funcionário. */
export type Perm =
  | "sessions" | "stations" | "bookings" | "players" | "finance"
  | "reports" | "pdf" | "sales" | "inventory" | "catalog";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  inviteCode: string; // código de convite (ex.: CJ-AB12-CD34)
  userCode: string; // código de utilizador (ex.: F4821)
  pass: string; // hash "v1$sal$hash" — nunca a palavra-passe em texto
  perms: Perm[];
  active: boolean;
  createdAt: number;
  lastLogin: number | null;
}

export type ActivitySeverity = "info" | "warn" | "delete";

/** Registo permanente: só se acrescenta, nunca se apaga pela app. */
export interface ActivityEvent {
  id: number;
  ts: number;
  actorId: string; // "owner" ou id do funcionário
  actorName: string;
  role: "owner" | "staff";
  action: string;
  label: string;
  detail?: string;
  severity: ActivitySeverity;
  snapshot?: string; // JSON do que foi apagado
}

/** Sessão de máquina já encerrada. */
export interface SessionRecord {
  id: number;
  stationId: number;
  stationName: string;
  player: string;
  plan: string;
  kind: PlanKind;
  price: number;
  startedAt: number;
  endedAt: number;
  endedBy: string;
}

export interface AppData {
  config: Config;
  stations: Station[];
  sessions: Session[];
  bookings: Booking[];
  players: Player[];
  transactions: Transaction[];
  notifications: AppNotification[];
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  catalog: SaleItem[];
  staff: Staff[];
  activity: ActivityEvent[];
  history: SessionRecord[];
  lastTick: number;
}

/* ---------- Sala ADM: cobrança, anúncios e salas extra ---------- */
export interface Payment {
  id: number;
  ts: number;
  amount: number;
  method: string;
  ref: string;
  status: "pending" | "confirmed" | "rejected";
  decidedAt?: number;
}

export interface Billing {
  enabled: boolean;
  amount: number; // valor de cada período (AOA)
  periodDays: number; // dias que cada pagamento confirmado dá de acesso
  dueAt: number | null; // fim do acesso pago
  graceDays: number; // dias de tolerância depois do vencimento
  warnDays: number; // avisa X dias antes
  manualBlock: boolean;
  instructions: string; // como pagar (Multicaixa, IBAN, Unitel Money...)
  note: string;
  payments: Payment[];
}

export interface Ad {
  id: number;
  title: string;
  text: string;
  link: string;
  active: boolean;
  views: number;
  clicks: number;
  /** Fotografia enviada pelo ADM (JPEG em data URL). Sem foto = anúncio só de texto. */
  image?: string;
}

/* ---------- Salas / abas criadas pelo ADM ---------- */
export type RoomBlock =
  | { id: number; kind: "text"; title?: string; text: string }
  | { id: number; kind: "list"; variant: "prices" | "schedule" | "rules"; title?: string; items: { left: string; right: string }[] }
  | { id: number; kind: "button"; label: string; mode: "link" | "whatsapp" | "call"; target: string; message?: string }
  | { id: number; kind: "gallery"; title?: string; images: string[] }
  | { id: number; kind: "signup"; title: string; note?: string; whatsapp: string; askExtra?: string };

export interface Room {
  id: number;
  name: string;
  emoji: string;
  /** Texto simples (salas antigas / criadas pela IA). */
  content: string;
  active: boolean;
  /** Cor de destaque da sala, ex.: "#00E5FF". */
  color?: string;
  /** Foto de capa (data URL). */
  cover?: string;
  /** Pequena frase por baixo do nome. */
  subtitle?: string;
  blocks?: RoomBlock[];
}

/* ---------- Sala de Jogos (o ADM publica jogos para todos) ---------- */
export interface Game {
  id: number;
  name: string;
  description: string;
  /** Capa do jogo (JPEG em data URL). */
  cover?: string;
  /** Link de download (só http/https). */
  link: string;
  active: boolean;
  createdAt: number;
}

/** Dados do ADM que valem para a app toda (não pertencem a uma casa). */
export interface GlobalAdm {
  adsOn: boolean;
  /** Segundos entre fotos do rodapé. */
  slideSec: number;
  ads: Ad[];
  rooms: Room[];
  /** Avisos enviados pelo ADM; cada casa mostra uma só vez. */
  notices: { id: number; ts: number; title: string; text: string }[];
  /** Gerentes reais da CJ Gerenciamento (WhatsApp para ajuda humana). */
  managers: Manager[];
  /** Memórias ensinadas pelo ADM à IA (têm prioridade sobre o conhecimento base). */
  memories: AiMemory[];
  /** Jogos publicados na Sala de Jogos. */
  games: Game[];
}

export interface Manager {
  id: number;
  name: string;
  /** Ex.: Suporte técnico, Cobrança, Comercial. */
  role: string;
  whatsapp: string;
  /** Ex.: Seg–Sáb 08h–20h. */
  hours?: string;
  active: boolean;
}

export interface AiMemory {
  id: number;
  title: string;
  /** Palavras-chave separadas por vírgula. */
  keywords: string;
  answer: string;
  active: boolean;
}

export interface AdminData {
  passHash: string;
  houseId: string;
  billing: Billing;
  ads: Ad[];
  adsOn: boolean;
  rooms: Room[];
}
