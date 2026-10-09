# Sala do ADM (v4.5 — CJ Gerenciamento)

- **Onde fica**: botão **ADM** no canto superior direito do ecrã de cadastro/entrada (antes de entrar em qualquer conta). Já **não existe dentro do app**.
- **Acesso único**: só o proprietário do app CrisJoseGamer, com a senha única do ADM. O código guarda só o *hash* (`src/lib/adm.ts`, constante `ADM_HASH`), nunca a senha. 5 erros = 30 s de bloqueio.
- **Trocar a senha**: gere um novo hash `v1$<sal>$<hash>` (SHA-256, sal, 2000 rondas — o mesmo de `hashPass` em `src/lib/auth.ts`) e substitua `ADM_HASH`.
- **Separadores**: Painel (ao vivo, por casa), Cobrança (por casa), IA, Anúncios, Salas, Avisos. Painel/Cobrança/IA têm um seletor de **Casa** no topo.
- **Anúncios**: o rodapé desliza com as **fotografias enviadas pelo ADM** (várias de uma vez, ordem ajustável, velocidade 3–12 s, deslize com o dedo). Também há anúncios só de texto.
- **Salas**: modelos prontos (Torneio, Preços, Regras, Contacto, Em branco) e editor por blocos — texto, tabela de preços, horários, regras, botão (WhatsApp / ligar / link), galeria de fotos e inscrição (abre o WhatsApp com a mensagem pronta). Cada sala tem cor, emoji, capa e frase.
- **IA**: escreva o pedido, confira a lista e toque em «Aplicar». Nada muda sem confirmação.
- **Cobrança**: valor/dias/tolerância e texto «Como pagar». Sem pagamento aparece o ecrã de bloqueio; os dados ficam guardados.
- **Código de ativação (legado)**: a assinatura atual é feita no frontend e NÃO é segura para proteger cobranças comerciais. Não coloque segredos em variáveis `VITE_`; a geração e validação precisam de um endpoint de servidor antes de usar a cobrança como proteção real.

## Limites desta versão (tudo guardado no próprio telemóvel)
1. Anúncios, fotos, salas e avisos ficam guardados **no telemóvel onde o ADM os criou**. Para aparecerem em **todos** os telemóveis (e para ver/bloquear várias casas à distância, confirmar pagamentos e enviar push com a app fechada) é preciso **servidor** — o `sw.js` já está preparado para push.
2. Quem tiver acesso ao telemóvel e souber mexer no navegador pode contornar bloqueios locais. Só um servidor impede isso de verdade.
3. As fotos são comprimidas, mas o armazenamento do navegador é limitado (~5 MB): a Sala do ADM avisa quando ficar cheio.
4. Anúncios são **próprios** (os que o ADM cria). AdSense/AdMob exigem domínio/loja e aprovação.

---

# Contas (v4)

- **Criar conta**: foto da Game House (obrigatória), nome da Game House, nome do proprietário, email **ou** telefone e palavra-passe (mín. 6). Cai um código de 6 dígitos na parte de baixo da app; depois de o confirmar a conta é criada e volta ao ecrã **Entrar**.
- **ID único** por conta (`CJ-XXXXXXXX`), visível em Definições. Cada conta tem o seu próprio espaço de dados (`cjg-data:<ID>`): A nunca vê B.
- **Entrar**: sem conta criada, ou com dados errados, não entra. 5 falhas = 30 s de bloqueio.
- **Funcionários**: entram só na sala do proprietário que os convidou e veem a foto e o nome da Game House dele. Os códigos de convite são únicos entre todas as contas.

## Limites (sem servidor)
1. Tudo fica guardado **neste telemóvel**. Entrar noutro telemóvel com a mesma conta, e enviar o código por email/SMS, só é possível com servidor (ex.: Supabase/Firebase + serviço de email).
2. Quem tiver acesso ao telemóvel e souber usar as ferramentas do navegador consegue ler o armazenamento local. A separação A/B é garantida pela app, não por segurança de servidor.

# v4.4
- App renomeado (agora **CJ Gerenciamento**), com o logotipo `public/logo.png` e ícones novos (`icon-192/512.png`).
- Assistente IA com **voz** (voz portuguesa do telemóvel, sem custo): lê as respostas, saúda ao abrir, botão 🔊 no topo para ligar/desligar e "Ouvir" em cada resposta. A qualidade da voz depende das vozes instaladas no telemóvel.

# v4.5
- Nome do app: **CJ Gerenciamento** (antes CJ Hoje) em todo o app, manifesto, notificações e assistentes.
- Sala do ADM movida para o cadastro, com senha única; rodapé de anúncios com fotos; salas personalizadas por blocos.

# v4.6 — Tablet automático
- Em tablet (ecrã tátil ≥ 640px) a app ocupa o ecrã todo: sem moldura de telemóvel, sem painéis laterais, roda sozinha (vertical/horizontal). Coluna centrada até 840px.
- Telemóvel e computador ficam como estavam. O telemóvel continua bloqueado em pé.
- Manifesto: `orientation` passou a `any` (o bloqueio em pé no telemóvel é feito no `main.tsx`). Para o APK já instalado apanhar isto, gere o APK de novo.
- `100vh` trocado por `100dvh` (barra do navegador já não tapa a barra de baixo).

