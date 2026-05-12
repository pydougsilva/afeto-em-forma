-- ============================================================
--  AFETO EM FORMA — Sprint 1: Catálogo Dinâmico
--  Versão Corrigida (compatível com PostgreSQL 17.6)
--  Idempotente: seguro para re-execução.
-- ============================================================

-- SEÇÃO 1 — TABELA PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT          NOT NULL,
  descricao   TEXT,
  preco       DECIMAL(10,2) NOT NULL,
  categoria   TEXT          NOT NULL CHECK (categoria IN ('Bolo','Pão','Biscoito')),
  emoji       TEXT          NOT NULL DEFAULT '📦',
  ativo       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- SEÇÃO 2 — TRIGGER UPDATED_AT
DROP TRIGGER IF EXISTS trg_produtos_updated_at ON produtos;
CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- SEÇÃO 3 — ÍNDICES
CREATE INDEX IF NOT EXISTS idx_produtos_ativo
  ON produtos (ativo)
  WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_produtos_categoria
  ON produtos (categoria);

-- SEÇÃO 4 — CONSTRAINT DE UNICIDADE (CORRIGIDA)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'produtos_nome_categoria_unique'
      AND conrelid = 'produtos'::regclass
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_nome_categoria_unique
      UNIQUE (nome, categoria);
  END IF;
END $$;

-- SEÇÃO 5 — ROW LEVEL SECURITY
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select_ativos"
  ON produtos FOR SELECT
  TO anon, authenticated
  USING (ativo = TRUE);

CREATE POLICY "produtos_all_admin"
  ON produtos FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- SEÇÃO 6 — SEED: 7 produtos originais
INSERT INTO produtos (nome, descricao, preco, categoria, emoji, ativo) VALUES
  ('Bolo de Mel de Engenho', 'Especiarias mineiras, canela e cravo. Assado lentamente por 2h.', 65.00, 'Bolo', '🍯', TRUE),
  ('Bolo de Fubá Cremoso', 'Receita da vovó. Cremoso por dentro, casca dourada.', 55.00, 'Bolo', '🌽', TRUE),
  ('Bolo de Banana com Rapadura', 'Bananas da terra com rapadura artesanal do interior mineiro.', 60.00, 'Bolo', '🍌', TRUE),
  ('Pão Rústico de Forno a Lenha', 'Fermentação natural 24h. Casca espessa, miolo alveolado.', 28.00, 'Pão', '🍞', TRUE),
  ('Pão de Milho Verde', 'Milho verde moído na pedra. Textura densa e sabor adocicado.', 32.00, 'Pão', '🌽', TRUE),
  ('Biscoito de Polvilho Tradicional', 'Polvilho azedo no forno a lenha. Leve, crocante, zero conservantes.', 22.00, 'Biscoito', '⭕', TRUE),
  ('Biscoito de Polvilho Parmesão', 'Parmesão envelhecido na massa. Levemente salgado, irresistível.', 26.00, 'Biscoito', '🧀', TRUE)
ON CONFLICT (nome, categoria) DO NOTHING;



-- ============================================================
--  SEÇÃO 4 — VERIFICAÇÃO
-- ============================================================

-- Confirmar produtos inseridos:
-- SELECT id, emoji, nome, categoria, preco, ativo FROM produtos ORDER BY categoria, nome;

-- Confirmar policies:
-- SELECT policyname, cmd, roles FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'produtos';

-- ============================================================
--  FIM DA SPRINT 1
-- ============================================================