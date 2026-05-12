---
name: gerar-relatorio
description: "Skill 4: gerar-relatorio — Compila atualizações do Diário de Bordo do projeto Afeto em Forma no formato padronizado de markdown. Use esta skill SEMPRE que o usuário quiser registrar o que foi feito em uma sessão, documentar uma decisão técnica, criar uma entrada de sprint, resumir o estado do projeto, ou preparar um relatório para compartilhar com a equipe. Garante: estrutura consistente com emojis padronizados, campos obrigatórios (data, evento, impacto, próximos passos), seção de decisões técnicas e aprendizados. Triggers: 'gerar relatório', 'atualizar diário', 'documentar sessão', 'registrar sprint', 'resumo do que foi feito', 'entrada no diário', 'relatório de progresso'."
---

# Skill: gerar-relatorio

## Objetivo
Gerar entradas padronizadas do Diário de Bordo do projeto Afeto em Forma, garantindo consistência entre atualizações feitas por diferentes agentes ou em diferentes sessões.

## Contexto do Projeto
- **Nome:** Afeto em Forma (ex-DosAnjos)
- **Cliente piloto:** Jéssica — Padaria artesanal, São Sebastião/SP
- **Stack:** React 18 + Vite + Supabase (PostgreSQL 17.6, Auth, RLS)
- **Versão atual:** v5.2 (multi-tenant Fases 0–2 concluídas)
- **Convenção de emojis:**
  - 🔥 Fornadas / produção / forno
  - 🍞 Funcionalidade de pão/produto
  - 🌐 Multi-tenant / plataforma / infra
  - 🫡 Concluído / entregue / validado
  - 🐛 Bug corrigido
  - ⚠️ Atenção / pendência / risco
  - 🔮 Roadmap / futuro
  - 🏗️ Arquitetura / schema
  - 📊 Relatórios / métricas
  - 🔐 Segurança / RLS / auth

## Protocolo de Execução

### Passo 1 — Coletar informações da sessão
Antes de gerar, identificar no contexto da conversa:
- O que foi feito (funcionalidades, fixes, migrações)
- Decisões técnicas tomadas e alternativas descartadas
- Erros encontrados e como foram resolvidos
- O que ficou pendente
- Próximos passos recomendados

Se o usuário não forneceu todas as informações, perguntar apenas o essencial:
> "Qual foi o principal resultado desta sessão?"

### Passo 2 — Formato obrigatório

```markdown
---
## 📅 [DATA] — [TÍTULO RESUMIDO DA SESSÃO]
**Hora:** HH:MM (horário de Brasília)
**Sprint/Fase:** [ex: Fase 2 | Sprint Hotfix | Auditoria RLS]
**Responsável:** [Claude / Usuário / Dupla]

### 🎯 O que foi feito
[Lista concisa de entregas, máximo 5 itens]
- ✅ [entrega 1]
- ✅ [entrega 2]
- 🐛 [bug corrigido]

### 📊 Estado do Banco (se alterado)
| Tabela/Objeto | Antes | Depois |
|---|---|---|
| [objeto] | [estado] | [estado] |

### 🔑 Decisões Técnicas
> **[Título da decisão]**
> - **Escolha:** [o que foi decidido]
> - **Alternativa descartada:** [o que foi considerado e rejeitado]
> - **Motivo:** [justificativa técnica]

### ⚠️ Pendências e Riscos
- [ ] [pendência 1] — [quem/quando]
- ⚠️ [risco identificado]

### 🔮 Próximos Passos
1. [ação concreta com verbo no infinitivo]
2. [ação concreta]
3. [ação concreta]

### 💡 Aprendizados
> [Insight técnico ou de produto que vale registrar para o futuro]

---
```

### Passo 3 — Regras de estilo

| Regra | Detalhe |
|---|---|
| **Tom técnico mas humano** | Não robótico, não coloquial demais |
| **Verbos no passado** | "foi criado", "foi corrigido", "identificamos" |
| **Números concretos** | "24 policies auditadas", "5 tabelas atualizadas", "1.615 linhas" |
| **Sem jargão sem explicação** | Se usar RLS, FK, UUID — explicar em parênteses na primeira vez |
| **Emojis consistentes** | Usar apenas os da tabela acima |
| **Máximo 1 página A4** | Relatório denso é relatório ignorado |

### Passo 4 — Seções opcionais (incluir apenas se relevante)

**Métricas de banco** (incluir quando houve migração):
```markdown
### 📈 Métricas Pós-Sessão
- Tabelas: X → Y
- Policies RLS: X → Y
- Registros: X total (Y tenant piloto)
- Tamanho do banco: ~X kB
```

**Citação de impacto** (incluir quando há mudança para o usuário final):
```markdown
### 🍞 Impacto para a Jéssica
> [Descrever em linguagem não-técnica o que mudou para a artesã]
```

**Alerta de ação manual** (incluir quando algo precisa ser feito fora do código):
```markdown
### 🚨 Ação Manual Necessária
- [ ] [Descrição do que precisa ser feito manualmente — ex: refresh de token, update de profiles]
```

## Exemplo de Output Completo

```markdown
---
## 📅 01/05/2026 — Fase 2: Isolamento RLS Multi-Tenant

**Hora:** 14:30 (horário de Brasília)
**Sprint/Fase:** Fase 2 — Isolamento de Dados
**Responsável:** Claude + Professor

### 🎯 O que foi feito
- ✅ Criadas 3 funções de segurança: `get_tenant_id()`, `is_tenant_admin()`, `is_platform_admin()`
- ✅ Atualizado `fn_custom_access_token_hook` para injetar `tenant_id` no `app_metadata` do JWT
- ✅ Substituídas 24 policies RLS globais por versões com isolamento por tenant
- 🐛 Identificadas e documentadas 2 policies legadas sem `tenant_id` (`fornadas_select_anon`, `produtos_select_anon`)
- ✅ App.jsx atualizado com comentários `FASE 2 / RLS` nas funções de fetch

### 📊 Estado do Banco
| Objeto | Antes | Depois |
|---|---|---|
| Policies RLS | 12 globais | 24 tenant-aware |
| `fn_custom_access_token_hook` | injeta `user_role` | injeta `user_role` + `tenant_id` |

### 🔑 Decisões Técnicas
> **`app_metadata` vs `user_metadata` para tenant_id**
> - **Escolha:** `app_metadata`
> - **Alternativa descartada:** `user_metadata`
> - **Motivo:** `user_metadata` pode ser alterado pelo próprio usuário via API — vetor de privilege escalation

### ⚠️ Pendências e Riscos
- [ ] Usuário admin (Jéssica) precisa fazer logout → login para receber JWT com `tenant_id`
- ⚠️ `fornadas_select_anon` e `produtos_select_anon` ainda existem sem filtro de tenant

### 🔮 Próximos Passos
1. Executar Fase 3: formulário de onboarding de novos tenants
2. Criar Edge Function `fn_provision_tenant`
3. Revogar sessões antigas via Supabase Dashboard

### 💡 Aprendizados
> O PostgREST só resolve `profiles(nome,telefone)` via join automático se a FK aponta para `public.profiles`. Quando a FK aponta para `auth.users` (schema interno), usar a notação explícita `profiles!user_id(nome,telefone)`.

### 🚨 Ação Manual Necessária
- [ ] Revogar sessões dos usuários em Supabase Dashboard → Auth → Users → Revoke sessions
---
```
