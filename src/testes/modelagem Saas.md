Iniciando a pesquisa de mercado e a auditoria simultâneas:Agora a auditoria real do banco:Tenho todos os dados. Compondo o relatório completo:

---

# 📊 Resumo Executivo da Pesquisa de Mercado

## Estratégia de Multi-Tenancy para Supabase

Existem três abordagens consolidadas, e a escolha certa para o estágio atual do Afeto em Forma é clara:

| Estratégia | Isolamento | Custo Operacional | Complexidade | Indicado para |
|---|---|---|---|---|
| **Tabelas compartilhadas + `tenant_id`** | RLS por linha | Baixo — 1 projeto | Baixa | ✅ **Estágio inicial (até ~500 tenants)** |
| Schema por tenant | Médio — schemas separados | Médio | Alta | Crescimento + compliance |
| Banco por tenant | Máximo | Alto — N projetos Supabase | Muito alta | Enterprise / HIPAA |

O Supabase suporta dois padrões primários de multi-tenancy: tabelas compartilhadas com coluna `tenant_id` segregando dados via RLS, e schemas dedicados por tenant dentro da mesma instância de banco de dados. Para um SaaS em estágio inicial, introduzir uma coluna `tenant_id` nas tabelas é a abordagem recomendada — ela reduz a necessidade de filtros complexos na camada de aplicação, com a RLS fazendo o trabalho de isolamento diretamente no banco.

**Decisão recomendada para o Afeto em Forma:** tabelas compartilhadas com `tenant_id`, armazenando o `tenant_id` no `app_metadata` do usuário autenticado — e não no `user_metadata`, que pode ser modificado pelo próprio usuário. Isso permite que as RLS policies leiam o `tenant_id` diretamente do JWT, sem roundtrip adicional ao banco a cada query.

## Métricas de Plataforma Essenciais

As métricas fundamentais de SaaS são MRR (receita recorrente mensal), ARR, ARPA (receita média por conta), LTV e churn rate. Para o Afeto em Forma como plataforma, as métricas específicas de prioridade seriam:

1. **MRR por plano** — quantos tenants em cada tier (free/pro/enterprise)
2. **Churn mensal** — percentual de tenants que cancelam
3. **Pedidos processados por tenant/mês** — indicador de engajamento e consumo
4. **Consumo de banco por tenant** — previne abuso e orienta precificação por uso

## Observabilidade

Todo projeto Supabase expõe um endpoint de Métricas compatível com Prometheus que disponibiliza ~200 séries de performance e saúde do Postgres — incluindo CPU, IO, WAL, conexões e estatísticas de query. O Datadog suporta nativamente a integração com Supabase via OpenMetrics a partir do Agent 7.62.0, sem instalação adicional. O stack recomendado para o Afeto em Forma: **Supabase Metrics API → Grafana Cloud** (gratuito até 10k métricas/mês) na fase inicial, evoluindo para Datadog quando houver mais de 10 tenants ativos.

---

# 🔍 Auditoria do Banco Atual

## Inventário Completo de Tabelas

| Tabela | Linhas reais | Tamanho total | RLS | Tem `tenant_id`? |
|---|---|---|---|---|
| `fornadas` | **6** | 112 kB | ✅ Ativo | ❌ Ausente |
| `pedidos` | **9** | 80 kB | ✅ Ativo | ❌ Ausente |
| `produtos` | **8** | 80 kB | ✅ Ativo | ❌ Ausente |
| `itens_pedido` | **9** | 64 kB | ✅ Ativo | ❌ Ausente |
| `profiles` | **4** | 64 kB | ✅ Ativo | ❌ Ausente |

> **Total do banco:** ~400 kB — volume embrionário, janela perfeita para migração sem custo de performance.

## Mapa de Colunas — Diagnóstico Detalhado

### `profiles`
```
id (UUID PK → auth.users), nome, telefone, endereco,
preferencias, tags[], role (customer|admin),
created_at, updated_at
```
⚠️ **Lacuna crítica:** `role` só tem dois valores possíveis (`customer`/`admin`). Numa plataforma multi-tenant, haverá pelo menos 3 roles: `platform_admin` (você), `tenant_admin` (a Jéssica de cada negócio) e `customer` (os clientes de cada negócio).

### `fornadas`
```
id, data (UNIQUE), capacidade_pao, capacidade_biscoito,
ativa, observacao, created_at, updated_at
```
⚠️ **Lacuna crítica:** `UNIQUE` em `data` impede que dois tenants tenham fornada no mesmo dia. Precisará virar `UNIQUE (data, tenant_id)`.

