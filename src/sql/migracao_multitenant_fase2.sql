-- ============================================================
--  AFETO EM FORMA — Fase 2: Isolamento RLS Multi-Tenant
--  PostgreSQL 17.6 · Idempotente · Zero downtime
--  Executado e verificado em: 2026-05-01
--  Pré-requisito: Fases 0+1 aplicadas (tenant_id em todas as tabelas)
-- ============================================================


-- ============================================================
--  TAREFA 1 — FUNÇÕES DE SEGURANÇA
-- ============================================================

-- ── get_tenant_id() ──────────────────────────────────────────
-- Lê tenant_id de app_metadata do JWT (server-controlled).
-- Nunca faz roundtrip ao banco — leitura direta do token assinado.
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
    NULL
  )
$$;

COMMENT ON FUNCTION get_tenant_id() IS
  'Lê tenant_id do app_metadata do JWT. '
  'Retorna NULL para usuários sem tenant (platform_admin). '
  'Nunca faz roundtrip ao banco.';

-- ── is_tenant_admin() ────────────────────────────────────────
-- Verifica user_role = ''admin'' em app_metadata.
-- Combinar sempre com tenant_id = get_tenant_id() nas policies.
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', '') = 'admin'
$$;

COMMENT ON FUNCTION is_tenant_admin() IS
  'Retorna TRUE se user_role = ''admin'' no JWT. '
  'Sempre combinar com tenant_id = get_tenant_id() nas RLS policies.';

-- ── is_platform_admin() ──────────────────────────────────────
-- Reservada para a criadora da plataforma.
-- Para atribuir: UPDATE profiles SET role = ''platform_admin'' WHERE id = ...
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', '') = 'platform_admin'
$$;

COMMENT ON FUNCTION is_platform_admin() IS
  'Retorna TRUE apenas para user_role = ''platform_admin''. '
  'Concede acesso irrestrito a todos os tenants.';


-- ============================================================
--  TAREFA 2 — AUTH HOOK ATUALIZADO
--
--  ANTES: injetava apenas user_role no nível raiz dos claims.
--  DEPOIS: injeta user_role + tenant_id em app_metadata.
--
--  SEGURANÇA: app_metadata é server-only — não pode ser
--  adulterado pelo usuário via API (ao contrário de user_metadata).
--
--  ATENÇÃO: após aplicar, forçar refresh de token dos usuários
--  ativos (ou aguardar expiração natural do JWT).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims      JSONB;
  v_role        TEXT;
  v_tenant_id   UUID;
  v_app_meta    JSONB;
BEGIN
  -- Busca role e tenant_id do perfil
  SELECT role, tenant_id
    INTO v_role, v_tenant_id
    FROM public.profiles
   WHERE id = (event->>'user_id')::UUID;

  v_claims   := event->'claims';
  v_app_meta := COALESCE(v_claims->'app_metadata', '{}'::jsonb);

  -- Injeta user_role no nível raiz (retrocompatibilidade com is_admin() legado)
  v_claims := jsonb_set(
    v_claims,
    '{user_role}',
    to_jsonb(COALESCE(v_role, 'customer'))
  );

  -- Injeta tenant_id em app_metadata (isolamento multi-tenant)
  v_app_meta := jsonb_set(
    v_app_meta,
    '{tenant_id}',
    to_jsonb(COALESCE(v_tenant_id::text, ''))
  );

  -- Injeta user_role também em app_metadata
  v_app_meta := jsonb_set(
    v_app_meta,
    '{user_role}',
    to_jsonb(COALESCE(v_role, 'customer'))
  );

  -- Salva app_metadata nos claims
  v_claims := jsonb_set(v_claims, '{app_metadata}', v_app_meta);

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION fn_custom_access_token_hook FROM authenticated, anon, public;


-- ============================================================
--  TAREFA 3 — POLÍTICAS RLS MULTI-TENANT
--
--  MODELO DE ACESSO:
--    anon/customer  → apenas dados do seu tenant (via get_tenant_id())
--    tenant_admin   → todos os dados do seu tenant
--    platform_admin → todos os dados de todos os tenants
--
--  ANTES → DEPOIS por tabela documentado abaixo.
-- ============================================================

