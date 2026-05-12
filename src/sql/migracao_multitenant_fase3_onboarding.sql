-- ============================================================
--  AFETO EM FORMA - Fase 3: Onboarding Multi-Tenant
--  Cria a RPC interna fn_provision_tenant usada pela Edge Function
--  fn-provision-tenant.
--
--  PostgreSQL 17.6 · Idempotente
--  Pre-requisitos: Fases 0, 1 e 2 aplicadas.
-- ============================================================

DROP FUNCTION IF EXISTS fn_provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION fn_provision_tenant(
  p_slug         TEXT,
  p_nome         TEXT,
  p_email_admin  TEXT,
  p_whatsapp_num TEXT DEFAULT NULL,
  p_cidade       TEXT DEFAULT NULL,
  p_estado       TEXT DEFAULT 'SP',
  p_plano        TEXT DEFAULT 'free'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_slug       TEXT;
  v_email      TEXT;
  v_plano      TEXT;
  v_tenant_id  UUID;
  v_trial_end  TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  v_slug  := lower(regexp_replace(trim(COALESCE(p_slug, '')), '[^a-zA-Z0-9-]+', '-', 'g'));
  v_slug  := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_email := lower(trim(COALESCE(p_email_admin, '')));
  v_plano := COALESCE(NULLIF(trim(p_plano), ''), 'free');

  IF length(v_slug) < 3 THEN
    RAISE EXCEPTION 'Slug muito curto: minimo 3 caracteres.';
  END IF;

  IF trim(COALESCE(p_nome, '')) = '' THEN
    RAISE EXCEPTION 'Nome do negocio e obrigatorio.';
  END IF;

  IF v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail invalido.';
  END IF;

  IF v_plano NOT IN ('free', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Plano invalido.';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug ja esta em uso.';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE email_admin = v_email) THEN
    RAISE EXCEPTION 'E-mail ja cadastrado.';
  END IF;

  INSERT INTO tenants (
    slug, nome, email_admin, whatsapp_num, cidade, estado, plano, status,
    trial_ends_at, max_fornadas_mes, max_produtos, max_admins
  )
  VALUES (
    v_slug,
    trim(p_nome),
    v_email,
    NULLIF(regexp_replace(COALESCE(p_whatsapp_num, ''), '\D', '', 'g'), ''),
    NULLIF(trim(COALESCE(p_cidade, '')), ''),
    COALESCE(NULLIF(upper(trim(p_estado)), ''), 'SP'),
    v_plano,
    'trial',
    v_trial_end,
    CASE WHEN v_plano = 'free' THEN 4 ELSE 999 END,
    CASE WHEN v_plano = 'free' THEN 20 ELSE 999 END,
    CASE WHEN v_plano = 'enterprise' THEN 10 WHEN v_plano = 'pro' THEN 5 ELSE 1 END
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO subscriptions (
    tenant_id, plano, status, preco_mensal, ciclo,
    periodo_inicio, periodo_fim, proximo_venc, gateway
  )
  VALUES (
    v_tenant_id,
    v_plano,
    'active',
    CASE v_plano WHEN 'pro' THEN 97.00 WHEN 'enterprise' THEN NULL ELSE 0.00 END,
    'monthly',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '30 days',
    'manual'
  );

  INSERT INTO produtos (tenant_id, nome, descricao, preco, categoria, emoji, ativo)
  VALUES
    (v_tenant_id, 'Bolo de Mel de Engenho', 'Especiarias mineiras, canela e cravo. Assado lentamente por 2h.', 65.00, 'Bolo', '🍯', TRUE),
    (v_tenant_id, 'Bolo de Fuba Cremoso', 'Receita da vovo. Cremoso por dentro, casca dourada.', 55.00, 'Bolo', '🌽', TRUE),
    (v_tenant_id, 'Bolo de Banana com Rapadura', 'Bananas da terra com rapadura artesanal do interior mineiro.', 60.00, 'Bolo', '🍌', TRUE),
    (v_tenant_id, 'Pao Rustico de Forno a Lenha', 'Fermentacao natural 24h. Casca espessa, miolo alveolado.', 28.00, 'Pão', '🍞', TRUE),
    (v_tenant_id, 'Pao de Milho Verde', 'Milho verde moido na pedra. Textura densa e sabor adocicado.', 32.00, 'Pão', '🌽', TRUE),
    (v_tenant_id, 'Biscoito de Polvilho Tradicional', 'Polvilho azedo no forno a lenha. Leve, crocante, zero conservantes.', 22.00, 'Biscoito', '⭕', TRUE),
    (v_tenant_id, 'Biscoito de Polvilho Parmesao', 'Parmesao envelhecido na massa. Levemente salgado, irresistivel.', 26.00, 'Biscoito', '🧀', TRUE)
  ON CONFLICT (tenant_id, nome, categoria) DO NOTHING;

  INSERT INTO audit_logs (tenant_id, acao, tabela, registro_id, dados_depois)
  VALUES (
    v_tenant_id,
    'tenant_provisioned',
    'tenants',
    v_tenant_id,
    jsonb_build_object('slug', v_slug, 'email_admin', v_email, 'plano', v_plano)
  );

  RETURN v_tenant_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION fn_provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMENT ON FUNCTION fn_provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Provisiona um novo tenant, subscription inicial e catalogo seed. SECURITY INVOKER; deve ser chamada apenas pela Edge Function fn-provision-tenant com service_role.';

-- Verificacao sugerida:
-- SELECT fn_provision_tenant('teste-demo', 'Teste Demo', 'admin+teste@example.com', '5511999999999', 'Sao Paulo', 'SP', 'free');

-- ============================================================
--  Roteamento publico por slug
-- ============================================================

CREATE OR REPLACE VIEW tenant_public
WITH (security_invoker = false)
AS
SELECT
  id,
  slug,
  nome,
  cidade,
  estado,
  whatsapp_num,
  cor_primaria,
  cor_acento,
  status
FROM tenants
WHERE status IN ('trial', 'active');

GRANT SELECT ON tenant_public TO anon, authenticated;
GRANT SELECT ON tenants TO authenticated;

GRANT SELECT ON produtos TO anon, authenticated;
GRANT SELECT ON fornadas TO anon, authenticated;
GRANT SELECT ON vagas_fornada TO anon, authenticated;

DROP POLICY IF EXISTS "tenants_platform_select" ON tenants;
CREATE POLICY "tenants_platform_select"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "produtos_select_public_by_tenant" ON produtos;
CREATE POLICY "produtos_select_public_by_tenant"
  ON produtos FOR SELECT
  TO anon
  USING (
    ativo = TRUE
    AND EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = produtos.tenant_id
        AND t.status IN ('trial', 'active')
    )
  );

DROP POLICY IF EXISTS "fornadas_select_public_by_tenant" ON fornadas;
CREATE POLICY "fornadas_select_public_by_tenant"
  ON fornadas FOR SELECT
  TO anon
  USING (
    ativa = TRUE
    AND EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = fornadas.tenant_id
        AND t.status IN ('trial', 'active')
    )
  );

COMMENT ON VIEW tenant_public IS
  'Campos publicos para resolver /{slug} no front-end sem expor email_admin ou dados sensiveis do tenant.';