### `pedidos`
```
id, fornada_id (FK), data_agendada, status, valor_total,
created_at, user_id (FK → auth.users)
```
✅ Já tem `user_id` para isolamento de cliente. ❌ Sem `tenant_id`.

### `produtos`
```
id, nome, descricao, preco, categoria, emoji, ativo,
created_at, updated_at
```
⚠️ `UNIQUE (nome, categoria)` precisará de `tenant_id` incluído para que dois tenants possam ter um produto com o mesmo nome.

### `itens_pedido`
```
id, pedido_id (FK), produto, nome_produto,
quantidade, preco_unitario
```
✅ Isolamento derivado via `pedido_id → pedidos.user_id`. Mas sem `tenant_id` direto — joins ficam mais lentos conforme crescem.

## Auditoria das Políticas RLS Atuais

| Tabela | Policy | Roles | Tipo | Status para Multi-Tenant |
|---|---|---|---|---|
| `fornadas` | `fornadas_select_publico` | anon, authenticated | SELECT `ativa=true` | 🔴 Vaza dados entre tenants |
| `fornadas` | `fornadas_all_admin` | authenticated | ALL `is_admin()` | 🔴 Admin de tenant A vê fornadas do tenant B |
| `pedidos` | `pedidos_insert_customer` | authenticated | INSERT `user_id=uid()` | 🟡 Isolamento parcial (por usuário, não por tenant) |
| `pedidos` | `pedidos_select_proprio` | authenticated | SELECT `user_id=uid()` | 🟡 Isolamento parcial |
| `pedidos` | `pedidos_all_admin` | authenticated | ALL `is_admin()` | 🔴 Admin global vê pedidos de todos os tenants |
| `produtos` | `produtos_select_ativos` | anon, authenticated | SELECT `ativo=true` | 🔴 Vaza catálogo entre tenants |
| `produtos` | `produtos_all_admin` | authenticated | ALL `is_admin()` | 🔴 Admin de um tenant edita produtos de outro |
| `profiles` | `profiles_select_proprio` | authenticated | SELECT `id=uid()` | ✅ Seguro para multi-tenant |
| `profiles` | `profiles_update_proprio` | authenticated | UPDATE `id=uid()` | ✅ Seguro para multi-tenant |
| `profiles` | `profiles_all_admin` | authenticated | ALL `is_admin()` | 🔴 Admin global |
| `itens_pedido` | `itens_insert_customer` | authenticated | INSERT via join | 🟡 Isolamento indireto |
| `itens_pedido` | `itens_select_proprio` | authenticated | SELECT via join | 🟡 Isolamento indireto |

## Funções Customizadas Inventariadas

| Função | Tipo | Security | Impacto Multi-Tenant |
|---|---|---|---|
| `is_admin()` | Função | DEFINER | 🔴 Binária — não distingue admin de qual tenant |
| `fn_handle_new_user()` | Trigger | DEFINER | 🟡 Cria profile mas não atribui `tenant_id` |
| `fn_custom_access_token_hook()` | Auth Hook | DEFINER | 🟡 Injeta `user_role` mas não `tenant_id` |
| `fn_set_updated_at()` | Trigger | INVOKER | ✅ Agnóstico de tenant |
| `rls_auto_enable()` | Event Trigger | DEFINER | ✅ Boa prática mantida |

## Índices — Estado Atual

| Índice | Tabela | Tipo | Pronto para Multi-Tenant? |
|---|---|---|---|
| `idx_pedidos_user_id` | pedidos | btree | 🟡 Precisa de composto `(tenant_id, user_id)` |
| `idx_pedidos_status` | pedidos | btree | 🔴 Precisará de `(tenant_id, status)` |
| `idx_pedidos_fornada_id` | pedidos | btree | 🟡 OK por ora |
| `idx_produtos_ativo` | produtos | btree parcial | 🔴 Precisará de `(tenant_id, ativo)` |
| `fornadas_data_unique` | fornadas | UNIQUE btree | 🔴 Precisará virar `UNIQUE(tenant_id, data)` |
| `produtos_nome_categoria_unique` | produtos | UNIQUE btree | 🔴 Precisará de `(tenant_id, nome, categoria)` |

---

# 🏗️ Proposta de Modelagem

## Tabela `tenants`