-- ── FORNADAS ─────────────────────────────────────────────────
-- ANTES: fornadas_select_publico → USING (ativa = true)           ← vaza entre tenants
-- ANTES: fornadas_all_admin      → USING (is_admin())             ← admin global
-- DEPOIS: 3 policies com isolamento completo

DROP POLICY IF EXISTS "fornadas_select_publico"    ON fornadas;
DROP POLICY IF EXISTS "fornadas_all_admin"          ON fornadas;
DROP POLICY IF EXISTS "fornadas_select_tenant"      ON fornadas;
DROP POLICY IF EXISTS "fornadas_manage_tenant_admin"ON fornadas;
DROP POLICY IF EXISTS "fornadas_platform_admin"     ON fornadas;

CREATE POLICY "fornadas_select_tenant"
  ON fornadas FOR SELECT
  TO anon, authenticated
  USING (tenant_id = get_tenant_id() AND ativa = TRUE);

CREATE POLICY "fornadas_manage_tenant_admin"
  ON fornadas FOR ALL
  TO authenticated
  USING    (tenant_id = get_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_tenant_id() AND is_tenant_admin());

CREATE POLICY "fornadas_platform_admin"
  ON fornadas FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ── PRODUTOS ─────────────────────────────────────────────────
-- ANTES: produtos_select_ativos → USING (ativo = true)            ← vaza entre tenants
-- ANTES: produtos_all_admin     → USING (is_admin())              ← admin global

DROP POLICY IF EXISTS "produtos_select_ativos"        ON produtos;
DROP POLICY IF EXISTS "produtos_all_admin"             ON produtos;
DROP POLICY IF EXISTS "produtos_select_tenant"         ON produtos;
DROP POLICY IF EXISTS "produtos_manage_tenant_admin"   ON produtos;
DROP POLICY IF EXISTS "produtos_platform_admin"        ON produtos;

CREATE POLICY "produtos_select_tenant"
  ON produtos FOR SELECT
  TO anon, authenticated
  USING (tenant_id = get_tenant_id() AND ativo = TRUE);

CREATE POLICY "produtos_manage_tenant_admin"
  ON produtos FOR ALL
  TO authenticated
  USING    (tenant_id = get_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_tenant_id() AND is_tenant_admin());

CREATE POLICY "produtos_platform_admin"
  ON produtos FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ── PEDIDOS ──────────────────────────────────────────────────
-- ANTES: pedidos_insert_customer → WITH CHECK (user_id = auth.uid())  ← sem tenant
-- ANTES: pedidos_select_proprio  → USING (user_id = auth.uid())       ← sem tenant
-- ANTES: pedidos_all_admin       → USING (is_admin())                 ← admin global
-- ANTES: pedidos_select_anon     → USING (true)                       ← sem restrição

DROP POLICY IF EXISTS "pedidos_insert_customer"      ON pedidos;
DROP POLICY IF EXISTS "pedidos_select_proprio"        ON pedidos;
DROP POLICY IF EXISTS "pedidos_all_admin"             ON pedidos;
DROP POLICY IF EXISTS "pedidos_select_anon"           ON pedidos;
DROP POLICY IF EXISTS "pedidos_manage_tenant_admin"   ON pedidos;
DROP POLICY IF EXISTS "pedidos_platform_admin"        ON pedidos;

CREATE POLICY "pedidos_insert_customer"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND user_id = auth.uid());

CREATE POLICY "pedidos_select_proprio"
  ON pedidos FOR SELECT
  TO authenticated
  USING (tenant_id = get_tenant_id() AND user_id = auth.uid());

CREATE POLICY "pedidos_manage_tenant_admin"
  ON pedidos FOR ALL
  TO authenticated
  USING    (tenant_id = get_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_tenant_id() AND is_tenant_admin());

CREATE POLICY "pedidos_platform_admin"
  ON pedidos FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ── ITENS_PEDIDO ─────────────────────────────────────────────
-- ANTES: itens_insert_customer → WITH CHECK (EXISTS pedidos JOIN)  ← sem tenant
-- ANTES: itens_select_proprio  → USING (EXISTS pedidos JOIN)       ← sem tenant
-- ANTES: itens_all_admin       → USING (is_admin())                ← admin global

