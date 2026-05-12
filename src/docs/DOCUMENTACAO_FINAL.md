# 📋 Afeto em Forma — Documentação Final de Desenvolvimento
> Gerado automaticamente a partir do histórico completo da conversa de projeto.
> Data: Abril 2026 · Status: Produção (single-tenant) · Próxima fase: Multi-tenant

---

## 1. 🪪 Ficha Técnica do Projeto

| Campo | Valor |
|---|---|
| **Nome do produto** | Afeto em Forma |
| **Nome original** | DosAnjos (rebrandado na Sprint de identidade) |
| **Domínio** | Micro-SaaS de pedidos artesanais com Janela de Produção Inteligente |
| **Segmento** | Padarias artesanais, marmitarias, salões de beleza |
| **Versão atual** | v5.1 — Merge: Catálogo Dinâmico + Relatórios |
| **Artefato principal** | `App.jsx` (1.615 linhas) |
| **Status** | ✅ Produção single-tenant · 🔮 Multi-tenant em roadmap |
| **Cliente piloto** | Jéssica — Padaria artesanal, São Sebastião/SP |
| **Número de WhatsApp** | 55 12 99137-0007 |
| **Supabase Project ID** | `jekzznblpekavanxcfbu` |
| **Stack frontend** | React 18 + Vite + Recharts |
| **Stack backend** | Supabase (PostgreSQL 15, Auth, RLS, Edge Functions) |
| **Fontes** | Playfair Display · Poppins · Dancing Script |
| **Paleta principal** | Bege Aconchego `#F5EBDD` · Marrom Forno `#6B3E2E` · Caramelo Doce `#C68A4D` |
| **Início do projeto** | Sprint 0 — Análise de Mercado |
| **Metodologia** | Sprints incrementais via prompts — sem repositório Git externo |

---

## 2. 🗓️ Linha do Tempo das Sprints

```
Jan 2026                                                         Abr 2026
  │                                                                  │
  ●──────●──────●──────●──────●──────●──────●──────●──────●──────●──●
  S0     S1     S2     S3     S4     S5     S6     S7     S8     S9  S10
```

| Sprint | Versão | Entregável | Funcionalidade Central | Status |
|---|---|---|---|---|
| **S0** | —       | Análise de Mercado | Pesquisa concorrencial São Sebastião/SP. Identificação da "Dor do WhatsApp". Textos estratégicos dos botões. | ✅ Concluído |
| **S1** | v1.0    | `dosanjos.jsx` | Cardápio com Fila de Produção Inteligente. Fila global (Pão max 5, Biscoito max 6). Checkout via WhatsApp. | ✅ Concluído |
| **S2** | v2.0    | `dosanjos-v2.jsx` | **Refatoração arquitetural crítica:** fila por fornada (não global). Capacidade variável por data. Mini-tabela de vagas por produto. Dashboard admin com Chart.js. | ✅ Concluído |
| **S3** | v2.1    | `dosanjos-v2.jsx` | **Patch de segurança:** validação de quantidade vs. vagas disponíveis na fornada selecionada (2ª camada de segurança no checkout). | ✅ Concluído |
| **S4** | Schema  | `dosanjos_schema.sql` | Schema SQL completo para Supabase: tabelas `clientes`, `fornadas`, `pedidos`, `itens_pedido`, VIEW `vagas_fornada`, RLS básico, índices, seed de fornadas. | ✅ Concluído |
| **S5** | v3.0    | `DosAnjos_v3.jsx` | **Integração Supabase real:** `fetchFornadas()` substitui mock. Checkout persiste no banco (upsert cliente + insert pedido + insert item). Auto-preenchimento por telefone (`onBlur`). Painel admin com pedidos reais. | ✅ Concluído |
| **S6** | —       | Auditoria RLS ao vivo | Diagnóstico de erro 401 em produção. Identificação da policy `pedidos_select_anon` ausente. Aplicação cirúrgica via MCP Supabase. | ✅ Concluído |
| **S7** | v4.0    | `DosAnjos_v4.jsx` | **Autenticação completa:** `AuthContext`, Login/Cadastro, tabela `profiles`, trigger `fn_handle_new_user`, Auth Hook JWT (`fn_custom_access_token_hook`), RLS granular com `auth.uid()` e `is_admin()`. Remoção do PIN hardcoded. | ✅ Concluído |
| **S8** | v4.2    | `App_v4_2.jsx` | **Rebranding** DosAnjos → Afeto em Forma. Nova paleta, tipografia Poppins + Dancing Script, textos revisados. **Sprint 1 — Catálogo Dinâmico:** tabela `produtos`, `fetchProdutos()`, aba admin "📦 Catálogo" com CRUD completo, modal de produto com toggle ativo/inativo. | ✅ Concluído |
| **S9** | v5.0    | `App.jsx` (Sprint 2) | **Sprint 2 — Relatórios de Vendas:** aba "📈 Relatórios", KPIs (faturamento, ticket médio, pedidos), gráfico de linha (evolução diária), barras horizontais (Top 5 produtos), tabela de fornadas, seletor de período (7d/30d/custom), exportação CSV com BOM UTF-8, debounce 500ms. | ✅ Concluído |
| **S10** | v5.1   | `App.jsx` (final) | **Merge cirúrgico** v4.2 + v5.0. Resolução de conflito de `debounceRef`. Importação de `LineChart` e `Line`. SQL da Sprint 1 (`sprint1_catalogo.sql`). Auditoria e proposta de modelagem multi-tenant. | ✅ Concluído |

