import type { AiMemory } from "./types";

/* =====================================================================
   Memória da CJ Gerenciamento — a "cara" da marca e do Cris José.
   Duas camadas:
   1) BASE: conhecimento fixo (negócio, app, cobrança, problemas comuns…).
   2) ADM: memórias que o ADM ensina na Sala do ADM → separador «Memórias».
      As do ADM têm prioridade (são a palavra oficial da CJ).
   ===================================================================== */

export const BRAND = {
  name: "CJ Gerenciamento",
  founder: "Cris José",
  handle: "CrisJoseGamer",
  motto: "Gerir bem é ganhar mais.",
};

export interface Memory {
  id: string;
  cat: string;
  title: string;
  /** palavras/radicais (sem acentos, minúsculas) — basta um começo de palavra */
  keys: string[];
  answer: string;
  source: "base" | "adm";
}

const m = (id: string, cat: string, title: string, keys: string, answer: string): Memory => ({
  id, cat, title, keys: keys.split("|").map((k) => k.trim()).filter(Boolean), answer, source: "base",
});

/* ------------------------------------------------------------------ */
/*  Personalidade (entra sempre no prompt da IA online)                */
/* ------------------------------------------------------------------ */
export const PERSONA = [
  `Tu és a assistente oficial da ${BRAND.name}, criada por ${BRAND.founder} (${BRAND.handle}), gamer e empreendedor angolano que fez esta app para os donos de Game House crescerem sem confusão.`,
  `A tua marca é: ${BRAND.motto} Falas como gente da nossa terra — português de Angola, calorosa, direta e motivadora, como uma mana/colega que conhece o negócio. Podes usar, com moderação, expressões como "bora", "vamos a isso" e "estamos juntos". Nunca és arrogante nem usas gíria pesada.`,
  `Falas em nome da equipa da ${BRAND.name}: usa "nós" para a equipa e "a nossa app". Quando não souberes algo da app, da cobrança ou de pagamentos, NÃO inventes: diz com honestidade e sugere falar com um gerente real da equipa (botão «Falar com um gerente» na ajuda).`,
  `Nunca peças nem aceites palavras-passe, códigos de confirmação ou a senha do ADM. Nunca prometas prazos, descontos ou preços que não estejam nas memórias abaixo.`,
].join("\n");

