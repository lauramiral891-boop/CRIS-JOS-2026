# Publicar online + Android + iPhone (CJ Gerenciamento v4.8)

## 1. Online (link para todos) — 10 minutos, grátis
1. `npm install` e `npm run build` (gera `dist/`).
2. Crie conta grátis no **Netlify** (ou Vercel / Cloudflare Pages), ligue este projeto ou arraste a pasta `dist`. Já existem `netlify.toml` e `vercel.json`.
3. Antes do build, crie `.env`: `VITE_LICENSE_SECRET=frase-longa-secreta` e (opcional) `VITE_MANAGERS="Nome|Função|923000000;..."`.
4. Abra o link no telemóvel → «Adicionar ao ecrã principal». Funciona como app (PWA), em Android e iPhone (Safari → Partilhar → Adicionar ao ecrã principal).

## 2. Android (Play Store) — conta Google Play (25 USD, pagamento único)
`npm run cap:add:android` → `npm run cap:android` (abre o Android Studio) → Build → Generate Signed App Bundle (.aab) → enviar na Play Console. ID da app: `ao.cjgerenciamento.app`.

## 3. iPhone (App Store) — precisa de Mac + conta Apple Developer (99 USD/ano)
`npm run cap:add:ios` → `npm run cap:ios` (abre o Xcode) → escolha a equipa → Product → Archive → enviar para a App Store Connect. A Apple exige política de privacidade e capturas de ecrã.

## 4. O que ainda falta para ser 100% «online»
Hoje os dados ficam em cada telemóvel. Para: entrar na mesma conta noutro aparelho, código por SMS/email, anúncios/avisos/gerentes/memórias do ADM a chegar a TODOS, confirmar pagamentos à distância e push com a app fechada, é preciso um **servidor** (ex.: Supabase ou Firebase). É o próximo passo.
