# CJ Gerenciamento v5.8 — notas de atualização

Esta versão parte da cópia v5.7 e mantém o guia contextual, os relatórios PDF e o proxy Gemini já existentes.

## Melhoria de privacidade

Quando uma pergunta ativa a pesquisa externa Google/Gemini, a aplicação agora:

- não inclui no prompt os números financeiros, nomes, funcionários, reservas ou memórias administrativas da Game House;
- envia apenas a pergunta atual, sem o histórico anterior da conversa;
- mantém o contexto privado disponível para respostas locais e perguntas normais da gestão, quando necessário.

## Estado real

- Verificação estática de smoke: 8/8 verificações passaram nesta cópia.
- O build completo não foi confirmado porque a instalação de dependências não ficou disponível neste ambiente.
- A Edge Function Gemini ainda precisa de ser publicada/configurada no Supabase.
- A sincronização precisa de ser confirmada contra o projeto Supabase real.
- A partilha de PDF usa a partilha de ficheiros suportada pelo dispositivo e um fallback manual; não garante envio automático pelo WhatsApp.
- A publicação no GitHub e o APK ainda não foram feitos. A publicação será realizada depois pelo Termux, como combinado.
- Antes de considerar o produto pronto para uso comercial, a validação dos códigos offline de ativação deve deixar de depender de um segredo embutido no frontend. Não colocar chaves privadas em variáveis `VITE_`.

## Configuração segura do Gemini

1. Revogar qualquer chave Gemini que tenha sido exposta em conversas, capturas de ecrã, ficheiros ou commits.
2. Criar uma chave nova e guardá-la apenas como segredo do Supabase (`GEMINI_API_KEY`).
3. Publicar a função `cj-gemini` e configurar `VITE_GEMINI_PROXY_URL` no alojamento.
4. Reconstruir a aplicação depois de configurar as variáveis públicas do Supabase e o URL da função.
