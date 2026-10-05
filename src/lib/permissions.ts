import type { Perm } from "./types";

export const PERM_LIST: { id: Perm; label: string; hint: string }[] = [
  { id: "sessions", label: "Sessões nas máquinas", hint: "Iniciar, prolongar e encerrar tempo" },
  { id: "stations", label: "Gerir máquinas e preços", hint: "Adicionar, renomear, remover, pacotes" },
  { id: "bookings", label: "Reservas", hint: "Ver, criar, confirmar e cancelar" },
  { id: "players", label: "Jogadores", hint: "Registar, recarregar saldo, remover" },
  { id: "finance", label: "Finanças (caixa)", hint: "Ver o caixa e lançar entradas/despesas" },
  { id: "reports", label: "Relatórios", hint: "Ver relatórios do dia, semana e mês" },
  { id: "pdf", label: "Enviar PDF no WhatsApp", hint: "Gerar e partilhar o relatório em PDF" },
  { id: "sales", label: "Vendas", hint: "Vender bebidas, snacks, cópias e outros serviços (só vê as suas vendas)" },
  { id: "catalog", label: "Catálogo de vendas", hint: "Guardar itens novos e mudar preços no catálogo" },
  { id: "inventory", label: "Stock", hint: "Ver e ajustar o stock" },
];

export const DEFAULT_PERMS: Perm[] = ["sessions", "bookings", "sales"];

export const permLabel = (p: Perm) => PERM_LIST.find((x) => x.id === p)?.label ?? p;
