# CJ Gerenciamento v5.9 — aviso de segurança do licenciamento

Esta versão mantém as melhorias de privacidade da pesquisa Gemini, o guia contextual e a criação/partilha de relatórios PDF.

## Correção documental importante

- Removida do `.env.example` a instrução enganadora para colocar `VITE_LICENSE_SECRET` como se fosse secreto.
- Atualizados os guias de publicação, Supabase e ADM para explicar que variáveis `VITE_` são incorporadas no frontend e podem ser inspecionadas.
- A geração/validação dos códigos offline em `src/lib/billing.ts` continua a usar o mecanismo legado no cliente. Por isso, não deve ser considerada uma barreira segura para cobrança comercial.
- A solução correta exige migrar a assinatura e validação para um endpoint/serviço de servidor antes de depender do bloqueio de pagamentos como controlo de acesso. Esta versão não finge que essa migração já está feita.

## Verificações e limites

- Os smoke tests estáticos verificam a presença das principais funções, mas não substituem build TypeScript, testes de integração Supabase ou testes num telemóvel real.
- A instalação de dependências/build completo não foi possível neste ambiente sem acesso de rede estável.
- A sincronização em nuvem, a Edge Function Gemini e a geração do APK ainda exigem configuração/validação no ambiente do proprietário.
- Não publicar `.env`, chaves API, tokens nem ficheiros de assinatura. Revogar e substituir qualquer chave Gemini anteriormente exposta.
- A publicação no GitHub continua reservada para o Termux, conforme combinado.
