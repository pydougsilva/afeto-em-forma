Claude, com base nos documentos do Projeto (schema_completo.sql, DOCUMENTACAO_FINAL.md e App_v5.1.jsx), execute a Fase 0 e a Fase 1 da migração multi-tenant do Afeto em Forma.

CONTEXTO IMPORTANTE: O banco de dados atual contém apenas dados de teste.
Não há risco de downtime ou perda de dados reais.

Use seu acesso ao Supabase (MCP) para inspecionar o schema atual antes de começar.

FASE 0 — TABELAS DE PLATAFORMA:
1. Gere o UUID do tenant piloto (Afeto em Forma)
2. Crie as tabelas tenants, subscriptions, audit_logs, platform_metrics
3. Insira o tenant piloto com slug 'afeto-em-forma', plano 'pro', status 'active'
4. Crie políticas RLS para as novas tabelas

FASE 1 — MULTI-TENANT NAS TABELAS DE NEGÓCIO:
1. Adicione tenant_id (UUID) em fornadas, pedidos, itens_pedido, produtos, profiles
2. Faça backfill com o UUID do tenant piloto
3. Torne NOT NULL
4. Crie índices compostos (tenant_id, ...)
5. Corrija constraints UNIQUE para incluir tenant_id
6. Atualize a VIEW vagas_fornada

REGRAS:
- Scripts IDEMPOTENTES
- PostgreSQL 17.6
- Documente cada etapa
- Forneça o script SQL completo ao final