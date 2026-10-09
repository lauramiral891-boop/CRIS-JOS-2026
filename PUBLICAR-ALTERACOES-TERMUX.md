# Publicar as alterações da CJ Gerenciamento pelo Termux

**Não usar `git push --force`. Não apagar a pasta atual antes de confirmar a cópia de segurança.**

## 1. Entrar na pasta do projeto

Use a pasta onde está a cópia atualizada v5.9. Se estiver noutra pasta, ajuste o caminho.

```bash
cd ~/cj-gerenciamento-v5_5/cj
```

## 2. Confirmar o estado antes de alterar o GitHub

```bash
git status --short --branch
git remote -v
git fetch origin
git log -1 --oneline
```

Se esta pasta não tiver as alterações v5.9, não publicar a partir dela. Primeiro copiar/extraír a versão v5.8 para uma pasta nova e comparar os ficheiros.

## 3. Criar uma branch de trabalho

```bash
git switch -c atualizacao-cj-v5-9
```

Se a branch já existir, usar `git switch atualizacao-cj-v5-9` em vez de a criar novamente.

## 4. Rever, guardar e publicar

```bash
git status --short
git add src/lib/assistant.ts src/components/AssistantView.tsx scripts/smoke-check.mjs package.json package-lock.json .env.example LEIA-ME-ADM.md PUBLICAR-ONLINE-E-LOJAS.md SUPABASE-ATIVAR.md MELHORIAS-V5.8.md MELHORIAS-V5.9.md MELHORIAS-V5.7-GUIA-PDF-GEMINI.md PUBLICAR-ALTERACOES-TERMUX.md
git diff --cached --stat
git commit -m "Documenta limites de licenciamento e endurece v5.9"
git push -u origin atualizacao-cj-v5-9
```

Depois, abrir o GitHub e criar um Pull Request da branch `atualizacao-cj-v5-9` para `main`. Rever os ficheiros antes de fazer merge. Não incluir `.env`, chaves API, tokens, `node_modules` nem ficheiros de assinatura do APK.

> Estes comandos são para a pasta que contém as alterações v5.8. Não executar `git add`/`git commit` antes de confirmar que os ficheiros são realmente desta versão.
