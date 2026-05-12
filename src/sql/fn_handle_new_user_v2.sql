-- ============================================================
--  AFETO EM FORMA — Fase 3: fn_handle_new_user com tenant_id
--  Versão: 2.0 (substitui versão 1.0 do schema v4)
--
--  PROBLEMA DA VERSÃO 1.0:
--    Novos usuários eram criados com tenant_id = NULL em profiles.
--    Isso quebrava get_tenant_id() → JWT sem tenant_id → 403 em
--    todas as operações de INSERT/UPDATE que verificam tenant_id.
--
--  SOLUÇÃO VERSÃO 2.0:
--    Lê tenant_id de raw_user_meta_data (passado pelo signUp).
--    Fallback por email_admin para cadastros de artesãs via
--    fn_provision_tenant. Backfill para usuários legados.
--
--  STATUS: TEMPORÁRIO até Fase 5
--    Na Fase 5 (roteamento por slug + auth por subdomínio),
--    o tenant_id será resolvido pelo contexto de rota antes
--    do signUp, tornando o fallback por email desnecessário.
--    A função será simplificada para apenas ler do metadata.
--
--  Idempotente: CREATE OR REPLACE.
--  PostgreSQL 17.6 · SECURITY DEFINER · Zero downtime.
--  Pré-requisito: Fase 1 concluída (tenant_id em profiles).
-- ============================================================

-- ── Atualizar fn_handle_new_user ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role      TEXT := 'customer';
BEGIN
  -- ── 1. Ler tenant_id do metadata passado no signUp ────────
  -- Front-end passa via: supabase.auth.signUp({ options: { data: { tenant_id } } })
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- ── 2. Fallback: email_admin de tenant existente ──────────
  -- Usado quando fn_provision_tenant cria o usuário admin.
  -- TEMPORÁRIO: Fase 5 eliminará este fallback com roteamento por slug.
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE email_admin = NEW.email
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      v_role := 'admin';
    END IF;
  END IF;

  -- ── 3. Inserir profile com tenant_id ─────────────────────
  INSERT INTO public.profiles (id, nome, telefone, endereco, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome',     ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'endereco', ''),
    v_role,
    v_tenant_id   -- NULL permitido para platform_admin
  )
  ON CONFLICT (id) DO NOTHING;   -- idempotente: re-triggers não duplicam

  RETURN NEW;
END;
$$;

-- ── Garantir trigger ativo ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ── Backfill: corrigir profiles com tenant_id NULL ───────────
-- Para usuários cadastrados antes desta migration.
-- Apenas customers: platform_admin pode ter tenant_id = NULL.
UPDATE public.profiles
SET    tenant_id = '7b5217d1-81ef-464e-83ae-8c8bb3b714f8'  -- UUID tenant piloto
WHERE  tenant_id IS NULL
  AND  role = 'customer';

-- ── Verificação pós-execução ─────────────────────────────────
-- SELECT id, nome, role, tenant_id FROM profiles
-- WHERE tenant_id IS NULL AND role = 'customer';
-- Resultado esperado: 0 linhas

-- ============================================================
--  PRÓXIMOS PASSOS — Fase 5
--  Quando roteamento por slug estiver implementado:
--    1. Remover o bloco "Fallback: email_admin" (Passo 2)
--    2. O front-end passará tenant_id sempre no metadata do signUp
--    3. A função ficará com apenas os passos 1 e 3
-- ============================================================
