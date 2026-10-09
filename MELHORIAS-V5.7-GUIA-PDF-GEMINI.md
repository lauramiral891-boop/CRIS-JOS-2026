# CJ Gerenciamento v5.8 — Guia, PDF, Gemini seguro e privacidade

## Implementado nesta cópia

- Guia inicial com opção de iniciar/saltar, navegação por passos, botão permanente de ajuda e progresso local separado por conta, papel e ID do funcionário.
- Explicação contextual na primeira abertura de cada sala ADM/comunidade, usando o nome e a descrição configurados na sala.
- Destaque visual do separador real da navegação durante o tutorial.
- PDF verdadeiro criado com `jsPDF`, nome de ficheiro `CJ_Relatorio_YYYY-MM-DD_tipo.pdf`, pré-visualização, download e partilha por Web Share API quando o dispositivo permite anexar ficheiros.
- Logótipo do projeto carregado a partir de `public/logo.png`, assinatura editável (por defeito “Cristina e José”), nome do proprietário, contactos e mensagem de suporte editáveis.
- Relatório PDF inclui utilização das máquinas a partir do histórico real de sessões quando o proprietário gera o documento.
- Para funcionários sem permissão financeira total, os movimentos do relatório e o PDF são limitados aos movimentos registados pelo próprio funcionário; o histórico de utilização das máquinas não é anexado ao PDF do funcionário.
- Proxy Supabase Edge Function para Gemini com validação de sessão, chave guardada no servidor e Google Search grounding quando a pergunta pede informação atual/pesquisa/fontes.
- Remoção da chave Gemini antiga da configuração carregada/normalizada/guardada. O assistente não envia os dados privados da casa para um fornecedor alternativo quando o proxy seguro não está configurado; usa as respostas locais.
- Pesquisa externa: o prompt enviado ao Gemini não inclui as receitas, despesas, nomes, funcionários, reservas ou memórias administrativas da casa.
- Pesquisa externa: envia apenas a pergunta atual, sem o histórico anterior da conversa, para reduzir o risco de expor dados privados.
- Teste de smoke com Node.js, sem dependências de teste adicionais.

## Configuração externa necessária para Gemini seguro

1. Revogar a chave Gemini que foi exposta e gerar uma nova no Google AI Studio.
2. Guardar a nova chave apenas como segredo Supabase: `supabase secrets set GEMINI_API_KEY=CHAVE_NOVA`.
3. Publicar `supabase/functions/cj-gemini/index.ts`: `supabase functions deploy cj-gemini`.
4. Configurar `VITE_GEMINI_PROXY_URL` no serviço de alojamento com o URL real da Edge Function.
5. Reconstruir a aplicação. O proxy exige sessão Supabase válida; contas locais continuam com tutoriais e respostas locais.

## Limitações e validação

- A Web Share API só anexa diretamente o PDF em WebViews/dispositivos que suportem partilha de ficheiros. Caso contrário, o documento é descarregado e o utilizador anexa-o manualmente no WhatsApp. O envio final nunca é automático.
- Não foi possível executar `npm ci`, o TypeScript completo ou o build neste ambiente porque falta uma dependência no cache offline e o acesso à registry não está disponível. O teste de transpilation sintática não substitui a verificação de tipos nem o build.
- A função Supabase não foi publicada nem testada contra um projeto real; a configuração externa acima ainda é necessária.
- A publicação GitHub, Vercel e o APK não foram executados nesta sessão.
- Atenção: a aplicação anterior usa `VITE_LICENSE_SECRET` para códigos de ativação offline. Qualquer variável com prefixo `VITE_` é incorporada no frontend. Não é seguro considerar esse segredo privado no navegador; migrar a assinatura/validação dos códigos para um serviço de servidor requer uma alteração separada, pois muda a forma como os códigos offline são gerados e validados.
