-- ============================================================
--  AFETO EM FORMA — Migração Multi-Tenant
--  Fase 0: Tabelas de Plataforma
--  Fase 1: Adição de tenant_id nas Tabelas de Negócio
--
--  PostgreSQL 17.6 · Idempotente · Zero downtime
--  Executado e verificado em: 2026-05-01
--  Tenant piloto UUID: 7b5217d1-81ef-464e-83ae-8c8bb3b714f8
--
--  PRÉ-REQUISITO: fn_set_updated_at() deve existir (schema v3+)
--  ORDEM: execute as seções em sequência dentro de uma sessão.
-- ============================================================


-- ============================================================
--  FASE 0 — TABELAS DE PLATAFORMA
-- ============================================================

-- ── 0.1  tenants ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT          NOT NULL,
  nome              TEXT          NOT NULL,
  descricao         TEXT,
  logo_url          TEXT,
  cor_primaria      TEXT          NOT NULL DEFAULT '#6B3E2E',
  cor_acento        TEXT          NOT NULL DEFAULT '#C68A4D',
  email_admin       TEXT          NOT NULL,
  telefone          TEXT,
  cidade            TEXT,
  estado            TEXT          NOT NULL DEFAULT 'SP',
  whatsapp_num      TEXT,
  timezone          TEXT          NOT NULL DEFAULT 'America/Sao_Paulo',
  moeda             TEXT          NOT NULL DEFAULT 'BRL',
  plano             TEXT          NOT NULL DEFAULT 'free'
                                  CHECK (plano IN ('free','pro','enterprise')),
  status            TEXT          NOT NULL DEFAULT 'trial'
                                  CHECK (status IN ('trial','active','suspended','cancelled')),
  trial_ends_at     TIMESTAMPTZ,
  max_fornadas_mes  INTEGER       NOT NULL DEFAULT 4,
  max_produtos      INTEGER       NOT NULL DEFAULT 20,
  max_admins        INTEGER       NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cancelled_at      TIMESTAMPTZ,
  CONSTRAINT tenants_slug_unique        UNIQUE (slug),
  CONSTRAINT tenants_email_admin_unique UNIQUE (email_admin)
);

COMMENT ON TABLE  tenants            IS 'Negócios cadastrados na plataforma Afeto em Forma.';
COMMENT ON COLUMN tenants.slug       IS 'Identificador de URL: afetoemforma.com/{slug}';
COMMENT ON COLUMN tenants.plano      IS 'free | pro | enterprise';

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 0.2  subscriptions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plano           TEXT          NOT NULL CHECK (plano IN ('free','pro','enterprise')),
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','past_due','cancelled','paused')),
  preco_mensal    DECIMAL(10,2),
  moeda           TEXT          NOT NULL DEFAULT 'BRL',
  ciclo           TEXT          NOT NULL DEFAULT 'monthly'
                                CHECK (ciclo IN ('monthly','annual')),
  periodo_inicio  DATE          NOT NULL,
  periodo_fim     DATE          NOT NULL,
  proximo_venc    DATE,
  gateway         TEXT,
  gateway_sub_id  TEXT,
  gateway_cust_id TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT
);

COMMENT ON TABLE subscriptions IS 'Histórico de assinaturas por tenant.';

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions (status);

-- ── 0.3  audit_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  acao         TEXT        NOT NULL,
  tabela       TEXT,
  registro_id  UUID,
  dados_antes  JSONB,
  dados_depois JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Trilha de auditoria imutável. Nunca atualizar — apenas inserir.';

CREATE INDEX IF NOT EXISTS idx_audit_tenant_data ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tabela       ON audit_logs (tabela, registro_id);

-- ── 0.4  platform_metrics ────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_metrics (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID          REFERENCES tenants(id) ON DELETE CASCADE,
  periodo     DATE          NOT NULL,
  tipo        TEXT          NOT NULL,
  valor       DECIMAL(14,4) NOT NULL,
  metadados   JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_metrics_tipo_check CHECK (tipo IN (
    'pedidos_total','pedidos_confirmados','faturamento_bruto',
    'novos_clientes','fornadas_ativas','db_size_bytes','mrr','churn_event'
  )),
  CONSTRAINT platform_metrics_unique UNIQUE (tenant_id, periodo, tipo)
);