/* ------------------------------------------------------------------ */
/*  BASE DE CONHECIMENTO                                               */
/* ------------------------------------------------------------------ */
export const BASE: Memory[] = [
  /* ============ A MARCA ============ */
  m("marca-quem", "Marca", "Quem somos", "quem sao voces|quem e a cj|sobre a cj|quem criou|quem fez a app|cris jose|crisjose|quem e o cris|criador|dono da app|empresa da app",
    `**Somos a CJ Gerenciamento** 💙\n\nA app foi criada pelo **Cris José (CrisJoseGamer)**, um gamer angolano que viu de perto como é difícil controlar tempos, caixa e clientes numa Game House. Fizemos esta app para o dono ter tudo num só lugar: máquinas, sessões, reservas, vendas, finanças e relatórios.\n\nO nosso lema: **gerir bem é ganhar mais.** Estamos juntos no seu negócio!`),
  m("marca-app", "Marca", "O que faz a app", "o que faz a app|para que serve|o que e a cj gerenciamento|funcionalidades|o que posso fazer|vantagens da app|porque usar",
    `**O que a CJ Gerenciamento faz por si**\n\n- **Mapa de máquinas** com cronómetro e alarme quando o tempo acaba.\n- **Reservas** e lista de **jogadores**.\n- **Vendas** de bebidas, snacks, cópias e impressões, com troco.\n- **Finanças**: caixa, despesas e relatórios de dia, semana, mês, trimestre e ano.\n- **Relatório em PDF** pronto para o WhatsApp.\n- **Funcionários** com permissões, para controlar quem faz o quê.\n- **Assistente IA** (eu!) para tirar dúvidas do negócio e da app.\n\nTudo pensado para a realidade de Angola, em Kwanzas.`),
  m("marca-preco", "Marca", "Preço da app", "quanto custa a app|preco da app|mensalidade|valor da app|assinatura|quanto pago pela app|planos da app|e gratis|gratuito",
    `Sobre o **valor e as condições da app**, o preço oficial é definido pela nossa equipa e pode mudar. Para não lhe dar um número errado, fale com um **gerente da CJ** — toque em **Ajuda → Falar com um gerente** e eles confirmam o valor, o prazo e as formas de pagamento.`),

  /* ============ CONTA E ACESSO ============ */
  m("conta-criar", "Conta", "Criar conta", "criar conta|cadastr|registar a minha casa|nova conta|abrir conta|primeiro acesso|como comeco a usar|inscrev",
    `**Criar a sua conta**\n\n1. No ecrã de entrada toque em **Criar conta**.\n2. Ponha a **foto** e o **nome da Game House** (a foto é obrigatória) e o **seu nome**.\n3. Escreva o **email ou telefone** e uma **palavra-passe** (mínimo 6 caracteres).\n4. Aparece um **código de 6 dígitos** na parte de baixo da app — confirme-o.\n5. A conta é criada e volta ao ecrã **Entrar**.\n\nCada conta tem o seu **ID único (CJ-XXXXXXXX)**, que vê em Definições.`),
  m("conta-id", "Conta", "ID da casa", "id da casa|meu id|id unico|cj-|codigo da casa|onde vejo o id|identificador",
    `O seu **ID único** tem o formato **CJ-XXXXXXXX** e aparece em **Definições**. Guarde-o: quando falar com a nossa equipa para cobrança ou ativação, é com esse ID que identificamos a sua Game House.`),
  m("conta-senha", "Conta", "Esqueci a senha", "esqueci a senha|esqueci a palavra|esqueci a password|recuperar senha|recuperar conta|nao consigo entrar|nao entra|senha errada|bloqueio de 30|tentativas",
    `**Não consegue entrar?**\n\n- Confira se escreveu o **email/telefone** e a **palavra-passe** exatamente como criou.\n- Depois de **5 tentativas erradas** a app bloqueia **30 segundos** — espere e tente de novo.\n- Se mesmo assim não conseguir (ou esqueceu a palavra-passe), fale com um **gerente da CJ** em **Ajuda → Falar com um gerente**, e tenha o ID da casa à mão.\n\nPor segurança, **nunca partilhe a sua palavra-passe** com ninguém — nem connosco.`),
  m("conta-outro-tel", "Conta", "Outro telemóvel", "outro telemovel|trocar de telemovel|mudar de telemovel|novo telemovel|dois telemoveis|varios telemoveis|mesmo conta noutro|noutro aparelho|sincroniz",
    `Nesta versão os dados ficam guardados **no telemóvel onde a conta foi criada**. Por isso, ao mudar de telemóvel, faça primeiro a **Cópia de Segurança** em **Definições → Cópia de Segurança** (descarrega um ficheiro) e restaure-a no novo aparelho.\n\nEntrar na mesma conta em vários telemóveis ao mesmo tempo ainda depende de servidor — é um passo que estamos a preparar. Fale com um gerente se precisar de ajuda na mudança.`),
  m("conta-seguranca", "Conta", "Segurança dos dados", "seguranca|seguro|roubar dados|alguem ve os meus dados|privacidade|dados protegidos|hackear|hacker",
    `Os seus dados são **só seus**: cada conta tem o seu espaço e **uma casa nunca vê os dados de outra**. Dicas simples de segurança:\n\n- Use uma **palavra-passe forte** e não a partilhe.\n- **Bloqueie o ecrã** do telemóvel/tablet da Game House.\n- Faça **cópia de segurança** com regularidade.\n- Dê aos funcionários só as **permissões** de que precisam.`),

  /* ============ INSTALAR / TABLET / PROBLEMAS TÉCNICOS ============ */
  m("tec-instalar", "Técnico", "Instalar a app", "instalar|apk|adicionar ao ecra|ecra inicial|transferir a app|download da app|baixar a app|play store|como tenho a app",
    `**Instalar no telemóvel**\n\n1. Abra o link da CJ Gerenciamento no navegador.\n2. No menu do navegador escolha **Adicionar ao ecrã principal / Instalar app**.\n3. O ícone da CJ aparece como uma app normal e abre em ecrã inteiro.\n\nSe precisar do **APK**, peça ao nosso gerente em **Ajuda → Falar com um gerente**.`),
  m("tec-tablet", "Técnico", "Tablet", "tablet|ipad|ecra grande|rodar o ecra|horizontal|deitado",
    `Em **tablet** a app ocupa o ecrã todo e **roda sozinha** (vertical ou horizontal), com uma coluna centrada para ficar confortável. No telemóvel continua em pé. Se o APK já estava instalado antes, instale a versão nova para apanhar esta melhoria.`),
  m("tec-alarme", "Técnico", "Alarme não toca", "alarme nao toca|nao toca o alarme|sem som|nao vibra|alarme mudo|som do alarme|silencioso|nao ouco",
    `**O alarme não toca?**\n\n1. Veja se o telemóvel **não está em silêncio** e com volume alto.\n2. Em **Definições** confirme que **som** e **vibração** estão ligados.\n3. Mantenha a app **aberta** durante as sessões — alguns telemóveis calam o som quando o ecrã bloqueia.\n4. Toque uma vez no ecrã ao abrir a app (os navegadores só libertam o som depois de um toque).\n\nContinua sem tocar? Diga-me o modelo do telemóvel ou fale com um gerente.`),
  m("tec-lenta", "Técnico", "App lenta ou a bloquear", "app lenta|esta lenta|trava|bloqueou|nao abre|fecha sozinha|congelou|erro na app|deu erro|bug|nao funciona|nao carrega|ecra branco",
    `**Se a app estiver lenta ou não abrir**\n\n1. **Feche e abra** a app de novo.\n2. Confirme que o telemóvel tem **espaço livre** (fotos pesadas enchem o armazenamento).\n3. Faça uma **Cópia de Segurança** antes de mexer em mais nada.\n4. Atualize o navegador/app para a versão mais recente.\n\nSe o erro continuar, tire uma **captura de ecrã** e envie a um gerente em **Ajuda → Falar com um gerente**. Os seus dados ficam guardados.`),
  m("tec-espaco", "Técnico", "Armazenamento cheio", "espaco cheio|sem espaco|armazenamento|memoria cheia|memoria do telemovel|fotos pesadas|ficou sem espaco",
    `O armazenamento do navegador é limitado (cerca de **5 MB**). Se aparecer o aviso de **sem espaço**: apague fotos antigas de anúncios/salas, faça a **Cópia de Segurança** e remova dados que já não precisa. Use fotos mais leves — a app já as comprime, mas muitas fotos enchem.`),
  m("tec-backup", "Técnico", "Cópia de segurança", "backup|copia de seguranca|perdi os dados|perdi tudo|apagou tudo|restaurar|recuperar dados|guardar os dados",
    `**Cópia de Segurança** 🛟\n\nEm **Definições → Cópia de Segurança** descarrega um ficheiro com **todos os dados** da sua Game House e restaura-o quando precisar (telemóvel novo, app reinstalada…).\n\n**Conselho do Cris José:** faça uma cópia **todas as semanas** e guarde o ficheiro no WhatsApp ou no email. Quem faz backup nunca perde o negócio.`),
  m("tec-internet", "Técnico", "Precisa de internet?", "precisa de internet|funciona sem internet|offline|sem net|sem dados moveis|sem rede",
    `A app de gestão **funciona sem internet** — sessões, vendas, caixa e relatórios ficam guardados no aparelho. A **internet só é precisa** para a IA online (sem net eu respondo com o conhecimento que tenho guardado), para abrir links do WhatsApp e para receber coisas novas do ADM.`),
  m("tec-voz", "Técnico", "Voz da assistente", "voz|falar|ouvir|nao fala|sem voz|desligar a voz|ligar a voz|altifalante",
    `Eu posso **ler as respostas em voz alta** 🔊. Toque no ícone do altifalante no topo para ligar/desligar, e em **Ouvir** em qualquer resposta. A voz é a voz portuguesa do seu telemóvel — a qualidade depende das vozes instaladas. Sem som? Veja o volume e o modo silêncio.`),

  /* ============ COBRANÇA / PAGAMENTO DA APP ============ */
  m("cob-como", "Cobrança", "Como pagar a app", "como pagar|pagar a app|pagamento da app|pagar a mensalidade|multicaixa|unitel money|transferencia|referencia de pagamento|enviar comprovativo|comprovativo",
    `**Como pagar a CJ Gerenciamento**\n\nQuando o acesso estiver perto de vencer (ou vencido), a app mostra o valor e o texto **«Como pagar»** definido pela nossa equipa.\n\n1. Faça o pagamento pelas formas indicadas (ex.: transferência/Multicaixa Express).\n2. Na app, toque em **Já paguei**, ponha o **valor, a forma e a referência/comprovativo**.\n3. Toque em **Enviar para confirmação** — um gerente confirma e o acesso é renovado.\n\nPode também enviar o comprovativo por WhatsApp a um gerente em **Ajuda → Falar com um gerente**.`),
  m("cob-bloqueio", "Cobrança", "Acesso suspenso", "acesso suspenso|bloquead|bloqueou|bloquearam|nao consigo usar a app|conta bloqueada|app bloqueada|ecra de bloqueio|pagamento em atraso|atraso|vencido|venceu|suspensa|renovar|renovacao",
    `**Acesso suspenso — calma, os seus dados estão guardados** 🔒\n\nA app bloqueia quando o pagamento passa do prazo (e da **tolerância** em dias) ou quando a nossa equipa suspende o acesso. Nada é apagado.\n\n1. No ecrã de bloqueio veja o **valor** e como pagar.\n2. Pague e toque em **Já paguei → Enviar para confirmação**, **ou** use o **código de ativação** que o gerente lhe enviar.\n3. Assim que for confirmado, tudo volta ao normal.\n\nPrecisa de resolver já? Fale com um gerente pelo WhatsApp.`),
  m("cob-codigo", "Cobrança", "Código de ativação", "codigo de ativacao|codigo pag|pag-|ativar|ativacao|ativar a app|codigo que o gerente enviou|redimir",
    `O **código de ativação** (formato **PAG-XXXX-XXXXXXXX**) é gerado pela nossa equipa para a **sua casa** e tem prazo. Para usar: no ecrã de bloqueio escreva o código em **Tenho um código de ativação** e toque **Ativar**.\n\nDá "inválido"? Pode estar **expirado** ou ser **de outra casa**. Confirme o seu ID (**CJ-…**) com o gerente e peça um novo.`),
  m("cob-aviso", "Cobrança", "Aviso de vencimento", "aviso de vencimento|a vencer|quando vence|ate quando|data de vencimento|dias restantes|prazo do pagamento|tolerancia",
    `Antes de vencer, a app mostra um **aviso no topo** (conforme os dias de antecedência definidos). Depois do vencimento há uns **dias de tolerância** em que ainda pode usar, antes de bloquear. Para saber a **data exata** do seu acesso, fale com um gerente com o seu ID.`),
  m("cob-recibo", "Cobrança", "Recibo/fatura", "recibo|fatura|factura|nota de pagamento|comprovativo de que paguei|declaracao de pagamento",
    `Para **recibo ou fatura** do pagamento da app, peça a um gerente em **Ajuda → Falar com um gerente**, indicando o **ID da casa**, o **valor** e a **data** do pagamento.`),
  m("cob-reembolso", "Cobrança", "Reembolso", "reembolso|devolver o dinheiro|devolucao|cancelar a assinatura|cancelar a app|quero cancelar|pagamento errado|paguei duas vezes|paguei a mais",
    `Pagou duas vezes, pagou o valor errado ou quer cancelar? Isso é tratado **diretamente por um gerente**, caso a caso. Toque em **Ajuda → Falar com um gerente** e envie o **comprovativo** e o **ID da casa** — vamos resolver com respeito e rapidez.`),

  /* ============ SESSÕES E MÁQUINAS ============ */
  m("app-sessao", "App", "Iniciar sessão", "iniciar sessao|abrir sessao|comecar sessao|cronometro|iniciar o tempo|como inicio|colocar cliente|por tempo|preco fixo",
    `**Sessões e cronómetro**\n\n1. Em **Início**, toque em **Iniciar Sessão** (ou numa máquina livre no mapa).\n2. Escolha o jogador, a máquina e a opção: **por tempo** (cronómetro) ou **preço fixo** (sem cronómetro).\n3. A barra avança e muda de cor perto do fim.\n4. Quando o tempo acaba, a app **toca o alarme e vibra**. Pode silenciar, **estender +15/+30 min** ou encerrar.`),
  m("app-estender", "App", "Estender/encerrar sessão", "estender|mais tempo|prolongar|acrescentar tempo|encerrar sessao|terminar sessao|fechar sessao|parar o tempo|cliente quer mais",
    `Toque na máquina ocupada no **mapa**: pode **estender** (+15 ou +30 min), **encerrar** a sessão e cobrar. Quando o alarme toca, as mesmas opções aparecem no ecrã do alarme.`),
  m("app-maquinas", "App", "Gerir máquinas", "adicionar maquina|nova maquina|apagar maquina|remover maquina|renomear maquina|gestao de maquinas|mudar nome da maquina|numero de maquinas|manutencao",
    `**Gerir máquinas:** em **Definições → Gestão de Máquinas** adiciona, renomeia ou remove máquinas e define o estado (livre, reservada, **em manutenção**). Máquina avariada? Ponha **em manutenção** para ninguém a marcar por engano.`),
  m("app-precos", "App", "Definir preços na app", "definir preco|mudar preco|alterar preco|pacotes|tempos e precos|copiar para todas|preco da maquina|tabela de preco na app",
    `**Preços na app:** em **Definições → Gestão de Máquinas** (ou **Tempos e Preços** no mapa) escolha a máquina e crie opções:\n\n- **Por tempo** — ex.: *Missão, AOA 1.500 = 60 min*.\n- **Preço fixo** — ex.: *Football, AOA 1.000*.\n\nUse **Copiar para todas as máquinas** para poupar tempo.`),
  m("app-reservas", "App", "Reservas", "reserva|reservar|agendar|marcar horario|marcacao|cancelar reserva|confirmar reserva",
    `**Reservas:** em **Reservas** escolha o dia na faixa da semana (ou no calendário) e toque **Adicionar Nova Reserva**: hora, máquina e jogador(es). A app **avisa 15 minutos antes**; pode confirmar, cancelar ou apagar cada reserva.`),
  m("app-jogadores", "App", "Jogadores", "jogador|registar cliente|novo jogador|cadastrar cliente|ficha do cliente|lista de clientes|recarga|saldo do jogador|bonus",
    `**Jogadores:** em **Jogadores → Novo Jogador** guarda nome e contacto de quem joga na sua casa. Assim conhece os clientes fiéis, pode oferecer **bónus de recarga** e chamar a malta para torneios.`),
  m("app-inventario", "App", "Sala de Stock", "inventario|stock|estoque|sala de stock|repor|produtos em falta|quantidade minima|alerta de stock|entrada de stock|saida de stock|dar entrada|registar entrada|registar saida|alimentacao da equipa|despesa da casa|stock da casa|comprei produtos",
    `**Sala de Stock** 📦 (Início → **Sala de Stock**)\n\n- **Itens:** crie cada produto com unidade, quantidade, mínimo e custo.\n- **Entrada:** toque em **Entrada** quando comprar mais. Se pôr o custo, pode registar a compra como **despesa na caixa**.\n- **Saída automática:** as **vendas** (itens ligados ao catálogo) descontam sozinhas.\n- **Saída manual:** toque em **Saída** e escolha o motivo: **alimentação da equipa**, **despesa da Game House**, **perda/estragado** ou ajuste de contagem.\n- **Movimentos:** lista de tudo o que entrou e saiu, com quem e quando.\n- **Resumo:** totais por dia, 7 dias ou mês, ao custo.\n\nQuando um item chega ao mínimo, recebe um **alerta**.`),
  m("app-stock-ligar", "App", "Ligar venda ao stock", "ligar ao inventario|ligar ao stock|venda desconta|desconta o stock|stock nao desce|nao desce o stock|stock nao baixa|vendi e o stock",
    `**Para a venda descontar o stock sozinha:** em **Vender**, ao guardar um *Produto* no catálogo escolha **«Ligar ao inventário»** e o item da Sala de Stock. A partir daí, cada venda desse produto baixa o stock e fica registada em **Sala de Stock → Movimentos** como *Venda*. Só os itens ligados descontam.`),

  /* ============ VENDAS ============ */
  m("app-vendas", "Vendas", "Registar vendas", "registar venda|fazer venda|vender|bolacha|bebida|refrigerante|snack|copia|impressao|trabalho escolar|digitaliza|calculadora de venda|carrinho|troco",
    `**Registar vendas (bebidas, snacks, cópias, impressões…)**\n\n1. Em **Início**, toque em **Vender**.\n2. Na calculadora escolha *Produto* ou *Serviço*, escreva o nome e o **preço unitário**.\n3. Ponha a **quantidade** — o total calcula-se sozinho.\n4. Marque *Guardar no catálogo* para vender de novo com um toque.\n5. No **Carrinho** escolha o pagamento (em dinheiro mostra o **troco**) e toque **Concluir venda**.\n\nA venda entra logo nas finanças de hoje.`),
  m("app-catalogo", "Vendas", "Catálogo de vendas", "catalogo|guardar item|item novo|mudar preco do item|apagar item",
    `O **catálogo** guarda os seus itens para vender com um toque. O proprietário pode **criar, mudar preços e apagar**. O funcionário só mexe no catálogo se o proprietário ligar a permissão **Catálogo de vendas** (vem desligada por defeito); **apagar** é sempre só do proprietário.`),

  /* ============ FUNCIONÁRIOS ============ */
  m("func-convidar", "Equipa", "Convidar funcionário", "convidar funcionario|adicionar funcionario|novo funcionario|codigo de convite|codigo de utilizador|dar acesso ao funcionario|funcionario entrar|como entra o funcionario|criar funcionario",
    `**Adicionar um funcionário**\n\n1. **Definições → Funcionários → Novo**.\n2. Defina o nome e gere o **código de convite** e o **código de utilizador**, mais uma palavra-passe.\n3. Envie os dados por WhatsApp (há botão). **Guarde a palavra-passe na hora**: depois só fica o código protegido.\n4. O funcionário entra **só na sua sala** e vê a foto e o nome da sua Game House.\n\nOs códigos de convite são únicos entre todas as contas.`),
  m("func-permissoes", "Equipa", "Permissões", "permissao|permissoes|o que o funcionario pode|limitar funcionario|bloquear funcionario|desativar funcionario|funcionario roubar|funcionario mexe",
    `**Permissões do funcionário** (Definições → Funcionários → Permissões)\n\n- **Vendas**: pode vender (ligado por defeito).\n- **Catálogo de vendas**: pode guardar itens e mudar preços (desligado por defeito).\n- Pode **desativar** um funcionário a qualquer momento.\n\nO funcionário vê só **as suas vendas** de hoje; o proprietário vê **todas e quem vendeu**, e recebe aviso de cada venda com o nome dele. Assim, cada kwanza fica rastreado.`),
  m("func-atividade", "Equipa", "Atividade da equipa", "atividade|historico de acoes|quem fez|quem apagou|registo de atividade|controlar funcionario",
    `No ecrã **Atividade** vê o que cada pessoa fez (sessões, vendas, apagados…), com **quem** e **quando**. Ações sensíveis, como apagar, ficam marcadas. É a melhor forma de ter confiança e transparência na equipa.`),

  /* ============ FINANÇAS ============ */
  m("fin-relatorios", "Finanças", "Relatórios", "relatorio|trimestre|anual|semanal|mensal|calendario|comparar periodo|exportar|csv",
    `**Relatórios automáticos:** em **Finanças → Ver Relatórios** vê **Dia, Semana, Mês, Trimestre, Ano** e **Calendário**, calculados a partir de sessões, vendas, recargas e despesas. O dia fecha à **meia-noite** e fica guardado. Pode **comparar** com o período anterior, exportar **CSV** e enviar **PDF**.`),
  m("fin-pdf", "Finanças", "PDF por WhatsApp", "pdf|enviar relatorio|partilhar relatorio|whatsapp do relatorio|tipo de letra|tamanho da letra|times new roman",
    `**Relatório em PDF por WhatsApp**\n\n1. **Finanças → Ver Relatórios** e escolha o período.\n2. Toque **Enviar PDF por WhatsApp**.\n3. Escreva o número (indicativo +244 já vem) e escolha **tipo de letra**, **tamanho** e estilo.\n4. Toque **Enviar**: o PDF A4 é guardado e abre a conversa. Se preciso, anexe em 📎 → Documento.\n\nNo telemóvel também pode **Partilhar o PDF** diretamente.`),
  m("fin-despesa", "Finanças", "Registar despesas", "despesa|gasto|registar gasto|nova transacao|pagar renda|compra de material|saida de dinheiro",
    `Registe **todas** as despesas em **Finanças → Nova Transação** (renda, luz, gasolina do gerador, internet, salários, material). Só assim o **lucro** que a app mostra é o lucro **real**. Quem não regista despesas pensa que ganha mais do que ganha.`),
  m("fin-caixa", "Finanças", "Caixa e saldo", "caixa|saldo inicial|fechar o caixa|fecho de caixa|diferenca no caixa|falta dinheiro|sobra dinheiro|conferir o caixa",
    `**Saldo em caixa** = saldo inicial + entradas − despesas. **Fecho de caixa todos os dias:** conte o dinheiro físico e compare com o saldo da app. Se houver diferença, procure no **Atividade** e nas **Vendas** de cada funcionário. Diferença pequena e repetida costuma ser troco mal dado.`),
  m("fin-meta", "Finanças", "Meta diária", "meta|objetivo diario|meta do dia|quanto quero faturar",
    `A **meta diária** define-se em **Definições → Meta Diária**. A app mostra a percentagem atingida e avisa quando chega lá. Dica: faça a meta com base em despesas diárias + lucro desejado ÷ dias abertos.`),

  /* ============ ADM / SALAS / ANÚNCIOS (o que o dono vê) ============ */
  m("sala-anuncios", "Novidades", "Anúncios e avisos da CJ", "anuncios|rodape|publicidade da app|fotos a deslizar|avisos da cj|avisos do adm|noticias da app|novidades",
    `No rodapé da app deslizam os **anúncios e novidades da CJ Gerenciamento**. Os **avisos** importantes da nossa equipa aparecem no **sino** e no ecrã, uma vez por casa. Se quiser **anunciar o seu negócio** na app, fale com um gerente.`),
  m("sala-salas", "Novidades", "Salas (atalhos)", "salas|atalho no topo|sala de torneio|sala de precos|regras da sala|inscricao no torneio",
    `As **salas** são atalhos no topo da app criados pela nossa equipa: torneios com inscrição por WhatsApp, tabela de preços, regras e contactos. Tem uma ideia de sala para a sua comunidade? Diga a um gerente.`),

  /* ============ NEGÓCIO: COMEÇAR ============ */
  m("neg-comecar", "Negócio", "Como começar", "comecar o negocio|iniciar negocio|abrir uma game house|montar game house|criar game house|abrir cyber|lan house|negocio de jogos|passo a passo para abrir|quero abrir",
    `**Como abrir a sua Game House — passo a passo**\n\n1. **Plano e orçamento** — quantas máquinas (comece com 5–10), investimento total e quanto precisa faturar por mês.\n2. **Local** — perto de escolas, universidades e bairros movimentados; espaço ventilado e seguro.\n3. **Equipamento** — PCs ou consolas (PS4/PS5), ecrãs, comandos, headsets, cadeiras, router.\n4. **Energia e internet** — gerador/inversor ou UPS e ligação estável.\n5. **Legalização** — registo, NIF e licença (confirme no Guiché Único da Empresa e na AGT).\n6. **Preços** — pacotes por tempo e preços fixos por jogo.\n7. **Receitas extra** — bebidas, snacks, cópias e impressões.\n8. **Divulgação** — WhatsApp, Instagram/Facebook, torneios.\n9. **Controlo** — a **CJ Gerenciamento** cuida dos cronómetros, caixa e relatórios.\n\nBora começar! Quer ajuda com os preços ou o ponto de equilíbrio?`),
  m("neg-capital", "Negócio", "Investimento inicial", "quanto custa montar|investimento|capital inicial|orcamento|quanto preciso para abrir|dinheiro para comecar|custo de abrir",
    `O investimento varia muito (número de máquinas, local, se usa PC ou consola). **Lista do que entra na conta:** máquinas, ecrãs, periféricos, cadeiras/mesas, router/internet, UPS/gerador, ar condicionado/ventoinhas, obras/decoração, licenças e **fundo de maneio** para 2–3 meses de despesas.\n\n**Conselho:** comece pequeno (5–10 máquinas), recupere o investimento e reinvista o lucro. Faça as contas com os seus preços reais — posso ajudar a calcular o ponto de equilíbrio.`),
  m("neg-pc-ou-consola", "Negócio", "PC ou consola", "pc ou consola|playstation ou pc|ps5 ou pc|qual melhor|consola ou computador|ps4|ps5|xbox|que jogos|jogos mais pedidos",
    `**PC ou consola?**\n\n- **PC gamer**: mais jogos online (Valorant, CS, Fortnite, FIFA/EA FC), serve também para trabalhos escolares — mais versátil, mas pede melhor gestão de energia e manutenção.\n- **PS4/PS5**: o público adora **FIFA/EA FC, Football, Call of Duty, GTA** em ecrã grande; mais simples de manter, ótimo para jogos em dupla.\n\nMuitas casas de sucesso **misturam os dois**. Veja o que a sua zona pede e comece com o que a procura mostrar.`),
  m("neg-local", "Negócio", "Escolher o local", "local|localizacao|onde abrir|onde montar|bairro|perto de escolas|escolher o espaco|renda do espaco|arrendar",
    `**Escolher o local:** perto de **escolas, universidades e bairros com muitos jovens**, rua com movimento e **segura** (a clientela chega e sai à noite). Veja: energia estável, ventilação, espaço para fila, casa de banho e vizinhos tolerantes ao barulho. **Negocie o contrato** por escrito e confirme a renda antes de gastar em obras.`),
  m("neg-legal", "Negócio", "Legalização e impostos", "licenca|alvara|legaliz|registo da empresa|nif|imposto|agt|documentos|burocracia|lei|guiche|contabilista|iva|regime simplificado",
    `**Legalização (orientação geral)**\n\n- Registo da empresa/atividade (ex.: **Guiché Único da Empresa**).\n- **NIF** e inscrição fiscal na **AGT**, com contabilidade ou regime simplificado.\n- **Licença de exploração/alvará** na administração municipal.\n- Seguro, contrato do espaço e, com funcionários, a segurança social.\n\n⚠️ Requisitos e taxas mudam — **confirme sempre** nas entidades oficiais ou com um contabilista antes de abrir.`),
  m("neg-energia", "Negócio", "Energia e internet", "energia|luz|gerador|inversor|ups|corte de luz|cortes de energia|internet|fibra|wifi|rede lenta|lag|ping|painel solar|solar|combustivel",
    `**Energia e internet** — o que mais pesa na experiência:\n\n- **UPS/inversor** para os PCs não desligarem em cortes curtos; **gerador** (ou solar) para cortes longos.\n- Internet: prefira **fibra** ou rádio dedicado; ligue os PCs por **cabo** e deixe o Wi-Fi para telemóveis.\n- Em jogos online, o **ping** conta mais do que a velocidade.\n- Registe luz e combustível como **despesa** para ver o lucro real.\n\nSe a luz cortar, a sessão pausa? Anote o tempo e dê o tempo de volta — cliente satisfeito volta sempre.`),

  /* ============ NEGÓCIO: PREÇOS E LUCRO ============ */
  m("neg-precos", "Negócio", "Definir preços", "quanto cobrar|como cobrar|precificar|preco por hora|tabela de precos|ponto de equilibrio|preco justo|cobrar por hora|quanto cobro",
    `**Como definir bons preços**\n\n1. Some as **despesas mensais** (renda, luz/gerador, internet, salários, manutenção).\n2. Estime as **horas vendidas**: máquinas × horas por dia × dias × ocupação média (ex.: 50%).\n3. **Custo por hora** = despesas ÷ horas vendidas.\n4. Some a **margem** (30% a 100%) e arredonde.\n\n*Exemplo:* despesas AOA 300.000/mês; 10 máquinas × 8 h × 26 dias × 50% = 1.040 h → custo ≈ AOA 290/h; com 100% de margem, cobrar ≈ AOA 580–600/h.\n\nDicas: pacotes maiores com desconto, preço fixo por jogo e promoção nas horas calmas. Olhe também para os concorrentes da zona.`),
  m("neg-lucro", "Negócio", "Calcular o lucro", "lucro|margem|calcular ganho|estou a ganhar|rentavel|vale a pena|estou a perder|prejuizo|retorno do investimento",
    `**Lucro = Receitas − Despesas.** **Margem (%) = Lucro ÷ Receitas × 100.**\n\nEm **Finanças → Ver Relatórios** vê isso por dia, semana, mês, trimestre e ano.\n\nPara produtos: **lucro por unidade = preço de venda − preço de compra** (compra a 120, vende a 200 → ganha 80, ou 40%).\n\nRegiste **todas** as despesas para o lucro ser real. Se a margem for baixa, mexa em **preço, desperdício e horas vazias**.`),
  m("neg-promo", "Negócio", "Promoções e pacotes", "promocao|desconto|happy hour|pacote familia|pacote|hora gratis|dupla|horas calmas|horas vazias|dias fracos",
    `**Promoções que funcionam**\n\n- **Happy hour** nas horas calmas (ex.: manhã/início da tarde).\n- **Pacote dupla/família** para jogar em grupo.\n- **10.ª hora grátis** ou bónus de recarga para clientes fiéis.\n- **Pacote do estudante** em dias de aula.\n\nComunique tudo por **WhatsApp e redes sociais**. Dica: nunca baixe o preço base; crie **ofertas com prazo**.`),
  m("neg-clientes", "Negócio", "Atrair clientes", "atrair|cliente|marketing|divulg|fideliz|aumentar vendas|mais movimento|mais clientes|casa vazia|sem clientes|poucos clientes|redes sociais|instagram|facebook|tiktok|panfleto",
    `**Atrair e manter clientes**\n\n- **WhatsApp:** lista de transmissão com promoções e horários.\n- **Redes sociais:** fotos, vídeos curtos (TikTok/Reels), resultados de torneios.\n- **Torneios semanais:** FIFA/EA FC, Valorant, Football, com inscrição simbólica — enchem a sala.\n- **Fidelização:** registe os jogadores na app e dê bónus de recarga.\n- **Experiência:** máquinas limpas, internet rápida e bom atendimento.\n- **Extras:** bebidas, snacks, cópias e impressões.\n- **Parcerias:** escolas, igrejas jovens, grupos de bairro.`),
  m("neg-torneio", "Negócio", "Organizar torneios", "torneio|campeonato|competicao|inscricao|premio|bracket|eliminatoria|liga de jogos|evento gamer",
    `**Torneio que dá lucro**\n\n1. Escolha **um jogo** que a sua clientela domina (FIFA/EA FC, Football, Valorant…).\n2. Defina **vagas**, **data**, **inscrição** e **prémios** (a inscrição deve cobrir o prémio e deixar margem).\n3. Escreva as **regras** (tempo de jogo, desistências, empates).\n4. Divulgue em **WhatsApp e redes** com cartaz e contagem decrescente.\n5. No dia: sorteio das chaves, **placar visível** e fotos/vídeos para voltar a divulgar.\n\nA CJ pode criar uma **sala de torneio** com inscrição por WhatsApp — peça a um gerente.`),
  m("neg-extras", "Negócio", "Receitas extra", "receita extra|ganhar mais|outras receitas|vender comida|lanche|agua|carregar telemovel|impressoes|cybercafe|servicos extra|aumentar o lucro",
    `**Receitas extra que combinam com a Game House**\n\n- Bebidas, água, sumos e snacks (margem boa, giram rápido).\n- **Cópias, impressões, digitalizações e trabalhos escolares** — estudantes pagam e voltam.\n- **Carregamento de telemóveis/power banks**.\n- Venda de acessórios simples (auscultadores, comandos, rato).\n- **Aluguer** da sala para festas de aniversário e torneios privados.\n\nRegiste tudo em **Vender** e veja o lucro de cada item.`),

  /* ============ NEGÓCIO: GESTÃO DO DIA A DIA ============ */
  m("neg-equipa", "Negócio", "Gerir a equipa", "contratar|equipa de trabalho|atendente|salario|funcionario preguicoso|motivar|escala|turno|horario de trabalho|despedir|confianca no funcionario",
    `**Equipa:** comece sozinho ou com **1 atendente de confiança**. Defina **horários e tarefas** (abrir/fechar, caixa, limpeza). Com a app, o funcionário inicia sessões e vendas e você acompanha **relatórios e avisos** sem estar presente. Pague o que combinou, registe como despesa e **reconheça bom trabalho** — equipa motivada cuida do seu negócio como se fosse dela.`),
  m("neg-fraude", "Negócio", "Evitar perdas e fraudes", "fraude|roub|furto|desvi|desaparece dinheiro|funcionario rouba|perda de dinheiro|controlo|evitar roubos|sessao nao registada|apagar sessao",
    `**Evitar perdas**\n\n1. **Toda** sessão e venda passa pela app — nunca "por fora".\n2. Dê só as **permissões** necessárias ao funcionário.\n3. Veja o **Atividade** e as **vendas por funcionário** com frequência.\n4. **Feche o caixa** todos os dias e compare com a app.\n5. Conte o **stock** semanalmente.\n\nO objetivo não é desconfiar — é ter um sistema onde **ninguém tem tentação**.`),
  m("neg-manutencao", "Negócio", "Manutenção e limpeza", "manutencao|limpar|limpeza|avariou|avaria|pc avariado|manter as maquinas|poeira|ventoinha|atualizacoes|pecas|tecnico",
    `**Manutenção que poupa dinheiro**\n\n- Limpe teclados, ratos, comandos e ecrãs **todos os dias**.\n- A cada 1–2 meses limpe o **pó interno** dos PCs.\n- Tenha **peças e cabos de reserva** (comandos, HDMI, ratos).\n- Máquina com problema: ponha **em manutenção** na app para ninguém a escolher.\n- Mantenha um **técnico de confiança** por WhatsApp.`),
  m("neg-atendimento", "Negócio", "Bom atendimento", "atendimento|cliente reclama|reclamacao|cliente zangado|conflito|briga|barulho|ambiente|regras da casa|comportamento",
    `**Atendimento que fideliza**\n\n- Receba com um sorriso e **explique os preços** antes de começar.\n- Cliente reclama? **Ouça primeiro**, resolva depois, e compense quando for justo (alguns minutos de bónus).\n- Afixe **regras da casa** (sem palavrões, sem comida junto aos PCs, respeito pelos outros).\n- Em conflitos, **mantenha a calma** e chame o responsável.\n\nUm cliente bem tratado traz mais três.`),
  m("neg-menores", "Negócio", "Menores e escolas", "menores|criancas|escola|estudantes|horario escolar|pais|encarregado|idade|jogos violentos|crianca a jogar",
    `Muitos clientes são **menores**. Boas práticas: definir **horários** que não coincidam com a escola, avisar os pais pelo WhatsApp, **não permitir jogos impróprios** para a idade e não deixar crianças depois de certa hora. É bom para a imagem e protege o seu negócio.`),
  m("neg-concorrencia", "Negócio", "Concorrência", "concorrencia|concorrente|outra game house|abriram uma perto|perder clientes|diferenciar|ser melhor que|vantagem competitiva",
    `**Concorrente por perto?** Não entre em guerra de preços. **Diferencie-se:** limpeza, internet rápida, ambiente seguro, torneios, atendimento, programa de fidelidade e bons horários. Registe os jogadores na app e **fale com eles** — clientes que se sentem em casa não trocam por mais 100 kwanzas de desconto.`),
  m("neg-crescer", "Negócio", "Crescer o negócio", "crescer|expandir|abrir segunda casa|mais maquinas|filial|reinvestir|escalar|melhorar o negocio|proximo passo",
    `**Para crescer com segurança**\n\n1. Só aumente máquinas quando a **ocupação média passar de ~60–70%** nas horas fortes.\n2. **Reinvista** parte do lucro todo mês.\n3. Meça: ocupação, ticket médio, lucro por máquina (os **relatórios** ajudam).\n4. Treine um **responsável de confiança** antes de abrir segunda casa.\n5. Crie **marca**: nome, cores, logotipo e presença nas redes.`),
  m("neg-sazonal", "Negócio", "Épocas fracas e fortes", "epoca|ferias|dias fracos|dia fraco|fim de semana|sexta|sabado|domingo|exames|natal|dezembro|ferias escolares|quando ha mais movimento",
    `**Épocas:** **férias escolares, fins de semana e feriados** costumam ser os melhores. Em época de **exames** o movimento cai — aproveite para **cópias e impressões**. Planeie **promoções** para dias fracos e **torneios** para fins de semana. Os relatórios por semana e mês mostram o seu padrão.`),
  m("neg-horario", "Negócio", "Horário de funcionamento", "horario de funcionamento|abrir mais cedo|fechar mais tarde|a que horas abrir|horario da casa|horas de abertura|abrir domingo",
    `Defina o horário em **Definições** (abertura e fecho). Use os **relatórios** para ver **em que horas** a casa enche: alargue o horário só onde há procura. Fechar tarde exige **segurança** e transporte para os clientes voltarem a casa.`),
  m("neg-planeamento", "Negócio", "Metas e planeamento", "plano de negocio|planear|plano mensal|objetivos|metas do mes|projecao|orcamento mensal|organizar as financas",
    `**Plano simples de 4 passos:** 1) Some as **despesas fixas** do mês. 2) Defina **meta mensal** (despesas + lucro desejado). 3) Divida pelos dias abertos para ter a **meta diária** na app. 4) Todas as semanas veja os **relatórios** e ajuste preços/promoções. Gerir bem é ganhar mais!`),
  m("neg-separar", "Negócio", "Separar dinheiro pessoal", "dinheiro pessoal|misturar|uso dinheiro da casa|retirar dinheiro|meu salario|pro-labore|salario do dono|dinheiro da caixa para mim",
    `**Regra de ouro:** não misture o dinheiro da casa com o seu. Defina um **salário fixo para si** e registe-o como despesa. Retiradas "só por hoje" desorganizam o caixa e escondem o lucro verdadeiro.`),
  m("neg-fundo", "Negócio", "Fundo de reserva", "fundo de reserva|reserva de emergencia|poupanca|poupar|emergencia|avaria grande|guardar dinheiro",
    `Guarde todos os meses uma parte do lucro num **fundo de reserva** (ideal: 2–3 meses de despesas). Vai pagar reparações grandes, falta de luz prolongada ou meses fracos sem entrar em dívida.`),

  /* ============ AJUDA HUMANA ============ */
  m("ajuda-gerente", "Ajuda", "Falar com gerente", "falar com gerente|falar com um gerente|gerente|atendimento humano|pessoa real|falar com alguem|falar com uma pessoa|suporte|ajuda humana|contacto|contato|telefone|whatsapp da cj|preciso de ajuda|nao resolve|reclamar|sugestao|sugerir",
    `Claro! Pode falar com um **gerente real** da CJ Gerenciamento pelo WhatsApp. Toque em **Ajuda** (ícone de boia, no topo desta conversa) ou no botão **Falar com um gerente** abaixo — a mensagem já vai pronta com o nome da sua Game House e o ID.`),
];