DROP POLICY IF EXISTS "itens_insert_customer"      ON itens_pedido;
DROP POLICY IF EXISTS "itens_select_proprio"        ON itens_pedido;
DROP POLICY IF EXISTS "itens_all_admin"             ON itens_pedido;
DROP POLICY IF EXISTS "itens_manage_tenant_admin"   ON itens_pedido;
DROP POLICY IF EXISTS "itens_platform_admin"        ON itens_pedido;

CREATE POLICY "itens_insert_customer"
  ON itens_pedido FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id        = itens_pedido.pedido_id
        AND p.user_id   = auth.uid()
        AND p.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "itens_select_proprio"
  ON itens_pedido FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id        = itens_pedido.pedido_id
        AND p.user_id   = auth.uid()
        AND p.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "itens_manage_tenant_admin"
  ON itens_pedido FOR ALL
  TO authenticated
  USING    (tenant_id = get_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_tenant_id() AND is_tenant_admin());

CREATE POLICY "itens_platform_admin"
  ON itens_pedido FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ── PROFILES ─────────────────────────────────────────────────
-- ANTES: profiles_select_proprio  → USING (id = auth.uid())   ← ok, mas sem tenant
-- ANTES: profiles_update_proprio  → USING (id = auth.uid())   ← ok, mas sem tenant
-- ANTES: profiles_all_admin       → USING (is_admin())        ← admin global

DROP POLICY IF EXISTS "profiles_select_proprio"      ON profiles;
DROP POLICY IF EXISTS "profiles_update_proprio"       ON profiles;
DROP POLICY IF EXISTS "profiles_all_admin"            ON profiles;
DROP POLICY IF EXISTS "profiles_manage_tenant_admin"  ON profiles;
DROP POLICY IF EXISTS "profiles_platform_admin"       ON profiles;

CREATE POLICY "profiles_select_proprio"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_proprio"
  ON profiles FOR UPDATE
  TO authenticated
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_manage_tenant_admin"
  ON profiles FOR ALL
  TO authenticated
  USING    (tenant_id = get_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_tenant_id() AND is_tenant_admin());

CREATE POLICY "profiles_platform_admin"
  ON profiles FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ── TENANTS ──────────────────────────────────────────────────
-- ANTES: tenants_no_public_access → USING (false)  ← bloqueava tudo inclusive admins
-- DEPOIS: tenant_admin lê o próprio; platform_admin gerencia tudo

DROP POLICY IF EXISTS "tenants_no_public_access"    ON tenants;
DROP POLICY IF EXISTS "tenants_block_anon"           ON tenants;
DROP POLICY IF EXISTS "tenants_select_tenant_admin"  ON tenants;
DROP POLICY IF EXISTS "tenants_platform_admin"       ON tenants;

CREATE POLICY "tenants_block_anon"
  ON tenants FOR ALL
  TO anon
  USING (false);

CREATE POLICY "tenants_select_tenant_admin"
  ON tenants FOR SELECT
  TO authenticated
  USING (id = get_tenant_id());

CREATE POLICY "tenants_platform_admin"
  ON tenants FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ============================================================
--  VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================

-- Confirmar policies com status:
-- SELECT tablename, policyname, roles::text, cmd,
--   CASE
--     WHEN qual ILIKE '%get_tenant_id%' THEN 'tenant-aware'
--     WHEN qual ILIKE '%is_platform%'   THEN 'platform-aware'
--     WHEN qual = 'false'               THEN 'blocked'
--     WHEN qual ILIKE '%auth.uid%'      THEN 'user-scoped'
--     ELSE qual
--   END AS status
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;

-- ============================================================
--  PRÓXIMOS PASSOS — Fase 3: Onboarding de Novos Tenants
--
--  1. Formulário de cadastro de novo negócio
--  2. Edge Function fn_provision_tenant (cria tenant + profile admin + seed)
--  3. Roteamento por slug no front-end
--  4. Painel platform_admin
--  5. Atualizar fn_handle_new_user para atribuir tenant_id no signup
--
--  AJUSTE NO APP.JSX NECESSÁRIO:
--  fetchFornadas, fetchProdutos, fetchPedidos precisarão filtrar
--  por tenant_id quando houver mais de um tenant ativo.
--  Por ora, a RLS já garante o isolamento via JWT.
-- ============================================================
