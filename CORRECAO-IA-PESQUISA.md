# Correção da IA — pesquisa atual e fontes verificáveis

Esta versão corrige o encaminhamento das perguntas de pesquisa da IA do CJ Gerenciamento.

- A deteção de pesquisa ocorre antes das respostas exatas da memória local.
- Perguntas sobre notícias, pesquisa, Google, internet, datas atuais e informação recente não são respondidas apenas pela memória local.
- Quando a pesquisa falha, a aplicação informa que não conseguiu confirmar fontes, em vez de apresentar conselhos locais como se fossem resposta.
- A Edge Function deteta pesquisa também no servidor, descarta o histórico anterior e usa um prompt de pesquisa sem dados privados da Game House.
- A pesquisa só é aceite como confirmada quando a resposta inclui fontes devolvidas pelo grounding do Google Search.

## Importante

A alteração local neste ZIP ainda precisa de ser compilada e testada. A Edge Function publicada no Supabase é independente do código guardado no ZIP; atualizar este ZIP não publica automaticamente alterações no Supabase, GitHub ou Vercel.
