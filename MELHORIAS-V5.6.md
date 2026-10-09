# CJ Gerenciamento v5.6 — melhorias preparadas

## Incluído nesta cópia
- Assistente IA: suporte ao endpoint de streaming do Google Gemini quando o proprietário guarda uma chave no campo da IA; instruções de resposta mais profissionais e claras.
- Sessões: o alarme é agendado para 15 segundos antes do fim, com canal nativo de alta importância; removido o mecanismo que atualizava a notificação da máquina a cada segundo.
- Notificações: removidos alertas de diagnóstico intrusivos e título das notificações identificado como CJ Gerenciamento.
- Cobrança: início do teste de 7 dias ao concluir a configuração inicial, guardado com a conta; plano preparado para 3000 Kz por 30 dias e botão WhatsApp 945379003 no ecrã de bloqueio.
- Stock: bloqueia a conclusão de uma venda quando a quantidade vendida excede o stock disponível; as vendas continuam a gerar movimentos reais de saída.
- Comunidades: o ADM pode ativar uma comunidade numa sala e publicar texto, foto e link; comentários usam RPCs da nuvem após aplicar a migração.
- ADM: nova aba IDs / acessos com contas locais, contas da nuvem, histórico de acessos e botão para abrir a cobrança/libertar o acesso de uma conta remota quando a migração estiver aplicada.
- Anúncios: o rodapé rotativo aparece apenas no ecrã principal (Início).
- APK: removida a verificação que exigia um URL Supabase fixo, mantendo a verificação de que o build produziu `dist/index.html`.

## Passo obrigatório no Supabase
Execute `supabase/access-audit.sql` no SQL Editor do projeto. A migração cria tabelas e RPCs adicionais sem apagar dados existentes. Só depois disso o histórico global de acessos e os comentários partilhados funcionam na nuvem.

## Segurança da chave Gemini
Nenhuma chave foi adicionada ao código, ao ZIP ou ao Git. A chave anteriormente partilhada deve ser revogada e substituída por outra. A chave introduzida diretamente no cliente pode ser extraída por quem controla o dispositivo; para uma chave única partilhada por todos, é necessário um proxy de servidor com autenticação e limites de utilização.

## Validação feita nesta cópia
- Verificação de sintaxe TypeScript/TSX nos ficheiros alterados: passou.
- `npm run build`: não passou porque o ambiente não tinha Vite instalado (`vite: not found`).
- `npm ci`: a instalação não terminou; a tentativa offline confirmou que falta um pacote no cache. Portanto, não se declara build final nem APK gerado.
- A migração SQL não foi executada no Supabase, e os fluxos reais de login, pagamento, notificações entre telemóveis e sincronização não foram testados contra a conta online.

## Limites que continuam a exigir configuração externa
- O alerta da sessão é agendado localmente no Android e pode tocar/vibrar pela notificação do sistema com a app fechada. Um alarme sonoro contínuo garantido em todos os modos de economia de bateria exigiria um serviço Android nativo dedicado.
- Avisos de publicações do ADM são criados e sincronizados, mas notificações remotas imediatas com a app suspensa exigem configurar Firebase Cloud Messaging (FCM) e o envio seguro no servidor. Sem as credenciais FCM, o telefone recebe o aviso quando a app sincroniza ou volta ao primeiro plano.
- O teste e o bloqueio são aplicados na aplicação e a cobrança pode ser alterada pelo ADM remoto após a migração. Para tornar o bloqueio resistente a APKs modificados, a autorização também deve ser validada em cada operação do servidor.
- As contas antigas com a configuração já concluída não recebem um novo teste automaticamente, para não reiniciar nem substituir cobranças existentes. O teste de 7 dias é iniciado na configuração inicial de uma conta.
