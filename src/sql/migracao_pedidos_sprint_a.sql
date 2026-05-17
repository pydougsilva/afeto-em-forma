-- ============================================================
--  AFETO EM FORMA — Sprint A pedidos
--  Separação operacional/financeiro + suporte guest orders
--  Idempotente: ADD COLUMN IF NOT EXISTS
--  PostgreSQL 17.6 · Zero downtime · 2026-05-17
-- ============================================================

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS pago             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmado_em    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entregue_em      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nome_cliente     TEXT,
  ADD COLUMN IF NOT EXISTS telefone_cliente TEXT;

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_pago
  ON public.pedidos (tenant_id, pago);

CREATE INDEX IF NOT EXISTS idx_pedidos_status_pago
  ON public.pedidos (tenant_id, status, pago);