COMMENT ON TABLE platform_metrics IS 'Série temporal de métricas por tenant e dia.';

CREATE INDEX IF NOT EXISTS idx_platform_metrics_tenant_periodo
  ON platform_metrics (tenant_id, periodo DESC);

-- ── 0.5  RLS nas tabelas de plataforma ───────────────────────
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_no_public_access"
  ON tenants FOR ALL TO anon USING (false);

CREATE POLICY "subscriptions_no_public_access"
  ON subscriptions FOR ALL TO anon USING (false);

CREATE POLICY "audit_logs_select_tenant"
  ON audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE email_admin = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "platform_metrics_no_public_access"
  ON platform_metrics FOR ALL TO anon USING (false);

-- ── 0.6  Inserir tenant piloto ───────────────────────────────
INSERT INTO tenants (
  slug, nome, descricao,
  cor_primaria, cor_acento,
  email_admin, whatsapp_num,
  cidade, estado,
  plano, status,
  max_fornadas_mes, max_produtos, max_admins
) VALUES (
  'afeto-em-forma',
  'Afeto em Forma',
  'Padaria artesanal de forno a lenha. Tradição mineira em São Sebastião, SP.',
  '#6B3E2E', '#C68A4D',
  'artesa@afetoemforma.com.br',
  '5512991370007',
  'São Sebastião', 'SP',
  'pro', 'active',
  999, 999, 5
) ON CONFLICT (slug) DO NOTHING;

-- ── 0.7  Subscription inicial ────────────────────────────────
INSERT INTO subscriptions (
  tenant_id, plano, status,
  preco_mensal, ciclo,
  periodo_inicio, periodo_fim, proximo_venc,
  gateway
)
SELECT
  t.id, 'pro', 'active',
  0.00, 'monthly',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  CURRENT_DATE + INTERVAL '1 month',
  'manual'
FROM tenants t
WHERE t.slug = 'afeto-em-forma'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.tenant_id = t.id
  );


-- ============================================================
--  FASE 1 — tenant_id NAS TABELAS DE NEGÓCIO
-- ============================================================

-- ── 1.1  ADD COLUMN nullable (atômico, zero downtime) ────────
ALTER TABLE profiles     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE fornadas     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE pedidos      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE produtos     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ── 1.2  Backfill com o tenant piloto ────────────────────────
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'afeto-em-forma';

  UPDATE profiles     SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE fornadas     SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE produtos     SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE pedidos      SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  -- itens_pedido herda do pedido pai
  UPDATE itens_pedido ip
  SET    tenant_id = p.tenant_id
  FROM   pedidos p
  WHERE  ip.pedido_id = p.id
    AND  ip.tenant_id IS NULL;

  RAISE NOTICE 'Backfill concluído para tenant_id = %', v_tenant_id;
END;
$$;

-- ── 1.3  NOT NULL após backfill validado ─────────────────────
-- profiles: mantido NULLABLE (platform_admin não pertence a nenhum tenant)
ALTER TABLE fornadas     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pedidos      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE itens_pedido ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE produtos     ALTER COLUMN tenant_id SET NOT NULL;

-- ── 1.4  Índices compostos ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fornadas_tenant_data
  ON fornadas (tenant_id, data);