---

## 3. 🏗️ Arquitetura Atual (v5.1)

### Diagrama de Blocos

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR DO CLIENTE                    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              App.jsx  (v5.1 · 1.615 linhas)         │   │
│   │                                                     │   │
│   │  ┌───────────────┐    ┌────────────────────────┐   │   │
│   │  │  AuthProvider  │    │    AfetoEmFormaApp      │   │   │
│   │  │  (Context API) │───▶│  (componente raiz)     │   │   │
│   │  └───────────────┘    └───────────┬────────────┘   │   │
│   │                                   │                 │   │
│   │         ┌─────────────────────────┼──────────────┐  │   │
│   │         │                         │              │  │   │
│   │   ┌─────▼──────┐          ┌───────▼──────┐  ┌───▼──┴─┐ │   │
│   │   │ Vista Pública│          │  Painel Admin│  │AuthScr.│ │   │
│   │   │             │          │  (isAdmin)   │  │        │ │   │
│   │   │ • Header    │          │              │  │ Login  │ │   │
│   │   │ • Fornadas  │          │ ┌──────────┐ │  │ Cadastr│ │   │
│   │   │ • Catálogo  │          │ │Fornadas  │ │  │        │ │   │
│   │   │   dinâmico  │          │ │Catálogo  │ │  └────────┘ │   │
│   │   │ • Checkout  │          │ │Pedidos   │ │             │   │
│   │   │   Modal     │          │ │Gráfico   │ │             │   │
│   │   │ • Footer    │          │ │Relatórios│ │             │   │
│   │   └──────┬──────┘          └──────┬───┘ │             │   │
│   │          │                        │      └─────────────┘   │   │
│   └──────────┼────────────────────────┼────────────────────────┘   │
│              │                        │                         │
└──────────────┼────────────────────────┼─────────────────────────┘
               │                        │
               ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Supabase   │  │  PostgreSQL  │  │   Auth Hook (JWT)    │ │
