import { getCloudAccessToken, lastCloudEmail } from "./cloud";
import { formatAOAshort } from "./format";
import type { AiMemory } from "./types";
import { BRAND, BRAND_FACTS, PERSONA, memoryPrompt, recall, type Hit } from "./brain";

export interface AiContext {
  houseName: string;
  ownerName: string;
  nowText: string;
  stations: number;
  free: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  revenueToday: number;
  expenseToday: number;
  revenueWeek: number;
  revenueMonth: number;
  salesToday: number;
  balance: number;
  goal: number;
  players: number;
  openTime: string;
  closeTime: string;
  nextBooking: string;
  lowStock: string[];
}

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const suggestions = [
  "Como começar o meu negócio?",
  "Como definir os preços das máquinas?",
  "Como calcular o meu lucro?",
  "Como atrair mais clientes?",
  "Quanto faturei hoje?",
  "Quais máquinas estão livres?",
  "Como registar vendas de bolachas, cópias e impressões?",
  "Como enviar o relatório em PDF pelo WhatsApp?",
  "Como pagar a CJ Gerenciamento?",
  "Como evitar roubos e perdas no caixa?",
  "Quero falar com um gerente",
];

const MENTOR = `És também mentor de casas de jogos em Angola. Quando o assunto for abrir, crescer ou investir numa Game House: (1) pede só o que falta: quanto custa a máquina, quantas horas por dia fica ocupada, o preço por hora e os custos fixos como renda, energia, gerador e internet; (2) faz contas simples com os números reais da casa: dias para recuperar o investimento = custo da máquina a dividir por (receita média por dia dessa máquina menos o custo por dia); (3) apresenta um cenário prudente e um cenário normal, nunca promessas de lucro garantido; (4) dá conselhos práticos: começar pequeno, reinvestir os primeiros lucros, separar o dinheiro do negócio do pessoal, preços por pacote, promoções nas horas fracas, campeonatos e fidelização, manutenção preventiva, controlo do caixa e da equipa; (5) se faltarem dados, diz o que falta em vez de inventar preços de mercado. Diz sempre que são estimativas e orientação geral, não consultoria financeira.`;

export function buildSystemPrompt(c: AiContext, question = "", adm: AiMemory[] = []) {
  const mem = memoryPrompt(question, adm);
  return [
    PERSONA,
    `Responde SEMPRE em português de Angola. Trata o utilizador pelo primeiro nome. As respostas são LIDAS EM VOZ ALTA: frases curtas e naturais, sem tabelas e sem markdown pesado (máx. 150 palavras). Usa Kwanzas (AOA). Acaba, quando fizer sentido, com uma frase de ânimo curta.`,
    `Ajudas donos de Game Houses, cyber cafés e pequenos negócios em Angola, tanto com a gestão do negócio como com o uso da app ${BRAND.name}.`,
    BRAND_FACTS,
    MENTOR,
    `Se a pergunta for sobre a app, explica onde clicar: Início (mapa de máquinas, sessões, ação rápida Vender), Reservas, Jogadores, Finanças (relatórios dia/semana/mês/trimestre/ano e PDF para WhatsApp), Definições (pacotes, horário, meta, tema, notificações, cópia de segurança, funcionários).`,
    `Se a pergunta for sobre legalização, impostos ou leis, dá orientação geral e recomenda confirmar com as entidades oficiais (Guiché Único da Empresa, AGT, administração municipal).`,
    `Se o assunto for cobrança, pagamento da app, reembolso, bloqueio de conta, erro técnico que não resolves ou algo que não sabes, diz que um gerente real da equipa pode ajudar (botão «Falar com um gerente»). Nunca inventes valores nem prazos.`,
    mem,
    `Dados reais da Game House do utilizador agora (${c.nowText}):`,
    `- Nome: ${c.houseName} | Proprietário: ${c.ownerName} | Horário: ${c.openTime}-${c.closeTime}`,
    `- Máquinas: ${c.stations} (ocupadas ${c.occupied}, livres ${c.free}, reservadas ${c.reserved}, em manutenção ${c.maintenance})`,
    `- Receita hoje: ${formatAOAshort(c.revenueToday)} | Despesas hoje: ${formatAOAshort(c.expenseToday)} | Vendas (produtos/serviços) hoje: ${formatAOAshort(c.salesToday)}`,
    `- Receita da semana: ${formatAOAshort(c.revenueWeek)} | do mês: ${formatAOAshort(c.revenueMonth)} | Saldo em caixa: ${formatAOAshort(c.balance)}`,
    `- Meta diária: ${c.goal > 0 ? formatAOAshort(c.goal) : "não definida"} | Jogadores registados: ${c.players}`,
    `- Próxima reserva: ${c.nextBooking || "nenhuma"} | Stock baixo: ${c.lowStock.length ? c.lowStock.join(", ") : "nenhum"}`,
    `Usa estes dados quando forem relevantes. Não inventes números que não tens.`,
  ].filter(Boolean).join("\n");
}