```sql
CREATE TABLE tenants (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade do negócio
  slug         TEXT        NOT NULL UNIQUE, -- URL amigável: "dosanjos", "padaria-silva"
  nome         TEXT        NOT NULL,
  descricao    TEXT,
  logo_url     TEXT,
  cor_primaria TEXT        DEFAULT '#6B3E2E',   -- personalização white label
  cor_acento   TEXT        DEFAULT '#C68A4D',

  -- Contato do responsável
  email_admin  TEXT        NOT NULL UNIQUE,
  telefone     TEXT,
  cidade       TEXT,
  estado       TEXT        DEFAULT 'SP',

  -- Configurações operacionais
  whatsapp_num TEXT,                            -- número WA do negócio (ex: 5512991370007)
  timezone     TEXT        DEFAULT 'America/Sao_Paulo',
  moeda        TEXT        DEFAULT 'BRL',

  -- Plano e status
  plano        TEXT        NOT NULL DEFAULT 'free'
                           CHECK (plano IN ('free', 'pro', 'enterprise')),
  status       TEXT        NOT NULL DEFAULT 'trial'
                           CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,

  -- Auditoria
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  -- Limites de plano (denormalizados para RLS performático)
  max_fornadas_mes  INTEGER DEFAULT 4,
  max_produtos      INTEGER DEFAULT 20,
  max_admins        INTEGER DEFAULT 1
);

COMMENT ON TABLE  tenants             IS 'Negócios cadastrados na plataforma Afeto em Forma.';
COMMENT ON COLUMN tenants.slug        IS 'Identificador único de URL. Ex: dosanjos → afetoemforma.com/dosanjos';
COMMENT ON COLUMN tenants.plano       IS 'free: até 4 fornadas/mês, 20 produtos | pro: ilimitado + relatórios | enterprise: white label';
```

## Tabela `subscriptions`

```sql
CREATE TABLE subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  plano           TEXT        NOT NULL CHECK (plano IN ('free', 'pro', 'enterprise')),
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),

  -- Cobrança
  preco_mensal    DECIMAL(10,2),
  moeda           TEXT        DEFAULT 'BRL',
  ciclo           TEXT        DEFAULT 'monthly' CHECK (ciclo IN ('monthly', 'annual')),

  -- Datas de ciclo
  periodo_inicio  DATE        NOT NULL,
  periodo_fim     DATE        NOT NULL,
  proximo_venc    DATE,

  -- Integração com gateway (Stripe, Pagar.me, Asaas)
  gateway         TEXT,                         -- 'stripe' | 'asaas' | 'manual'
  gateway_sub_id  TEXT,                         -- ID da assinatura no gateway
  gateway_cust_id TEXT,                         -- ID do cliente no gateway

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT
);

COMMENT ON TABLE subscriptions IS 'Histórico de assinaturas por tenant. Permite churn e reativação.';
```

## Tabela `audit_logs`

```sql
CREATE TABLE audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- O quê aconteceu
  acao         TEXT        NOT NULL,    -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
  tabela       TEXT,                    -- 'pedidos', 'produtos', 'fornadas'
  registro_id  UUID,                   -- ID do registro afetado
  dados_antes  JSONB,                  -- snapshot antes da mudança
  dados_depois JSONB,                  -- snapshot depois da mudança

  -- Contexto técnico
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Particionamento por mês para performance em escala
-- (aplicar quando > 100k registros/mês)
-- CREATE INDEX idx_audit_tenant_data ON audit_logs (tenant_id, created_at DESC);
-- CREATE INDEX idx_audit_tabela ON audit_logs (tabela, registro_id);

COMMENT ON TABLE audit_logs IS 'Trilha de auditoria imutável. Nunca atualizar registros — apenas inserir.';
```

## Tabela `platform_metrics`

```sql
CREATE TABLE platform_metrics (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  periodo     DATE        NOT NULL,              -- granularidade diária: YYYY-MM-DD
  tipo        TEXT        NOT NULL,              -- ver CHECK abaixo
  valor       DECIMAL(14,4) NOT NULL,
  metadados   JSONB,                             -- dados auxiliares por tipo
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT platform_metrics_tipo_check CHECK (tipo IN (
    'pedidos_total',          -- contagem de pedidos no dia
    'pedidos_confirmados',    -- pedidos com status='confirmado'
    'faturamento_bruto',      -- soma de valor_total (confirmados)
    'novos_clientes',         -- profiles criados no dia
    'fornadas_ativas',        -- fornadas com data no dia
    'db_size_bytes',          -- tamanho do banco (coletado diariamente)
    'mrr',                    -- MRR calculado do tenant no período
    'churn_event'             -- 1 = tenant cancelou neste período
  )),

  UNIQUE (tenant_id, periodo, tipo)              -- idempotência: upsert seguro
);

COMMENT ON TABLE platform_metrics IS 'Série temporal de métricas consolidadas por tenant e dia. Alimentada por Edge Function cron diária.';
```