│  │    Auth    │  │     RLS      │  │ fn_custom_access_    │ │
│  │ (email/pw) │  │  (8 policies)│  │ token_hook()         │ │
│  └─────┬──────┘  └──────┬───────┘  │ → injeta user_role  │ │
│        │                │          │ → injeta tenant_id  │ │
│        └────────────────┤          └──────────────────────┘ │
│                         │                                    │
│              ┌──────────▼────────────────────┐              │
│              │      TABELAS PÚBLICAS          │              │
│              │                                │              │
│              │  profiles    fornadas           │              │
│              │  pedidos     itens_pedido       │              │
│              │  produtos    [vagas_fornada]*   │              │
│              │                                │              │
│              │  * VIEW calculada em real-time  │              │
│              └────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FUNÇÕES CUSTOMIZADAS                                  │ │
│  │  fn_set_updated_at()   · fn_handle_new_user()          │ │
│  │  fn_custom_access_token_hook()  · is_admin()           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│   INTEGRAÇÃO WHATSAPP    │
│  api.whatsapp.com/send   │
│  Mensagem formatada por  │
│  tipo de produto + dados │
│  do profile do cliente   │
└──────────────────────────┘
```

### Tabelas do Banco — Finalidades

| Tabela | Tipo | Finalidade | Linhas (prod) | RLS |
|---|---|---|---|---|
| `profiles` | Tabela | Perfis de usuários vinculados ao `auth.users`. Contém `role` (customer/admin). | 4 | ✅ |
| `fornadas` | Tabela | Datas de produção com capacidades independentes por produto. | 6 | ✅ |
| `pedidos` | Tabela | Pedidos dos clientes, vinculados a `auth.users` via `user_id`. | 9 | ✅ |
| `itens_pedido` | Tabela | Linhas de produto por pedido. Produto, nome, quantidade, preço. | 9 | ✅ |
| `produtos` | Tabela | Catálogo dinâmico gerenciado pela artesã. Emoji, categoria, preço, status. | 8 | ✅ |
| `vagas_fornada` | VIEW | Calcula vagas livres por fornada em real-time. Contagem de pedidos confirmados/pendentes. | — | ✅ |

### Políticas RLS Ativas (8 policies)

| Tabela | Policy | Operação | Guard |
|---|---|---|---|
| `fornadas` | `fornadas_select_publico` | SELECT | `ativa = TRUE` |
| `fornadas` | `fornadas_all_admin` | ALL | `is_admin()` |
| `pedidos` | `pedidos_insert_customer` | INSERT | `user_id = auth.uid()` |
| `pedidos` | `pedidos_select_proprio` | SELECT | `user_id = auth.uid()` |
| `pedidos` | `pedidos_all_admin` | ALL | `is_admin()` |
| `produtos` | `produtos_select_ativos` | SELECT | `ativo = TRUE` |
| `produtos` | `produtos_all_admin` | ALL | `is_admin()` |
| `profiles` | `profiles_select_proprio` | SELECT | `id = auth.uid()` |
| `profiles` | `profiles_update_proprio` | UPDATE | `id = auth.uid()` |
| `profiles` | `profiles_all_admin` | ALL | `is_admin()` |
| `itens_pedido` | `itens_insert_customer` | INSERT | JOIN `pedidos.user_id = auth.uid()` |
| `itens_pedido` | `itens_select_proprio` | SELECT | JOIN `pedidos.user_id = auth.uid()` |

---

## 4. ✅ Funcionalidades Implementadas

### Cardápio Público

| Funcionalidade | Detalhe | Status |
|---|---|---|
| Header com identidade visual | Logo, tagline Dancing Script, paleta Bege/Marrom/Caramelo | ✅ |
| Carrossel de fornadas | Mini-barras de progresso por produto, badge "Lotada" automático | ✅ |
| Catálogo dinâmico | Busca da tabela `produtos`, agrupado por categoria, emoji como ícone | ✅ |
| Mini-tabela de vagas por fornada | Dentro de cada card de Pão/Biscoito, em tempo real | ✅ |
| Seletor de quantidade | Input numérico com `+/-`, mínimo 1 | ✅ |
| CTA dinâmico por estado | "Garantir Vaga" / "Última Vaga" / "Lista de Espera" / "Lotada" | ✅ |
| Botão "Entrar para Encomendar" | Para usuários não logados — redireciona para AuthScreen | ✅ |
| Checkout modal (bottom sheet) | Seleção de fornada, dados do perfil auto-preenchidos, validação de vagas | ✅ |
| Integração WhatsApp | Mensagem formatada por tipo (bolo/pão/biscoito) com nome, tel, endereço | ✅ |
| Footer com identidade | Gradiente, tipografia Playfair, tagline | ✅ |

### Autenticação e Perfil

| Funcionalidade | Detalhe | Status |
|---|---|---|
| AuthProvider (Context API) | `session`, `profile`, `isAdmin`, `isLoggedIn`, helpers de auth | ✅ |
| Tela de Login | E-mail + senha, tratamento de erros em PT-BR | ✅ |
| Tela de Cadastro | Nome, WhatsApp, endereço, e-mail, senha | ✅ |
| Trigger auto-criação de profile | `fn_handle_new_user` — cria profile com `role='customer'` no signup | ✅ |
| Auth Hook JWT | `fn_custom_access_token_hook` — injeta `user_role` no token | ✅ |
| Auto-preenchimento no checkout | Dados do `profile` (nome, telefone, endereço) pré-carregados | ✅ |
| Indicador de usuário logado | Header mostra primeiro nome do perfil | ✅ |
| Botão "Sair" | `supabase.auth.signOut()` | ✅ |
| Auth gate no modal | Se sessão expirar, exibe gate interno sem fechar o modal | ✅ |

### Painel Admin

| Funcionalidade | Detalhe | Status |
|---|---|---|
| Proteção por `isAdmin` | Botão "Artesã" só aparece para `profile.role = 'admin'` | ✅ |
| **Aba Fornadas** | Lista, toggle ativo/inativo, ajuste de capacidades, adicionar nova fornada | ✅ |
| **Aba Catálogo** | Grid de produtos com status, botão Editar, Ativar/Desativar | ✅ |
| Modal de produto | Emoji preview, nome, descrição, preço, categoria, toggle ativo (CSS switch) | ✅ |
| Novo produto | Formulário em branco via `PROD_BLANK` | ✅ |
| `saveProduto()` | Upsert no Supabase (insert se `id=null`, update se `id` existe) | ✅ |
| `toggleProduto()` | Optimistic update + persist no Supabase | ✅ |
| **Aba Pedidos** | Lista com emoji de categoria, itens, data da fornada, valor, status badge | ✅ |
| Botão "↻ Atualizar" | Recarrega pedidos sem reload de página | ✅ |
| **Aba Gráfico** | BarChart empilhado: vagas ocupadas vs. livres por fornada e produto | ✅ |
| **Aba Relatórios** | KPIs + Gráfico de linha + Top 5 + Tabela por fornada + Export CSV | ✅ |
| KPIs de relatórios | Faturamento total, Ticket médio, Total de pedidos (filtro: `confirmado`) | ✅ |
| Seletor de período | 7 dias / 30 dias / Personalizado (date picker com debounce 500ms) | ✅ |
| Gráfico de linha | Evolução diária de vendas com preenchimento de dias sem venda | ✅ |
| Top 5 produtos | Barras horizontais com badge "🏆" no líder | ✅ |
| Tabela por fornada | Data, pedidos, faturamento, ticket médio por fornada | ✅ |
| Exportação CSV | Blob + BOM UTF-8, cabeçalhos PT-BR, separador `;`, download automático | ✅ |
| KPI "Produtos ativos/total" | Card no topo do admin, em tempo real | ✅ |

### Banco de Dados e Schema

| Funcionalidade | Detalhe | Status |
|---|---|---|
| Schema v3 completo | Tabelas, triggers, view, índices, RLS, seed | ✅ |
| Migration v4 (Auth) | `profiles`, `fn_handle_new_user`, auth hook, RLS granular | ✅ |
| Sprint 1 SQL | Tabela `produtos`, RLS, seed dos 7 produtos, `UNIQUE(nome, categoria)` | ✅ |
| Auditoria RLS ao vivo | Diagnóstico e correção do erro 401 em produção via MCP | ✅ |
| VIEW `vagas_fornada` | Cálculo real-time com `GREATEST(0,...)` para evitar vagas negativas | ✅ |
| Fase 3 Onboarding | RPC `fn_provision_tenant`, Edge Function `fn-provision-tenant`, criação do usuário admin e formulário público de cadastro de negócio | ✅ Fundação implementada |

### Funcionalidades Futuras

| Funcionalidade | Sprint Planejada | Status |
|---|---|---|
| Multi-tenancy (tabelas + RLS) | Fase 1–2 do roadmap | ✅ Base implementada |
| Tabela `tenants` | Fase 1 | ✅ Implementado |
| Tabela `subscriptions` (planos) | Fase 1/Fase 4 | ✅ Base implementada |
| Tabela `audit_logs` | Fase 1 | ✅ Implementado |
| Tabela `platform_metrics` | Fase 4 | 🔮 Futuro |
| Cadastro público de novo negócio | Fase 3 | ✅ Implementado |
| Edge Function `fn-provision-tenant` | Fase 3 | ✅ Implementado |
| Painel de plataforma (platform_admin) | Fase 3 | ✅ Inventário de tenants implementado |
| Integração Asaas/Stripe | Fase 4 | 🔮 Futuro |
| Subdomínio por tenant | Fase 5 | 🔮 Futuro |
| Roteamento por slug | Fase 3/Fase 5 | ✅ Base por path `/{slug}` implementada |
| Upload de logo / cores personalizadas | Fase 5 | 🔮 Futuro |
| Notificações push / e-mail | — | 🔮 Futuro |
| App mobile (PWA ou React Native) | — | 🔮 Futuro |
| API pública + webhooks | Fase 5 | 🔮 Futuro |
| Exportação completa LGPD | Fase 5 | 🔮 Futuro |

---

## 5. 📁 Versões do Artefato

| Versão | Arquivo | Linhas | Descrição | Evento Gatilho |
|---|---|---|---|---|
| v1.0 | `dosanjos.jsx` | ~600 | Cardápio + Fila de Produção (mock). Fila global. Chart.js. Admin com PIN. | Sprint 1 — Artefato inicial |
| v2.0 | `dosanjos-v2.jsx` | ~960 | **Refatoração arquitetural.** Fila por fornada, capacidade variável. Recharts. | Bug crítico: fila global não funciona por data |
| v2.1 | `dosanjos-v2.jsx` | ~990 | Patch: validação qty vs. vagas disponíveis no checkout. | Reporte de falha de validação |
| v3.0 | `DosAnjos_v3.jsx` | ~1.160 | Integração Supabase real. `fetchFornadas` substitui mock. Auto-preenchimento por telefone. | Evolução para produção real |
| v4.0 | `DosAnjos_v4.jsx` | ~1.241 | Autenticação completa. AuthContext. profiles. Auth Hook JWT. RLS granular. Remoção PIN. | Sprint Autenticação |
| **v4.2** | `App_v4_2.jsx` | ~1.225 | Rebranding → Afeto em Forma. Sprint 1: Catálogo Dinâmico (`produtos` + CRUD admin). | Rebranding + Sprint 1 |
| v5.0 | `App.jsx` (sprint2) | ~1.628 | Sprint 2: Aba Relatórios completa. LineChart. Exportação CSV. | Sprint 2 Relatórios |
| **v5.1** | `App.jsx` (final) | **1.615** | **Merge cirúrgico v4.2 + v5.0.** Resolução de conflitos. `debounceRef.current`. Versão canônica. | Merge final solicitado |
| **v5.3** | `App.jsx` (Fase 3) | ~2.100 | **Onboarding multi-tenant.** Formulário público chamando Edge Function `fn-provision-tenant`; cria usuário admin do tenant; resolução por `/{slug}`; cardápio filtrado por `tenant_id`; inserts com `tenant_id`; aba `platform_admin` para inventário de tenants. | Fase 3 iniciada |

### Artefatos SQL

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `dosanjos_schema.sql` | 429 | Schema v3 completo: 4 tabelas, view, triggers, RLS, índices, seed de fornadas |
| `dosanjos_v4_migration.sql` | 447 | Migration v4: `profiles`, drop `clientes`, auth hook, RLS granular, `is_admin()` |
| `sprint1_catalogo.sql` | ~120 | Sprint 1: tabela `produtos`, RLS (2 policies), seed dos 7 produtos, índices |
| `migracao_multitenant_fase0_fase1.sql` | ~330 | Tabelas de plataforma, `tenant_id`, constraints e view `vagas_fornada` multi-tenant |
| `migracao_multitenant_fase2.sql` | ~380 | Funções `get_tenant_id()`, `is_tenant_admin()`, `is_platform_admin()` e RLS tenant-aware |
| `migracao_multitenant_fase3_onboarding.sql` | ~180 | RPC `fn_provision_tenant`, view pública `tenant_public`, policies públicas de vitrine, grants para resolver `/{slug}` e suporte a estado/limites do tenant |

---

## 6. 🗺️ Próximos Passos — Roadmap Multi-Tenant

```
LINHA DO TEMPO DO ROADMAP
═══════════════════════════════════════════════════════════════════════

