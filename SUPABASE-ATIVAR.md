# Ativar a nuvem (Supabase + Vercel) — CJ Gerenciamento v5.5

Sem estas variáveis a app continua a funcionar em modo local (como antes). Com elas ganha: código real por email, conta recuperável noutro telemóvel, e o conteúdo do ADM (anúncios, salas, avisos, gerentes, memórias da IA) a chegar a todos.

## 1. Supabase (supabase.com, com o email tvvibeoficial@gmail.com)
1. **New project** (região mais próxima, ex.: Frankfurt/Londres). Guarde a palavra-passe da base de dados.
2. **SQL Editor** → cole o ficheiro `supabase/schema.sql` → Run. (Se o email do ADM não for `tvvibeoficial@gmail.com`, troque-o no ficheiro antes.)
   **Se já tinha corrido o schema da versão anterior, corra o ficheiro inteiro outra vez:** é seguro repetir e acrescenta as tabelas e funções dos funcionários (v5.5).
3. **Authentication → Providers → Email**: ligado. Desligue «Confirm email» não é preciso; o login é por código.
4. **Authentication → Email Templates**: nos modelos **Magic Link** e **Confirm signup**, ponha o código no texto: `O seu código CJ Gerenciamento: {{ .Token }}`. (Sem isto o email leva só um link e a app não consegue confirmar.)
5. **Authentication → SMTP Settings**: configure um envio próprio (ex.: Resend, Brevo). O envio de email padrão do Supabase é muito limitado e, segundo a documentação, pensado só para testes — para clientes reais é preciso SMTP próprio.
6. **Project Settings → API**: copie o **Project URL** e a chave **anon public**. (Nunca use a `service_role` na app.)

> **Atenção:** este app é Vite/React, não Next.js. No painel «Connect» do Supabase não precisa de seguir os passos do Next.js (npm install, middleware, etc.). Só precisa do URL e da chave. Os nomes `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` também passam a funcionar, mas prefira os nomes abaixo.

## 2. Vercel → Settings → Environment Variables
- `VITE_SUPABASE_URL` = o Project URL
- `VITE_SUPABASE_ANON_KEY` = a chave «anon» (eyJ…) ou a nova «publishable» (sb_publishable_…)
- `VITE_ADM_EMAIL` = tvvibeoficial@gmail.com
- `VITE_LICENSE_SECRET` = uma frase longa secreta
Depois **Redeploy**.

## 3. Primeira vez
- Abra a app → botão **ADM** → senha do ADM → barra amarela **Ligar à nuvem** → código no email do ADM. A partir daí tudo o que o ADM criar chega a todos os telemóveis.
- Proprietários novos: criam conta com **email** e recebem o código por email. Contas antigas: Definições → **Conta online (nuvem)** → Ligar.
- Outro telemóvel / palavra-passe esquecida: ecrã Entrar → **Recuperar por email**.

## Funcionário noutro telemóvel (novo na v5.5)
- O **proprietário** usa o telemóvel A com a conta ligada à nuvem (Definições → Conta online). Em Funcionários → Adicionar, o convite e os dados ficam guardados na nuvem; o convite (`CJ-XXXX-XXXX`) é **único em todas as contas**.
- O **funcionário** abre a app no telemóvel B → «Entrar como funcionário» → convite + código de utilizador + palavra-passe. Vê a sala do proprietário (nome e foto da Game House) e só o que as permissões dele permitem.
- Tudo o que o funcionário faz (sessões, vendas, stock, reservas, caixa, atividade) chega ao telemóvel A em segundos, com aviso no ecrã. O que o proprietário muda (preços, permissões, bloqueio) chega ao funcionário também.
- Os dois podem trabalhar ao mesmo tempo: a app funde as alterações (stock e saldos somam as duas diferenças; nada se perde). Sem internet, cada um continua a trabalhar e sincroniza ao voltar a ligar.
- Se o proprietário **bloquear ou remover** o funcionário, o telemóvel B perde o acesso na hora seguinte e a sala é apagada desse telemóvel.
- O funcionário **não recebe** a chave da IA nem a palavra-passe do proprietário, e nunca consegue mudar a configuração da casa nem a lista de equipa.
- Os convites criados antes da v5.5 começam por «LU-» e continuam a funcionar; os novos começam por «CJ-».

## Limites desta versão
- O funcionário só entra noutro telemóvel se a conta do proprietário estiver **ligada à nuvem** (com email) e tiver aberto a app com internet pelo menos uma vez depois de criar o funcionário.
- As permissões (o que cada funcionário pode fazer) são aplicadas pela app; a base de dados só impede o que é do proprietário (configuração, equipa, chave da IA, apagar o registo de atividade).
- Duas pessoas a mudarem exatamente o mesmo campo ao mesmo tempo (por exemplo, o preço do mesmo item): fica a última gravação.
- O alarme «tempo esgotado» toca em todos os telemóveis com a sala aberta.
- Conta com telefone (sem email) continua só local.
- Notificações com a app fechada vindas de outros telemóveis: precisam de Firebase (FCM), é o passo seguinte. Com a app aberta (ou em segundo plano recente) o aviso aparece em segundos.