DROP INDEX IF EXISTS idx_fornadas_ativa;
CREATE INDEX IF NOT EXISTS idx_fornadas_tenant_ativa
  ON fornadas (tenant_id, ativa) WHERE ativa = TRUE;

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_created
  ON pedidos (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_status
  ON pedidos (tenant_id, status);

DROP INDEX IF EXISTS idx_pedidos_status;

CREATE INDEX IF NOT EXISTS idx_produtos_tenant_ativo
  ON produtos (tenant_id, ativo) WHERE ativo = TRUE;

DROP INDEX IF EXISTS idx_produtos_ativo;

CREATE INDEX IF NOT EXISTS idx_itens_tenant_pedido
  ON itens_pedido (tenant_id, pedido_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant
  ON profiles (tenant_id);

-- ── 1.5  UNIQUE constraints com tenant_id ────────────────────

-- Hotfix N1: fornadas — cada tenant tem sua própria agenda
ALTER TABLE fornadas
  DROP CONSTRAINT IF EXISTS fornadas_data_unique;
ALTER TABLE fornadas
  ADD CONSTRAINT fornadas_tenant_data_unique
  UNIQUE (tenant_id, data);

-- Hotfix N3: produtos — cada tenant tem seu próprio catálogo
ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS produtos_nome_categoria_unique;
ALTER TABLE produtos
  ADD CONSTRAINT produtos_tenant_nome_cat_unique
  UNIQUE (tenant_id, nome, categoria);

-- ── 1.6  VIEW vagas_fornada v2 (multi-tenant) ─────────────────
-- Hotfix N4: isolamento de cardápio por tenant na view
DROP VIEW IF EXISTS vagas_fornada;

CREATE VIEW vagas_fornada AS
SELECT
  f.id                    AS fornada_id,
  f.tenant_id,
  f.data,
  f.capacidade_pao,
  f.capacidade_biscoito,
  f.ativa,
  f.observacao,

  COALESCE(SUM(
    CASE
      WHEN p.status IN ('pendente','confirmado') AND ip.produto = 'Pão'
      THEN ip.quantidade ELSE 0
    END
  ), 0)::INTEGER AS pao_ocupado,

  COALESCE(SUM(
    CASE
      WHEN p.status IN ('pendente','confirmado') AND ip.produto = 'Biscoito'
      THEN ip.quantidade ELSE 0
    END
  ), 0)::INTEGER AS biscoito_ocupado,

  GREATEST(0, f.capacidade_pao - COALESCE(SUM(
    CASE
      WHEN p.status IN ('pendente','confirmado') AND ip.produto = 'Pão'
      THEN ip.quantidade ELSE 0
    END
  ), 0))::INTEGER AS vagas_pao,

  GREATEST(0, f.capacidade_biscoito - COALESCE(SUM(
    CASE
      WHEN p.status IN ('pendente','confirmado') AND ip.produto = 'Biscoito'
      THEN ip.quantidade ELSE 0
    END
  ), 0))::INTEGER AS vagas_biscoito

FROM fornadas f
LEFT JOIN pedidos p       ON p.fornada_id = f.id
                         AND p.tenant_id  = f.tenant_id   -- isolamento explícito
LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
GROUP BY
  f.id, f.tenant_id, f.data,
  f.capacidade_pao, f.capacidade_biscoito,
  f.ativa, f.observacao
ORDER BY
  f.tenant_id, f.data ASC;

COMMENT ON VIEW vagas_fornada IS
  'v2 multi-tenant: tenant_id no GROUP BY e JOIN. '
  'Isolamento de cardápio por tenant. '
  'Atualizar fetchFornadas() no App.jsx para filtrar por tenant_id.';


-- ============================================================
--  VERIFICAÇÃO FINAL (execute após o script completo)
-- ============================================================

-- SELECT
--   c.table_name,
--   c.column_name,
--   c.is_nullable,
--   tc.constraint_name,
--   tc.constraint_type
-- FROM information_schema.columns c
-- LEFT JOIN information_schema.key_column_usage kcu
--   ON kcu.table_name = c.table_name AND kcu.column_name = c.column_name
-- LEFT JOIN information_schema.table_constraints tc
--   ON tc.constraint_name = kcu.constraint_name
-- WHERE c.column_name = 'tenant_id'
--   AND c.table_schema = 'public'
-- ORDER BY c.table_name;

-- ============================================================
--  PRÓXIMO PASSO — Fase 2: Funções e RLS Multi-Tenant
--
--  CREATE OR REPLACE FUNCTION get_tenant_id() ...
--  CREATE OR REPLACE FUNCTION is_tenant_admin() ...
--  CREATE OR REPLACE FUNCTION is_platform_admin() ...
--  Atualizar fn_custom_access_token_hook() para injetar tenant_id no JWT
--  Substituir 12 policies RLS existentes por versões com tenant_id
--  Atualizar fetchFornadas() no App.jsx: .eq('tenant_id', tenantId)
-- ============================================================
