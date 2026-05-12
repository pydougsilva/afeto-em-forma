---
name: auditar-politicas-rls
description: "Skill 3: auditar-politicas-rls — Audita políticas Row Level Security diretamente no Supabase via MCP para o projeto Afeto em Forma. Use esta skill SEMPRE que o usuário mencionar RLS, políticas de segurança, isolamento de dados entre tenants, erro 401/403, permissão negada, ou quiser verificar o estado das policies antes de uma migração. A skill NUNCA aplica alterações — apenas audita e sugere. Garante: inventário completo via pg_policies, identificação de policies sem tenant_id, identificação de is_admin() global legado, relatório ANTES → DEPOIS pronto para revisar. Triggers: 'auditar RLS', 'verificar policies', 'políticas de segurança', 'isolamento tenant', 'erro 401', 'permissão negada', 'rls', 'row level security'."
---

# Skill: auditar-politicas-rls

## Objetivo
Auditar todas as políticas RLS do banco Supabase do Afeto em Forma **sem alterar nada**. Produzir um relatório estruturado com diagnóstico e sugestões prontas para revisão humana.

## Contexto do Projeto
- **Projeto Supabase:** `jekzznblpekavanxcfbu`
- **Fase atual:** Multi-tenant ativo (Fases 0–2 concluídas)
- **Funções de segurança disponíveis:** `get_tenant_id()`, `is_tenant_admin()`, `is_platform_admin()`
- **Função legada:** `is_admin()` — binária, sem contexto de tenant, deve ser substituída
- **Regra de ouro:** toda policy de tabela com `tenant_id` deve incluir `tenant_id = get_tenant_id()`

## Protocolo de Execução

### Passo 1 — Coletar estado atual via MCP
Executar no Supabase (somente leitura):

```sql
-- Query 1: inventário completo de policies
SELECT
  tablename,
  policyname,
  roles::text,
  cmd,
  COALESCE(qual, 'n/a')             AS using_expr,
  COALESCE(with_check::text, 'n/a') AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Query 2: funções de segurança existentes
SELECT proname, prosecdef, pg_get_function_result(oid) AS retorno
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND proname IN ('is_admin','is_tenant_admin','is_platform_admin','get_tenant_id')
ORDER BY proname;

-- Query 3: tabelas com tenant_id (confirmar escopo)
SELECT table_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'tenant_id'
ORDER BY table_name;
```

### Passo 2 — Classificar cada policy

Para cada policy encontrada, classificar em uma de 4 categorias:

| Categoria | Critério | Ação sugerida |
|---|---|---|
| ✅ **Segura** | Usa `get_tenant_id()` ou `is_platform_admin()` | Nenhuma |
| ⚠️ **Parcial** | Usa `auth.uid()` sem `tenant_id` | Adicionar filtro de tenant |
| 🔴 **Vulnerável** | Usa `is_admin()` global sem tenant | Substituir urgente |
| 🚫 **Bloqueante** | `USING (false)` ou similar | Verificar se intencional |

### Passo 3 — Formato do relatório

```
## 🔍 Auditoria RLS — Afeto em Forma
Data: [data]
Projeto: jekzznblpekavanxcfbu
Total de policies: X
✅ Seguras: X | ⚠️ Parciais: X | 🔴 Vulneráveis: X | 🚫 Bloqueantes: X

---
### TABELA: [nome]

| Policy | Operação | Roles | Status | Diagnóstico |
|--------|----------|-------|--------|-------------|
| policy_name | SELECT | anon | 🔴 Vulnerável | Usa is_admin() global |

**ANTES:**
```sql
CREATE POLICY "nome" ON tabela FOR SELECT TO anon USING (is_admin());
```

**DEPOIS (sugestão — NÃO aplicar sem revisão):**
```sql
DROP POLICY IF EXISTS "nome" ON tabela;
CREATE POLICY "nome"
  ON tabela FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_id() AND is_tenant_admin());
```

---
### ⚠️ ATENÇÃO: Policies que requerem ação imediata
[lista das 🔴 vulneráveis]

### 📋 Script de correção sugerido
[SQL completo idempotente — para revisar e aplicar manualmente]
```

### Passo 4 — Verificações especiais

Além das policies, verificar:

1. **`fornadas_select_anon`** — existe? Expõe fornadas sem filtro de tenant?
2. **`produtos_select_anon`** — existe? Expõe catálogo sem filtro de tenant?
3. **`pedidos_select_anon`** — existe? Foi criada como fix temporário de 401?
4. **`is_admin()` legada** — ainda referenciada em alguma policy ativa?

## Regras Invioláveis

| Regra | Detalhe |
|---|---|
| **NUNCA executar DROP/ALTER/CREATE** | Apenas SELECT e consultas de leitura |
| **NUNCA aplicar o script sugerido** | O usuário deve revisar e aplicar manualmente |
| **Sempre mostrar ANTES e DEPOIS** | Para cada policy que precisa de correção |
| **Sempre verificar impacto no front-end** | Mudança de policy pode quebrar `fetchFornadas` etc. |
| **Sinalizar dependências** | Se a policy usa `get_tenant_id()`, o JWT precisa ter `tenant_id` |

## Achados Conhecidos do Projeto

Com base no histórico da conversa, os seguintes problemas já foram identificados e corrigidos nas Fases 0–2. Se reaparecerem, indicar regressão:

- `fornadas_select_publico` → substituída por `fornadas_select_tenant` (Fase 2)
- `produtos_select_ativos` → substituída por `produtos_select_tenant` (Fase 2)
- `pedidos_all_admin` com `is_admin()` → substituída por `pedidos_manage_tenant_admin` (Fase 2)
- `pedidos_select_anon` → removida (foi criada como fix temporário de 401, Fase 2)

Achados que **ainda existem** e requerem atenção:
- `fornadas_select_anon` — policy legada identificada no banco atual (ativa=true sem tenant_id)
- `produtos_select_anon` — idem
- `is_admin()` — função ainda existe no banco (legada), não referenciada em policies ativas