/* ------------------------------------------------------------------ */
/*  Busca (pontuação por palavras/radicais)                            */
/* ------------------------------------------------------------------ */

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

const reCache = new Map<string, RegExp>();
const keyRe = (k: string) => {
  let r = reCache.get(k);
  if (!r) {
    r = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    reCache.set(k, r);
  }
  return r;
};

/** Memórias do ADM → formato interno (palavras-chave + palavras do título). */
export function admToMemories(list: AiMemory[]): Memory[] {
  return list
    .filter((x) => x.active && x.answer.trim())
    .map((x) => {
      const kws = x.keywords.split(/[,;\n]/).map((k) => normalize(k)).filter((k) => k.length >= 2);
      const tw = normalize(x.title).split(" ").filter((w) => w.length >= 4);
      return { id: `adm-${x.id}`, cat: "ADM", title: x.title, keys: [...new Set([...kws, ...tw])], answer: x.answer.trim(), source: "adm" as const };
    });
}

function score(q: string, mem: Memory) {
  let s = 0;
  for (const k of mem.keys) {
    if (!keyRe(normalize(k)).test(q)) continue;
    const words = k.split(" ").length;
    s += words > 1 ? 3 + words : k.length >= 6 ? 2 : 1.2;
  }
  return s;
}

export interface Hit { mem: Memory; score: number }