## Estratégia de Adição de `tenant_id` nas Tabelas Existentes

```sql
-- PASSO 1: Adicionar coluna nullable (não quebra nada em produção)
ALTER TABLE fornadas    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE pedidos     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE produtos    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE profiles    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- PASSO 2: Criar o tenant da Jéssica antes de popular
-- INSERT INTO tenants (slug, nome, email_admin, whatsapp_num, status, plano)
-- VALUES ('afeto-em-forma', 'Afeto em Forma', 'jessika@email.com', '5512991370007', 'active', 'pro');

-- PASSO 3: Backfill — atribuir tenant_id a todos os registros existentes
-- UPDATE fornadas     SET tenant_id = '<UUID_DO_TENANT_JESSIKA>';
-- UPDATE pedidos      SET tenant_id = '<UUID_DO_TENANT_JESSIKA>';
-- UPDATE produtos     SET tenant_id = '<UUID_DO_TENANT_JESSIKA>';
-- UPDATE itens_pedido SET tenant_id = (SELECT p.tenant_id FROM pedidos p WHERE p.id = pedido_id);
-- UPDATE profiles     SET tenant_id = '<UUID_DO_TENANT_JESSIKA>' WHERE role = 'admin';

-- PASSO 4: Adicionar NOT NULL + índices compostos após backfill
-- ALTER TABLE fornadas     ALTER COLUMN tenant_id SET NOT NULL;
-- CREATE INDEX idx_fornadas_tenant     ON fornadas     (tenant_id, data);
-- CREATE INDEX idx_pedidos_tenant      ON pedidos      (tenant_id, created_at DESC);
-- CREATE INDEX idx_produtos_tenant     ON produtos     (tenant_id, ativo);
-- CREATE INDEX idx_itens_tenant        ON itens_pedido (tenant_id, pedido_id);

-- PASSO 5: Corrigir constraints UNIQUE para incluir tenant_id
-- ALTER TABLE fornadas DROP CONSTRAINT fornadas_data_unique;
-- ALTER TABLE fornadas ADD CONSTRAINT fornadas_tenant_data_unique UNIQUE (tenant_id, data);
-- ALTER TABLE produtos DROP CONSTRAINT produtos_nome_categoria_unique;
-- ALTER TABLE produtos ADD CONSTRAINT produtos_tenant_nome_cat_unique UNIQUE (tenant_id, nome, categoria);
```

## Novas Políticas RLS com Isolamento por Tenant

```sql
-- Função helper que lê tenant_id do JWT (sem roundtrip ao banco)
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
    NULL
  )
$$;

-- Função helper que verifica se é admin do próprio tenant
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', '') = 'admin'
$$;

-- Função que verifica se é admin da plataforma (você, a criadora)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', '') = 'platform_admin'
$$;

-- EXEMPLO: Policy de fornadas com isolamento total
-- DROP POLICY IF EXISTS "fornadas_select_publico" ON fornadas;
-- CREATE POLICY "fornadas_select_tenant"
--   ON fornadas FOR SELECT
--   TO anon, authenticated
--   USING (
--     tenant_id = get_tenant_id()         -- tenant identificado pelo JWT
--     AND ativa = TRUE
--   );

-- DROP POLICY IF EXISTS "fornadas_all_admin" ON fornadas;
-- CREATE POLICY "fornadas_manage_tenant_admin"
--   ON fornadas FOR ALL
--   TO authenticated
--   USING (
--     tenant_id = get_tenant_id()
--     AND (is_tenant_admin() OR is_platform_admin())
--   )
--   WITH CHECK (
--     tenant_id = get_tenant_id()
--     AND (is_tenant_admin() OR is_platform_admin())
--   );
```

## Evolução do `fn_custom_access_token_hook`

```sql
-- O auth hook precisará injetar também tenant_id e user_role refinado
CREATE OR REPLACE FUNCTION fn_custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims     JSONB;
  p_role     TEXT;
  p_tenant   UUID;
BEGIN
  SELECT p.role, p.tenant_id
    INTO p_role, p_tenant
    FROM public.profiles p
   WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}',  to_jsonb(COALESCE(p_role,   'customer')));
  claims := jsonb_set(claims, '{tenant_id}',  to_jsonb(COALESCE(p_tenant::text, '')));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
-- Nota: após adicionar tenant_id na tabela profiles e popular o campo
```

---

# 🗺️ Plano de Implementação

A prioridade absoluta é: **a Jéssica não pode ter o serviço interrompido em nenhuma fase.**