/* ------------------------------------------------------------------ */
/*  IA online (streaming em tempo real)                                */
/* ------------------------------------------------------------------ */

export async function askOnline(
  history: { role: "user" | "assistant"; content: string }[],
  system: string,
  key: string,
  onDelta: (t: string) => void,
  signal: AbortSignal,
  firstByteMs = 14000,
  opts?: { maxTokens?: number; temperature?: number }
) {
  // CJ_GEMINI_PROXY_INTEGRATION
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const normalizedQuestion = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const needsSearch = /\b(pesquis\w*|procur\w*|google|internet|fontes?|noticias?|hoje|agora|atual\w*|recent\w*|preco atual|lancament\w*|ultim\w*)\b/i.test(normalizedQuestion);
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const email = lastCloudEmail();
  const accessToken = email ? await getCloudAccessToken(email) : null;
  let geminiWhy = !email ? "sem email da nuvem" : !accessToken ? "sem sessão da nuvem (ligue a conta online)" : "";

  if (needsSearch && (!supabaseUrl || !supabaseKey || !accessToken)) {
    throw new Error("Pesquisa Google requer uma sessão Supabase válida.");
  }

  if (supabaseUrl && supabaseKey && accessToken) {
    try {
      const geminiRes = await fetch(supabaseUrl + "/functions/v1/cj-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: "Bearer " + accessToken
        },
        signal,
        body: JSON.stringify({
          history: history.slice(-8),
          system,
          search: needsSearch,
          maxOutputTokens: opts?.maxTokens ?? 1500,
          temperature: opts?.temperature ?? 0.35
        })
      });

      if (!geminiRes.ok && !needsSearch) {
        const eb0 = (await geminiRes.json().catch(() => ({}))) as { error?: string };
        geminiWhy = "HTTP " + geminiRes.status + (eb0.error ? " - " + String(eb0.error).slice(0, 160) : "");
      }
      if (geminiRes.ok) {
        const result = await geminiRes.json() as {
          text?: string;
          searched?: boolean;
          sources?: { title?: string; url?: string }[];
          error?: string;
        };
        if (typeof result.text === "string" && result.text.trim()) {
          let answer = result.text.trim();
          if (needsSearch && result.searched && result.sources?.length) {
            answer += "\n\nFontes consultadas:\n" +
              result.sources.map((source) => "- " + (source.title || "Fonte") + ": " + source.url)
                .join("\n");
          } else if (needsSearch) {
            throw new Error("Não foi possível confirmar as fontes da pesquisa.");
          }
          onDelta(answer);
          return;
        }
        if (needsSearch) throw new Error(result.error || "A pesquisa não devolveu uma resposta.");
      } else if (needsSearch) {
        const eb = (await geminiRes.json().catch(() => ({}))) as { error?: string };
      throw new Error("Pesquisa Google indisponível (HTTP " + geminiRes.status + ")" + (eb.error ? ": " + String(eb.error).slice(0, 220) : "") + ".");
      }
    } catch (error) {
      if (needsSearch || signal.aborted) throw error;
      geminiWhy = error instanceof Error ? error.message : String(error);
      // Para perguntas comuns, tenta o fornecedor anterior se o Gemini falhar.
    }
  }

  if (needsSearch) {
    throw new Error("Não foi possível efectuar uma pesquisa Google verificada.");
  }

  const useKey = key.trim().length > 0;
  const url = useKey ? "https://api.openai.com/v1/chat/completions" : "https://text.pollinations.ai/openai";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useKey) headers.Authorization = `Bearer ${key.trim()}`;

  const inner = new AbortController();
  const onAbort = () => inner.abort();
  signal.addEventListener("abort", onAbort);
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => inner.abort(), firstByteMs);
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: inner.signal,
      body: JSON.stringify({
        model: useKey ? "gpt-4o-mini" : "openai",
        messages: [{ role: "system", content: system }, ...history.slice(-10)],
        stream: true,
        temperature: opts?.temperature ?? 0.6,
        max_tokens: opts?.maxTokens ?? 700,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}` + (geminiWhy ? ` | Gemini: ${geminiWhy}` : ""));
    const ct = res.headers.get("content-type") ?? "";

    if (ct.includes("application/json") || !res.body) {
      const j = await res.json();
      const text: string = j?.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("vazio");
      clear();
      onDelta(text);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let got = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          const d: string = j?.choices?.[0]?.delta?.content ?? "";
          if (d) {
            if (!got) clear();
            got = true;
            onDelta(d);
          }
        } catch {
          /* linha parcial */
        }
      }
    }
    if (!got) throw new Error("sem resposta");
  } finally {
    clear();
    signal.removeEventListener("abort", onAbort);
  }
}

/* ------------------------------------------------------------------ */
/*  Especialista integrado (funciona sem internet)                     */
/* ------------------------------------------------------------------ */

interface Rule {
  re: RegExp;
  exact?: boolean;
  answer: (c: AiContext) => string;
}

const rules: Rule[] = [
  /* ---------- dados reais da Game House (respostas exatas) ---------- */
  {
    re: /(quanto|qual).*(fatur|ganh|receit|vend).*(hoje|dia)|faturamento de hoje|receita de hoje|resumo do dia|como esta o dia/,
    exact: true,
    answer: (c) =>
      `**Resumo de hoje — ${c.houseName}** (${c.nowText})\n\n- Receita: **${formatAOAshort(c.revenueToday)}**\n- Despesas: **${formatAOAshort(c.expenseToday)}**\n- Lucro do dia: **${formatAOAshort(c.revenueToday - c.expenseToday)}**\n- Vendas de produtos e serviços: ${formatAOAshort(c.salesToday)}\n- Máquinas ocupadas: ${c.occupied}/${c.stations}\n${c.goal > 0 ? `- Meta diária: ${Math.round((c.revenueToday / c.goal) * 100)}% (${formatAOAshort(c.goal)})\n` : ""}\nÀ meia-noite este valor fecha e fica guardado no relatório do dia.`,
  },
  {
    re: /(quanto|qual).*(semana)|receita da semana|faturamento da semana/,
    exact: true,
    answer: (c) => `Nesta semana (de segunda até hoje) a receita é **${formatAOAshort(c.revenueWeek)}**. Veja o detalhe dia a dia em **Finanças → Ver Relatórios → Semana**.`,
  },
  {
    re: /(quanto|qual).*(mes)|receita do mes|faturamento do mes|faturei este mes/,
    exact: true,
    answer: (c) => `Neste mês a receita é **${formatAOAshort(c.revenueMonth)}**. Em **Finanças → Ver Relatórios → Mês** vê por semana, e em Trimestre/Ano os totais maiores.`,
  },
  {
    re: /saldo|dinheiro em caixa|quanto tenho em caixa|caixa atual/,
    exact: true,
    answer: (c) => `O saldo atual em caixa é **${formatAOAshort(c.balance)}** (saldo inicial + todas as entradas − despesas registadas).`,
  },
  {
    re: /(quais|quantas|que).*(maquina|estacao|computador).*(livre|ocupad|disponiv)|maquinas livres|maquinas ocupadas|estado das maquinas/,
    exact: true,
    answer: (c) => `**Estado das máquinas** (${c.stations} no total)\n\n- Livres: **${c.free}**\n- Ocupadas: **${c.occupied}**\n- Reservadas: ${c.reserved}\n- Em manutenção: ${c.maintenance}\n\nToque numa máquina no **Mapa das Máquinas** (Início) para iniciar, estender ou encerrar uma sessão.`,
  },
  {
    re: /stock|inventario baixo|o que esta a acabar|falta repor|reposicao/,
    exact: true,
    answer: (c) =>
      c.lowStock.length
        ? `**Stock baixo:** ${c.lowStock.join(", ")}.\n\nReponha em breve. Abra **Início → Sala de Stock** para ajustar as quantidades.`
        : `Não há itens com stock baixo neste momento. Pode cadastrar os seus produtos em **Início → Sala de Stock** para receber alertas.`,
  },
  {
    re: /proxima reserva|reservas de hoje|tenho reservas/,
    exact: true,
    answer: (c) => (c.nextBooking ? `A próxima reserva é: **${c.nextBooking}**. Veja todas em **Reservas**.` : `Não há reservas futuras agendadas. Crie uma em **Reservas → Adicionar Nova Reserva**.`),
  },
  {
    re: /meta diaria|atingi a meta|falta para a meta/,
    exact: true,
    answer: (c) =>
      c.goal > 0
        ? `A meta diária é **${formatAOAshort(c.goal)}**. Hoje já fez **${formatAOAshort(c.revenueToday)}** (${Math.round((c.revenueToday / c.goal) * 100)}%). ${c.revenueToday >= c.goal ? "Meta atingida! 🎉" : `Faltam ${formatAOAshort(c.goal - c.revenueToday)}.`}`
        : `Ainda não definiu a meta diária. Vá a **Definições → Meta Diária** e escolha quanto quer faturar por dia.`,
  },
  {
    re: /quantos jogadores|jogadores registados|numero de clientes/,
    exact: true,
    answer: (c) => `Tem **${c.players}** jogador(es) registado(s). Registe mais em **Jogadores → Novo Jogador**.`,
  },

  /* ---------- uso da app ---------- */
  {
    re: /(registar|registo|fazer|lancar|como).*(venda|vender)|bolacha|bebida|refrigerante|snack|copia|impressao|trabalho escolar|digitaliza/,
    answer: () =>
      `**Como registar outras vendas (bolachas, bebidas, cópias, impressões, trabalhos escolares…)**\n\n1. Em **Início**, toque na ação rápida **Vender** (ou em Finanças → Registar Venda).\n2. Na **Calculadora de venda**, escolha *Produto* ou *Serviço*, escreva o nome e o **preço unitário**.\n3. Indique a **quantidade** — o **total a pagar** calcula-se sozinho (preço × quantidade).\n4. Marque *Guardar no catálogo* para vender de novo com um toque.\n5. Abra o **Carrinho**, escolha o pagamento (Dinheiro mostra o **troco**) e toque **Concluir venda**.\n\nA venda entra automaticamente nas finanças de hoje e nos relatórios. Se ligar o produto ao inventário, o stock desce sozinho.`,
  },
  {
    re: /whatsapp|pdf|enviar.*relatorio|relatorio.*(enviar|partilhar)|tipo de letra|tamanho da letra|times|romano/,
    answer: () =>
      `**Enviar o relatório em PDF pelo WhatsApp**\n\n1. Vá a **Finanças → Ver Relatórios** e escolha Dia, Semana, Mês, Trimestre ou Ano.\n2. Toque em **Enviar PDF por WhatsApp**.\n3. Escreva o **número de WhatsApp** (indicativo +244 já vem preenchido).\n4. Escolha o **tipo de letra** (Times New Roman/Romano, Arial ou Courier), o **tamanho** (padrão 11) e o estilo (Normal, 🔠 MAIÚSCULAS, 🔡 minúsculas, Título).\n5. Toque **Enviar para o WhatsApp**: o PDF A4 é guardado e abre a conversa com o resumo (dia, data, hora e nome da Game House). Depois anexe o PDF em 📎 → Documento.\n\nNo telemóvel pode também usar **Partilhar o PDF** para anexar o ficheiro diretamente.`,
  },
  {
    re: /(iniciar|comecar|abrir).*(sessao|cronometro)|cronometro|como.*(usar|funciona).*(maquina)|alarme|tempo acabou/,
    answer: () =>
      `**Sessões e cronómetro**\n\n1. Em **Início**, toque em **Iniciar Sessão** (ou toque numa máquina livre no mapa).\n2. Escolha o jogador, a máquina e a opção: *por tempo* (cronómetro) ou *preço fixo* (sem cronómetro).\n3. A barra avança com o tempo e muda de cor perto do fim.\n4. Quando o tempo acaba, a app **toca o alarme e vibra**. Pode silenciar, estender +15/+30 min ou encerrar.\n\nPode ligar/desligar o som e a vibração em **Definições**.`,
  },
  {
    re: /(definir|mudar|alterar|configurar).*(preco|pacote|tempo)|pacotes|tempos e precos/,
    answer: () =>
      `**Definir tempos e preços das máquinas**\n\nEm **Definições → Gestão de Máquinas** (ou no botão *Tempos e Preços* do mapa) escolha uma máquina e crie opções:\n\n- **Por tempo:** nome (ex: Missão), preço e minutos — ex.: *Máquina 01 (Missão) AOA 1.500 = 60 min*.\n- **Preço fixo:** nome e preço, sem cronómetro — ex.: *Máquina 01 (Football) AOA 1.000*.\n\nUse *Copiar para todas as máquinas* para poupar tempo.`,
  },
  {
    re: /relatorio|trimestre|anual|semanal|mensal|calendario/,
    answer: () =>
      `**Relatórios automáticos**\n\nEm **Finanças → Ver Relatórios** vê **Dia, Semana, Mês, Trimestre, Ano** e **Calendário**. Tudo é calculado sozinho a partir das sessões, vendas, recargas e despesas.\n\n- O dia fecha à meia-noite e fica guardado (Seg, Ter, Qua…).\n- Ao fechar a semana, o mês, o trimestre e o ano recebe uma notificação com o relatório.\n- Pode comparar com o período anterior, exportar CSV e enviar em PDF.`,
  },
  {
    re: /reserva|agendar|marcar/,
    answer: () => `**Reservas:** em **Reservas** escolha o dia na faixa da semana (ou abra o calendário), toque em **Adicionar Nova Reserva**, indique hora, máquina e jogador(es). A app avisa 15 minutos antes de começar e pode confirmar, cancelar ou apagar cada reserva.`,
  },
  {
    re: /notifica/,
    answer: () => `**Notificações:** o sino mostra tudo o que acontece (sessões, vendas, reservas, stock, relatórios fechados). Cada aviso **apaga-se sozinho após 24 horas**. Ative ou desative em **Definições → Notificações**.`,
  },
  {
    re: /backup|copia de seguranca|perdi os dados|restaurar/,
    answer: () => `**Cópia de segurança:** em **Definições → Cópia de Segurança** descarregue um ficheiro com todos os dados e restaure-o quando precisar. Os dados também ficam guardados automaticamente neste dispositivo.`,
  },
  {
    re: /tema|modo escuro|modo claro/,
    answer: () => `**Tema:** em **Definições → Tema** alterna entre Modo Escuro e Modo Claro, e a app inteira muda de cor.`,
  },

  /* ---------- conhecimento de negócio ---------- */
  {
    re: /(comecar|iniciar|abrir|montar|criar|arrancar|como).*(negocio|game house|cyber|lan house|sala de jogos|empresa)|negocio de jogos/,
    answer: () =>
      `**Como começar a sua Game House — passo a passo**\n\n1. **Plano e orçamento** — decida quantas máquinas quer (comece com 5–10), o investimento total e quanto precisa faturar por mês para cobrir as despesas.\n2. **Local** — zona com jovens e estudantes (perto de escolas, universidades, bairros movimentados), espaço ventilado e seguro.\n3. **Equipamento** — PCs ou consolas (PS4/PS5), ecrãs, comandos, headsets, cadeiras e router. Compre bem as primeiras unidades e cresça com o lucro.\n4. **Energia e internet** — gerador/inversor ou UPS e uma ligação estável: é o que mais pesa na experiência.\n5. **Legalização** — registo da empresa, NIF e licença de exploração junto da administração. Confirme os requisitos atuais no Guiché Único da Empresa e na AGT.\n6. **Preços** — pacotes por tempo (30 min, 1 h) e preços fixos por jogo. Na app: *Definições → Tempos, Preços e Pacotes*.\n7. **Receitas extra** — bebidas, snacks, cópias, impressões e trabalhos escolares (ação rápida **Vender**).\n8. **Divulgação** — WhatsApp, Facebook/Instagram, torneios semanais e promoções em horas calmas.\n9. **Controlo** — use a app para cronómetros, reservas, caixa e relatórios.\n\nQuer ajuda a calcular preços ou o ponto de equilíbrio?`,
  },
  {
    re: /(quanto|como).*(cobrar|preco|precificar|definir preco)|preco por hora|tabela de precos|ponto de equilibrio/,
    answer: () =>
      `**Como definir bons preços**\n\n1. Some as **despesas mensais** (renda, luz/gerador, internet, salários, manutenção).\n2. Estime as **horas vendidas** por mês: máquinas × horas abertas por dia × dias × ocupação média (ex.: 50%).\n3. **Custo por hora** = despesas ÷ horas vendidas.\n4. Some a **margem de lucro** (30% a 100%) e arredonde.\n\n*Exemplo:* despesas AOA 300.000/mês; 10 máquinas × 8 h × 26 dias × 50% = 1.040 h → custo ≈ AOA 290/h. Com margem de 100%, cobrar ≈ AOA 580–600/h.\n\nDicas: pacotes maiores com desconto (3 h por AOA X), preço fixo por jogo (Football) e promoção nas horas calmas. Compare com os concorrentes da zona.`,
  },
  {
    re: /lucro|margem|calcular.*(ganho|resultado)|estou a ganhar|rentavel/,
    answer: () =>
      `**Como calcular o lucro**\n\n- **Lucro = Receitas − Despesas**\n- **Margem (%) = Lucro ÷ Receitas × 100**\n\nNa app, **Finanças → Ver Relatórios** já mostra Receita, Despesas e Lucro de cada dia, semana, mês, trimestre e ano, e compara com o período anterior.\n\nPara produtos (ex.: bolachas): **lucro por unidade = preço de venda − preço de compra**. Se compra a AOA 120 e vende a AOA 200, ganha AOA 80 (40%).\n\nRegiste **todas** as despesas em *Finanças → Nova Transação* para o lucro ser real.`,
  },
  {
    re: /cliente|marketing|divulg|publicidade|promoc|fideliz|atrair|aumentar.*(vendas|faturamento)|mais movimento/,
    answer: () =>
      `**Como atrair e manter clientes**\n\n- **WhatsApp:** crie uma lista de transmissão com promoções e horários.\n- **Redes sociais:** fotos e vídeos do espaço, resultados de torneios e testemunhos.\n- **Torneios semanais:** FIFA, Valorant, Football com inscrição simbólica — enchem a sala.\n- **Promoções:** *happy hour* nas horas calmas, pacote família/dupla, 10.ª hora grátis.\n- **Fidelização:** registe os jogadores na app e ofereça recarga com bónus.\n- **Experiência:** máquinas limpas, internet rápida e bom atendimento.\n- **Extras:** bebidas, snacks, cópias e impressões atraem estudantes e aumentam o ticket médio.`,
  },
  {
    re: /equipamento|computador|\bpc\b|consola|playstation|ps5|ps4|investimento|orcamento|capital|quanto custa montar|material necessario/,
    answer: () =>
      `**Equipamento e investimento**\n\n- **Máquinas:** PCs gamer de gama média ou consolas PS4/PS5 + ecrãs, teclado/rato ou comandos, headsets.\n- **Conforto:** cadeiras, mesas, ar condicionado ou ventoinhas.\n- **Rede:** router/Wi-Fi 6 ou fibra, cabos e proteção contra picos.\n- **Energia:** UPS/inversor ou gerador para não perder sessões.\n- **Extras:** frigorífico, impressora/fotocopiadora para serviços.\n\nComece pequeno (5–10 máquinas), recupere o investimento e reinvista o lucro. Use a calculadora de preços (pergunte: *como definir preços*) para saber em quanto tempo recupera.`,
  },
  {
    re: /licenca|alvara|legaliz|registo da empresa|nif|imposto|agt|documentos|burocracia|\blei\b/,
    answer: () =>
      `**Legalização (orientação geral)**\n\n- Registo da empresa/atividade (ex.: no **Guiché Único da Empresa**).\n- **NIF** e inscrição fiscal na **AGT**, com contabilidade ou regime simplificado.\n- **Licença de exploração/alvará comercial** na administração municipal.\n- Seguro, contrato do espaço e, se tiver funcionários, a segurança social.\n\n⚠️ Os requisitos e taxas mudam — confirme sempre junto das entidades oficiais ou de um contabilista antes de abrir.`,
  },
  {
    re: /energia|luz|gerador|inversor|ups|internet|fibra|wifi|rede lenta|lag/,
    answer: () =>
      `**Energia e internet**\n\n- Use **UPS/inversor** para os PCs não desligarem em cortes curtos e **gerador** para cortes longos.\n- Internet: prefira **fibra** ou rádio dedicado; ligue os PCs por **cabo** e deixe o Wi-Fi para telemóveis.\n- Para jogos online, a **latência (ping)** conta mais do que a velocidade.\n- Registe a conta da luz e do combustível como despesa para ver o lucro real.`,
  },
  {
    re: /funcionario|empregado|contratar|equipa de trabalho|atendente|salario/,
    answer: () =>
      `**Equipa:** comece sozinho ou com 1 atendente de confiança. Defina horários e tarefas (abrir/fechar, caixa, limpeza). Com a app, o funcionário inicia sessões e vendas, e você acompanha os relatórios e as notificações. Pague salários combinados e registe-os como despesa.`,
  },
  {
    re: /obrigad|valeu|agradec/,
    answer: () => `De nada! 😊 Se precisar de mais alguma coisa sobre o seu negócio ou sobre a app, é só perguntar.`,
  },
  {
    re: /^(ola|oi|bom dia|boa tarde|boa noite|ei|hello|hey)\b/,
    answer: (c) => `Olá, ${c.ownerName.split(" ")[0] || "proprietário"}! 👋 Sou o assistente da **${c.houseName}**. Pergunte-me sobre o seu negócio (preços, clientes, lucro) ou sobre a app (sessões, vendas, relatórios, WhatsApp). Também respondo com os seus dados: *Quanto faturei hoje?*`,
  },
];

export type LocalKind = "data" | "memory" | "rule";
export interface LocalResult { text: string; exact: boolean; kind: LocalKind; hit?: Hit }

/** Melhor memória (ADM ou base) para a pergunta, se for convincente. */
export function bestMemory(question: string, adm: AiMemory[], min = 3): Hit | null {
  const h = recall(question, adm, 1)[0];
  return h && h.score >= min ? h : null;
}

export function localAnswer(question: string, c: AiContext, adm: AiMemory[] = []): LocalResult | null {
  const q = norm(question);
  for (const r of rules) {
    if (r.exact && r.re.test(q)) return { text: r.answer(c), exact: true, kind: "data" };
  }
  const hit = bestMemory(question, adm, 2);
  if (hit) return { text: hit.mem.answer, exact: hit.mem.source === "adm" && hit.score >= 3, kind: "memory", hit };
  for (const r of rules) {
    if (!r.exact && r.re.test(q)) return { text: r.answer(c), exact: false, kind: "rule" };
  }
  return null;
}

export function fallbackAnswer(c: AiContext) {
  return `Não consegui ligar-me à IA online agora e não tenho uma resposta exata para essa pergunta. 🤔\n\nExperimente perguntar, por exemplo:\n\n- *Como começar o meu negócio?*\n- *Como definir os preços?*\n- *Como atrair mais clientes?*\n- *Quanto faturei hoje?*\n\nOu escreva a pergunta de outra forma, ${c.ownerName.split(" ")[0] || "proprietário"}.\n\nSe preferir, **fale com um gerente real** da ${BRAND.name} — toque no botão abaixo.`;
}