/** Melhores memórias para uma pergunta. As do ADM ganham um bónus. */
export function recall(question: string, adm: AiMemory[], limit = 4): Hit[] {
  const q = normalize(question);
  if (!q) return [];
  const all = [...admToMemories(adm), ...BASE];
  return all
    .map((mem) => ({ mem, score: score(q, mem) * (mem.source === "adm" ? 1.5 : 1) }))
    .filter((h) => h.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Texto das memórias relevantes para injetar no prompt da IA online. */
export function memoryPrompt(question: string, adm: AiMemory[]) {
  const hits = recall(question, adm, 5);
  if (!hits.length) return "";
  const plain = (t: string) => t.replace(/\*\*|\*/g, "").replace(/\n{2,}/g, "\n");
  return [
    `MEMÓRIAS DA ${BRAND.name.toUpperCase()} (verdade oficial — usa-as e não as contradigas; as marcadas [ADM] têm prioridade):`,
    ...hits.map((h) => `• [${h.mem.source === "adm" ? "ADM" : h.mem.cat}] ${h.mem.title}: ${plain(h.mem.answer).slice(0, 900)}`),
  ].join("\n");
}

/** Resumo do que a CJ sabe — para a IA saber o que existe. */
export const BRAND_FACTS = [
  `Funcionalidades da app: mapa de máquinas com cronómetro e alarme, reservas, jogadores, vendas (calculadora, catálogo, carrinho, troco), finanças e relatórios (dia a ano, PDF por WhatsApp), inventário, funcionários com permissões, atividade, cópia de segurança, tema, voz do assistente, tablet automático.`,
  `Cobrança: acesso por período; aviso antes de vencer; tolerância em dias; depois bloqueio (dados ficam guardados). O dono paga e toca «Já paguei» ou usa um código de ativação PAG-XXXX-XXXXXXXX dado por um gerente. Valores/prazos: só um gerente confirma.`,
  `Limites atuais: os dados ficam no telemóvel onde a conta foi criada (cópia de segurança para mudar de aparelho).`,
].join("\n");

/* ------------------------------------------------------------------ */
/*  Boas-vindas por voz                                                */
/* ------------------------------------------------------------------ */
const MASC_A = new Set(["joshua", "luca", "elias", "matias", "tobias", "jonas", "lucas", "isaias", "zacarias", "jeremias", "nuno"]);
/** Palpite pelo primeiro nome: termina em «a» → feminino (com exceções). Sem nome → neutro. */
export function guessFemale(fullName: string): boolean | null {
  const f = normalize(fullName).split(" ")[0] ?? "";
  if (f.length < 2) return null;
  if (MASC_A.has(f)) return false;
  if (/(a|ia|ete|ine|ice|yn|elle)$/.test(f)) return true;
  return false;
}

/** «Olá Cristina Lopes, seja bem-vinda ao nosso gerenciamento por IA Cris José. Em que posso ajudar?» */
export function welcomeLine(fullName: string) {
  const name = fullName.trim();
  const f = guessFemale(name);
  const bv = f === null ? "bem-vindo" : f ? "bem-vinda" : "bem-vindo";
  return `Olá${name ? ` ${name}` : ""}, seja ${bv} ao nosso gerenciamento por IA ${BRAND.founder}. Em que posso ajudar?`;
}