Semana  1    2    3    4    5    6    7    8    9   10   11   12
        │    │    │    │    │    │    │    │    │    │    │    │
FASE 0  ████─┤    │    │    │    │    │    │    │    │    │    │
        Preparação (homologação, pg_dump, UUID tenant)

FASE 1       ████─████─┤    │    │    │    │    │    │    │    │
             Fundação (tabela tenants, tenant_id nullable → NOT NULL)

FASE 2                  ████─┤    │    │    │    │    │    │    │
                        Isolamento (RLS com get_tenant_id(), JWT atualizado)

FASE 3                       ████─████─┤    │    │    │    │    │
                             Onboarding (cadastro tenant, Edge Function provision)

FASE 4                                  ████─████─████─████─┤    │
                                        Monetização (Asaas, métricas, limites)

FASE 5                                                        ████─████
                                                              White Label

RISCO   ░░░░  ██░░  ████  ████████  ████████████████████  ████████████
        0%    5%    20%       40%            30%               20%
```

### Detalhamento por Fase

| Fase | Duração | Ações Principais | Impacto na Jéssica |
|---|---|---|---|
| **Fase 0** — Preparação | Semana 1 | Criar projeto Supabase de homologação. Espelhar schema. Gerar UUID do tenant piloto. Instalar ambiente dev separado. | 🟢 Zero impacto |
| **Fase 1** — Fundação | Semanas 2–3 | `CREATE TABLE tenants/subscriptions/audit_logs/platform_metrics`. `ADD COLUMN tenant_id NULLABLE`. Backfill. `SET NOT NULL`. Índices compostos. | 🟢 Zero impacto (ADD COLUMN nullable é atômico) |
| **Fase 2** — Isolamento | Semana 4 | `get_tenant_id()`, `is_tenant_admin()`, `is_platform_admin()`. Atualizar Auth Hook JWT. Substituir 12 policies RLS. Corrigir constraints UNIQUE. | 🟡 Janela de manutenção: ~5 min |
| **Fase 3** — Onboarding | Semanas 5–6 | Formulário de cadastro de novo negócio. Edge Function `fn_provision_tenant`. Roteamento por slug. Painel platform_admin. | 🟢 Aditivo — não altera fluxo existente |
| **Fase 4** — Monetização | Semanas 7–10 | Integração Asaas ou Stripe. Cron diária de métricas. Limites por plano. Tela "Upgrade". Grafana Cloud. | 🟢 Aditivo |
| **Fase 5** — White Label | Mês 3+ | Subdomínio por tenant. Upload de logo. API pública. Webhooks. Exportação LGPD. Multi-idioma. | 🟢 Aditivo |

### Hotfixes Pendentes Identificados

| ID | Prioridade | Descrição | Impacto |
|---|---|---|---|
| **N1** | 🔴 Alta | **Constraint `fornadas.data UNIQUE` global** impede dois tenants com fornada no mesmo dia. Precisará de `UNIQUE(tenant_id, data)` na Fase 1. | Bloqueante para multi-tenant |
| **N2** | 🔴 Alta | **`is_admin()` é binária** — admin de qualquer tenant tem acesso a todos os dados. A função precisará incluir `AND tenant_id = get_tenant_id()`. | Bloqueante para segurança |
| **N3** | 🟡 Média | **`produtos_nome_categoria_unique`** — constraint global impede dois tenants com produto de mesmo nome. | Bloqueante para catálogo multi-tenant |
| **N4** | 🟡 Média | **`vagas_fornada` VIEW** não filtra por `tenant_id`. Em multi-tenant, a view precisará incluir `tenant_id` na cláusula GROUP BY e nas colunas retornadas. | Bloqueante para cardápio público isolado |
| **N5** | 🟢 Baixa | **`fetchRelatorios` top produtos** usa `pedidos!inner(...)` — compatibilidade com novas políticas RLS de `itens_pedido` precisa ser validada após Fase 2. | Não bloqueante — relatórios já são admin-only |

---

## 7. 📊 Métricas do Projeto

### Código

| Métrica | Valor |
|---|---|
| **Linhas totais do App.jsx (v5.1)** | 1.615 linhas |
| **Linhas de CSS inline** | ~400 linhas (bloco `const CSS`) |
| **Linhas de JSX** | ~700 linhas |
| **Linhas de lógica JS** | ~515 linhas |
| **Estados (`useState`)** | 34 declarações |
| **Funções assíncronas / `useCallback`** | 16 funções |
| **Elementos JSX com `className`** | 264 ocorrências |
| **Linhas SQL total** | ~1.000 linhas (3 arquivos) |
| **Arquivos entregues** | 8 artefatos (jsx + sql) |

### Banco de Dados (Produção)

| Métrica | Valor |
|---|---|
| **Tabelas públicas** | 5 tabelas + 1 VIEW |
| **Funções customizadas** | 5 funções |
| **Triggers ativos** | 3 triggers |
| **Políticas RLS** | 12 policies ativas |
| **Índices** | 9 índices (btree + GIN + parcial) |
| **Total de registros** | ~36 registros (banco embrionário) |
| **Tamanho total estimado** | ~400 kB |
| **Auth users cadastrados** | 4 usuários |
| **Produtos no catálogo** | 8 produtos ativos |
| **Fornadas agendadas** | 6 fornadas |

### Cobertura de Funcionalidades

```
Autenticação        ████████████████████  100%
Cardápio público    ████████████████████  100%
Fila de produção    ████████████████████  100%
Checkout WhatsApp   ████████████████████  100%
Painel admin        ████████████████████  100%
Catálogo dinâmico   ████████████████████  100%
Relatórios          ████████████████████  100%
Multi-tenancy       ░░░░░░░░░░░░░░░░░░░░    0%  ← próxima fase
Monetização         ░░░░░░░░░░░░░░░░░░░░    0%  ← roadmap Fase 4
White Label         ░░░░░░░░░░░░░░░░░░░░    0%  ← roadmap Fase 5
```

---

## 8. 🔑 Decisões Técnicas Registradas

| Decisão | Alternativa Descartada | Motivo |
|---|---|---|
| **Recharts** em vez de Chart.js | Chart.js (usado na v1.0) | Compatibilidade nativa com React; sem manipulação de `ref` para destruição de instâncias |
| **Fila por fornada** (v2) | Fila global (v1) | Fila global impedia pedidos para datas futuras quando qualquer data estava lotada — bug arquitetural crítico |
| **`GREATEST(0,...)`** na VIEW | Subtração direta | Evita vagas negativas quando artesã reduz capacidade de fornada com pedidos já confirmados |
| **`ON DELETE SET NULL`** em `pedidos.fornada_id` | CASCADE | Preserva histórico de pedidos mesmo após exclusão da fornada |
| **`ON DELETE CASCADE`** em `pedidos.user_id` | SET NULL | Implementa direito ao esquecimento (LGPD) com um único DELETE |
| **Tabelas compartilhadas + `tenant_id`** | Schema por tenant | Menor custo operacional; ideal para até ~500 tenants; compatível com Supabase free/pro |
| **`app_metadata` para `tenant_id` no JWT** | `user_metadata` | `user_metadata` pode ser alterado pelo próprio usuário — vetor de privilege escalation |
| **CSS inline (`const CSS`)** | Tailwind / styled-components | Requisito explícito do projeto: zero frameworks CSS externos; portabilidade máxima |
| **Agrupamento client-side** nos relatórios | `GROUP BY` via RPC | Evita criação de funções SQL adicionais; compatível com RLS existente; volume atual não justifica otimização |
| **BOM UTF-8 no CSV** | UTF-8 padrão | Excel no Windows requer BOM para abrir arquivos acentuados corretamente sem configuração |

---

## 9. 📞 Referência Rápida — Variáveis de Ambiente

```bash
# .env (projeto Vite)
VITE_SUPABASE_URL=https://jekzznblpekavanxcfbu.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_do_projeto>

# src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

```bash
# Número de WhatsApp configurado no App.jsx
WA_NUM = "5512991370007"

# PIN do admin (REMOVIDO na v4.0 — substituído por Supabase Auth)
# ADMIN_PIN = "2407" ← não usar mais

# Para promover usuário a admin (executar no SQL Editor):
# UPDATE profiles SET role = 'admin'
# WHERE id = (SELECT id FROM auth.users WHERE email = 'artesa@afetoemforma.com.br');
```

---

*Documentação gerada em Abril 2026 · Afeto em Forma v5.1 · São Sebastião, SP*
*"Cuidado em cada pedaço."*