# v4.7 — Vendas pelo funcionário
- As vendas de bebidas, snacks, cópias, impressões e outros serviços já existiam (botão «Vender Produtos» no Início). Agora o proprietário controla o que o funcionário pode fazer, em Definições → Funcionários → Permissões:
  - **Vendas**: o funcionário vende (calculadora + catálogo + carrinho). Fica ligado por defeito.
  - **Catálogo de vendas** (novo, desligado por defeito): deixa o funcionário guardar itens novos e mudar preços. Apagar itens do catálogo é só do proprietário.
- O funcionário vê só **as suas** vendas de hoje. O proprietário vê todas e quem vendeu cada uma.
- Cada venda do funcionário avisa o proprietário com o nome dele.

# v4.8 — Memórias da IA, Ajuda e Gerentes reais
- **IA com a cara da CJ / Cris José** (`src/lib/brain.ts`): personalidade angolana, calorosa, com o lema «Gerir bem é ganhar mais». Traz mais de 70 memórias de base (marca, conta, cobrança, técnico, app, vendas, equipa, finanças e negócio) e funciona também **sem internet**.
- **Memórias do ADM** (Sala do ADM → **Memórias**): título + palavras-chave + resposta oficial. Têm prioridade sobre a base e a IA online também as recebe no prompt. A lista **«Perguntas que a IA não soube»** mostra o que os proprietários perguntaram sem resposta, com botão **Ensinar** (só perguntas feitas neste telemóvel).
- **Gerentes reais** (Sala do ADM → **Gerentes**): nome, função, WhatsApp e horário; podem ser escondidos/ordenados e testados. Aparecem em **Definições → Ajuda e Gerentes** e na Assistente (ícone da boia). O toque abre o WhatsApp com mensagem pronta (nome da casa, proprietário e ID).
- A Assistente mostra os botões dos gerentes sozinha em temas de cobrança, conta, reembolso, ou quando não sabe responder.
- Os gerentes e memórias criados na Sala do ADM ficam neste telemóvel. Para os gerentes chegarem a **todos** os telemóveis sem servidor, crie `.env` com `VITE_MANAGERS="Cris José|Suporte|923000000|Seg–Sáb 08h–20h;Maria|Cobrança|924000000"` e faça `npm run build` (serve de lista base; o que o ADM editar no seu telemóvel tem prioridade nele).
- Voz: ao abrir a Assistente, diz automaticamente «Olá <nome do proprietário>, seja bem-vindo(a) ao nosso gerenciamento por IA Cris José. Em que posso ajudar?» (o género é um palpite pelo primeiro nome). Gerente padrão: 945379003. Ver PUBLICAR-ONLINE-E-LOJAS.md.

# v4.9 — Notificações nativas e ajuste por dispositivo
- **Notificações na barra** (Android/iPhone), como o WhatsApp: a app pede a permissão «Permitir notificações» (Android 13+) quando o proprietário ativa os avisos. Canais: «Alertas (tempo esgotado)» e «Avisos da Game House».
- **Tempo esgotado com a app fechada**: cada sessão com cronómetro agenda um aviso no telemóvel para a hora exata (app instalada via Capacitor). Depois de `cap add android` e `npm run cap:sync`, o script `scripts/patch-native.mjs` acrescenta as permissões ao AndroidManifest (POST_NOTIFICATIONS, VIBRATE, SCHEDULE_EXACT_ALARM…).
- Avisos de **outros telemóveis** com a app fechada (ex.: aviso do ADM) precisam de servidor + Firebase (FCM/APNs).
- **Removida a barra falsa** (|||  ○  <) que aparecia em baixo na app.
- **Layout**: telemóvel e tablet ocupam o ecrã inteiro (respeitam entalhe e barra de gestos); em PC/Windows a janela é centrada e nunca passa da altura do navegador, sem rolar a página.

# v5.0 — Nuvem (Supabase)
Ver `SUPABASE-ATIVAR.md` e `supabase/schema.sql`. **Senha do ADM trocada** nesta versão (hash em `src/lib/adm.ts`); para trocar de novo: `node scripts/adm-hash.mjs "senha-nova"` e colar o resultado em `ADM_HASH`.

# v5.2 — Sala de Stock
- Início → **Sala de Stock** (substitui o antigo Inventário): itens com unidade, mínimo e custo; **Entrada** (compra, com opção de registar como despesa na caixa); **Saída** manual por motivo (alimentação da equipa, despesa da Game House, perda, ajuste); **saídas automáticas por vendas** (itens ligados no catálogo); separadores **Movimentos** (quem, quando, antes→depois) e **Resumo** (hoje, 7 dias, mês, tudo, ao custo).
- Os dados antigos do inventário continuam; os movimentos novos entram em `stockMoves` e seguem para a nuvem com os restantes dados.
- Permissão do funcionário: a de «Stock» (`inventory`).