## Fase 0 — Preparação (Semana 1) `[Zero impacto em produção]`

```
✅ Criar branch de desenvolvimento no Supabase
✅ Configurar ambiente de homologação (novo projeto Supabase separado)
✅ Espelhar schema + dados de produção para homologação via pg_dump
✅ Definir UUID do tenant da Jéssica (gerar agora, usar em todas as fases)
```

**Princípio:** nunca testar em produção. Toda migration vai para homologação por 48h antes de ir para produção.

## Fase 1 — Fundação Multi-Tenant (Semanas 2–3) `[Impacto mínimo]`

```
1. Criar tabela tenants (sem alterar nada existente)
2. Criar tabela subscriptions (sem alterar nada existente)
3. Criar tabela audit_logs (sem alterar nada existente)
4. Criar tabela platform_metrics (sem alterar nada existente)
5. Inserir o tenant da Jéssica
6. Adicionar tenant_id como NULLABLE em todas as tabelas (ALTER ADD COLUMN)
   → Sistema continua funcionando — coluna aceita NULL
7. Fazer backfill de todos os registros existentes com o tenant_id da Jéssica
8. Adicionar NOT NULL após backfill validado
9. Criar índices compostos (tenant_id, ...) para cada tabela
```

**Ponto de rollback:** antes do NOT NULL, qualquer problema = drop da coluna em segundos.

## Fase 2 — Isolamento de Dados (Semana 4) `[Impacto controlado]`

```
1. Criar funções get_tenant_id(), is_tenant_admin(), is_platform_admin()
2. Atualizar fn_custom_access_token_hook para injetar tenant_id no JWT
3. Atualizar app_metadata de todos os usuários existentes com tenant_id da Jéssica
4. Substituir políticas RLS em homologação — validar por 48h
5. Aplicar novas políticas em produção numa janela de manutenção curta (< 5 min)
6. Corrigir constraints UNIQUE para incluir tenant_id
```

**Ponto de rollback:** guardar DDL das policies antigas — reversível em segundos.

## Fase 3 — Onboarding de Novos Tenants (Semanas 5–6) `[Novo desenvolvimento]`

```
1. Tela de cadastro de novo negócio (form: slug, nome, whatsapp, plano)
2. Edge Function: fn_provision_tenant (cria tenant + profile admin + produtos seed)
3. Roteamento por slug no front-end (afetoemforma.com/{slug})
4. Painel de plataforma (você como platform_admin): lista de tenants, status, MRR
5. E-mail de boas-vindas automático via Supabase Auth + Resend
```

## Fase 4 — Monetização e Observabilidade (Semanas 7–10) `[Novo desenvolvimento]`

```
1. Integração com Asaas (pagamento BR) ou Stripe para cobrança recorrente
2. Edge Function cron diária: coleta de métricas → platform_metrics
3. Dashboard de plataforma com MRR, churn, tenants ativos, pedidos/mês
4. Supabase Metrics API → Grafana Cloud para monitoramento técnico
5. Limites por plano: bloquear criação de fornada além do max_fornadas_mes
6. Tela "Upgrade" quando tenant atinge limite do plano free
```

## Fase 5 — White Label Completo (Mês 3+) `[Escala]`

```
1. Subdomínio por tenant (jessika.afetoemforma.com)
2. Upload de logo + personalização de cores via painel admin
3. Exportação completa de dados do tenant (LGPD: direito à portabilidade)
4. API pública para integrações (webhooks de novo pedido, confirmação, etc.)
5. Multi-idioma (pt-BR base, en como expansão futura)
```

## Resumo Visual do Risco por Fase

```
Fase 0: ████████████████████  Risco 0% — leitura e preparação apenas
Fase 1: █████████████████░░░  Risco ~5% — ADD COLUMN nullable é reversível
Fase 2: ████████████░░░░░░░░  Risco ~20% — troca de RLS policies (janela curta)
Fase 3: ████████░░░░░░░░░░░░  Risco ~40% — novo código, novos tenants
Fase 4: ██████░░░░░░░░░░░░░░  Risco ~30% — integração financeira (testar muito)
Fase 5: ████░░░░░░░░░░░░░░░░  Risco ~20% — features aditivas, sem mudar core
```

## Uma nota estratégica final

O banco atual tem **apenas 400 kB e 36 registros** — estágio pré-receita. Isso é uma vantagem enorme: a janela para fazer a migração corretamente, sem dívida técnica, está completamente aberta. Cada semana que passa com um segundo tenant no ar sem `tenant_id` é uma semana de dívida que cresce exponencialmente. A recomendação é iniciar a Fase 0 imediatamente.