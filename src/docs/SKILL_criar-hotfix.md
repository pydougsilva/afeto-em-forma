---
name: criar-hotfix
description: "Skill 2: criar-hotfix — Gera patches cirúrgicos para correções no App.jsx do projeto Afeto em Forma (1.615+ linhas). Use esta skill SEMPRE que o usuário pedir para corrigir um bug, ajustar uma validação, adicionar um campo, ou alterar qualquer trecho do componente React — especialmente quando a mudança afeta menos de 50 linhas. NUNCA gere o arquivo completo para correções pontuais. A skill garante: patch mínimo com linha de referência exata, comentário explicativo da correção, compatibilidade com o schema Supabase atual (tenant_id, profiles, fornadas, pedidos, itens_pedido, produtos), e economia de 30-45k tokens por correção. Triggers: 'corrija o bug', 'adicione validação', 'ajuste o handleCheckout', 'o campo X não aparece', 'patch', 'hotfix', 'trecho alterado'."
---

# Skill: criar-hotfix

## Objetivo
Gerar **apenas o trecho alterado** de `App.jsx` para correções cirúrgicas, nunca o arquivo completo. Uma correção de 10 linhas não deve custar 35-45k tokens.

## Contexto do Projeto
- **Arquivo alvo:** `App.jsx` (AfetoEmForma v5.2, ~1.638 linhas)
- **Stack:** React 18 + Supabase + Recharts
- **Banco:** PostgreSQL 17.6 com RLS multi-tenant ativo
- **Funções RLS:** `get_tenant_id()`, `is_tenant_admin()`, `is_platform_admin()`
- **Import Supabase:** `import { supabase } from "./lib/supabaseClient"`

## Protocolo de Execução

### Passo 1 — Localizar antes de alterar
Antes de gerar qualquer patch, identifique:
- O número de linha exato da função ou bloco afetado (use `grep -n` ou busca no contexto)
- O contexto de 3 linhas acima e abaixo do ponto de alteração
- Se a correção envolve o banco, confirmar o schema atual via MCP Supabase

### Passo 2 — Diagnóstico documentado
Sempre declare explicitamente:
```
CAUSA-RAIZ: [descrição técnica precisa]
IMPACTO: [o que o bug causa ao usuário]
CORREÇÃO: [o que será alterado e por quê]
```

### Passo 3 — Formato do patch

```
// ─── HOTFIX: [descrição em uma linha] ───────────────────────
// Arquivo: App.jsx
// Referência: linha ~XXX (função/bloco: NomeDaFuncao)
// Substituir o bloco abaixo pelo patch:

// ── ANTES ──────────────────────────────────────────────────
[trecho original exato — copie do arquivo, nunca invente]

// ── DEPOIS ─────────────────────────────────────────────────
[trecho corrigido com comentário inline explicando a mudança]
```

### Passo 4 — Verificação pós-patch
Ao final, declarar:
- Quantas linhas foram alteradas/adicionadas/removidas
- Se há impacto em outras funções ou states
- Se é necessário forçar refresh de token JWT (para mudanças de auth)
- Se é necessário executar SQL no banco

## Regras Invioláveis

| Regra | Detalhe |
|---|---|
| **Nunca gerar o arquivo completo** | Se a mudança for > 100 linhas, perguntar antes |
| **Sempre indicar linha de referência** | "linha ~XXX" baseado em grep ou contexto |
| **Compatibilidade RLS** | Queries ao Supabase devem respeitar `tenant_id = get_tenant_id()` |
| **Join profiles** | Usar `profiles!user_id(nome,telefone)` — não `profiles(nome,telefone)` |
| **Não alterar CSS** | A menos que explicitamente solicitado |
| **Não alterar AuthProvider** | A menos que o bug esteja lá |
| **Comentário obrigatório** | Todo patch deve ter `// FIX:` ou `// HOTFIX:` inline |

## Casos de Uso Cobertos

- Bug de exibição (campo não aparece, valor errado)
- Validação faltando (ex: 24h de antecedência para bolos)
- Query Supabase incorreta (join errado, filtro ausente)
- State não inicializado corretamente
- Handler assíncrono sem try/catch
- Texto ou label incorreto no JSX

## Casos que NÃO usam esta skill

- Adicionar uma aba inteira ao admin → usar `gerar-script-migracao` + patch grande
- Rebranding completo → entrega do arquivo completo é aceitável
- Sprint novo com múltiplas features → entrega incremental por seção

## Exemplo de Output

```jsx
// ─── HOTFIX: validação 24h para pedidos de bolo ─────────────
// Arquivo: App.jsx
// Referência: linha ~720 (função: handleCheckout)
// Substituir APENAS o bloco de validação de bolo:

// ── ANTES ──────────────────────────────────────────────────
if (modal.prod.tipo !== "bolo" && !selFornada) {
  setErr("Selecione uma data de fornada."); return;
}

// ── DEPOIS ─────────────────────────────────────────────────
if (modal.prod.tipo !== "bolo" && !selFornada) {
  setErr("Selecione uma data de fornada."); return;
}
// FIX: valida antecedência mínima de 24h para bolos
if (modal.prod.tipo === "bolo" && selFornada) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const dataPedido = new Date(selFornada + "T00:00:00");
  if (dataPedido < amanha) {
    setErr("Bolos precisam de no mínimo 24h de antecedência. Escolha a partir de amanhã.");
    return;
  }
}

// Linhas alteradas: +8 adicionadas, 0 removidas
// Impacto: apenas handleCheckout, nenhum state adicional necessário
// SQL necessário: não
```
