# r-recuperacao-contextual
versao: 1.1

## OBJETIVO

Definir como o C.A.O.S recupera contexto histórico antes de novas execuções,
utilizando ciclos passados como memória operacional ativa.

---

## PRINCÍPIO CENTRAL

Antes de executar, perguntar:
este domínio já foi operado antes?

Se sim:
recuperar snapshot relevante antes de carregar módulos novos.

---

## O QUE É UM SNAPSHOT

Um snapshot é o registro compacto de um ciclo operacional homologado.

Contém:

| Campo         | Descrição                                               |
|---|---|
| id            | identificador sequencial por domínio (001, 002...)      |
| tipo          | base (autossuficiente) ou incremental (delta)           |
| tarefa        | classificação do ciclo                                  |
| domínio       | tabela, componente ou fluxo afetado                     |
| módulos usados| lista de /r e /k carregados                             |
| decisão       | o que foi proposto e validado                           |
| resultado     | sucesso, falha, pendente ou auditoria                   |
| data          | quando o ciclo foi executado                            |
| riscos vistos | riscos identificados durante a análise                  |
| riscos ativos | riscos ainda não resolvidos após o ciclo                |
| estado_atual  | estável, degradado, desconhecido, em_manutenção         |

---

## CRITÉRIOS DE RELEVÂNCIA

Recuperar snapshot quando:

1. o domínio alvo já apareceu em ciclo anterior (mesma tabela, mesmo componente)
2. a classificação da tarefa coincide com ciclo passado (ex: Policy RLS → já houve hotfix RLS)
3. há suspeita de regressão ou drift arquitetural

Não recuperar quando:

- domínio completamente novo, sem histórico
- tarefa de orientação geral sem execução
- ciclo anterior marcado como falha sem resolução documentada

---

## ORDEM DE RECUPERAÇÃO

1. verificar se existe snapshot para o domínio alvo
2. aplicar hierarquia de prioridade (ver seção abaixo)
3. carregar snapshot selecionado (contexto mínimo — apenas campos relevantes)
4. carregar /r necessários
5. carregar /k necessários
6. executar com contexto histórico ativo

A recuperação de snapshot precede o carregamento de módulos RAG.

---

## HIERARQUIA DE PRIORIDADE DE RECUPERAÇÃO

Quando múltiplos snapshots existem para o mesmo domínio, aplicar nesta ordem:

| Prioridade | Critério                                              | Motivo                                        |
|---|---|---|
| 1          | último snapshot com resultado = sucesso               | referência de estado válido mais recente      |
| 2          | snapshot mais recente com riscos_ativos preenchidos   | riscos pendentes exigem atenção antes de agir |
| 3          | snapshot com resultado = falha mais recente           | evitar repetir abordagem que não funcionou    |
| 4          | snapshot mais antigo como referência base             | contexto de origem do domínio                 |

Carregar apenas 1 snapshot por execução.
Em caso de empate de prioridade, usar o mais recente.

---

## LIMITES OPERACIONAIS

| Limite                      | Valor                            |
|---|---|
| Snapshots por execução      | máximo 1                         |
| Snapshots por domínio       | ilimitado (histórico acumulativo)|
| Módulos RAG por execução    | máximo 3                         |
| Campos do snapshot          | apenas os relevantes à tarefa    |
| Histórico retroativo        | guiado pela hierarquia acima     |

Nunca carregar múltiplos snapshots em paralelo na mesma execução.

---

## SNAPSHOTS EXISTENTES

### public.audit_logs — snapshot-001
- id: 001
- tipo: base
- tarefa: hotfix-rls
- domínio: public.audit_logs
- módulos: r/r-rls-padrao, k/banco/k-db-funcoes
- decisão: substituir subquery email_admin por get_tenant_id() + is_tenant_admin(); adicionar cobertura is_platform_admin()
- resultado: sucesso
- data: 2026-05-09
- riscos vistos: cross-tenant por email, ausência platform_admin, performance subquery, inconsistência de padrão
- riscos ativos: nenhum
- estado_atual: estável

---

### public.audit_logs — snapshot-002
- id: 002
- tipo: incremental
- base: 001
- tarefa: auditoria-verificacao
- domínio: public.audit_logs
- módulos: r/r-handoff-codex, r/r-recuperacao-contextual
- decisão: |
    Verificação empírica do estado pós-hotfix via SELECT em pg_policies.
    Estado confirmado em produção (2026-05-15): 2 policies presentes, sem drift.

    Políticas verificadas:
    1. audit_logs_platform_admin — CMD: ALL
       qual: is_platform_admin()
       with_check: is_platform_admin()
       Significado: platform admin tem acesso irrestrito (leitura e escrita) ao audit_log.

    2. audit_logs_select_tenant_admin — CMD: SELECT
       qual: ((tenant_id = get_tenant_id()) AND is_tenant_admin())
       with_check: null
       Significado: tenant admin só pode ler registros do próprio tenant — não pode modificar trilha.

    Assimetria intencional de comandos (ALL vs SELECT): segurança por design.
    Platform admin pode modificar audit_log (necessário para operações de plataforma).
    Tenant admin só lê — a trilha de auditoria é imutável para o tenant.

    Nomes exatos de policy (ausentes no snapshot-001, agora documentados):
    - audit_logs_platform_admin
    - audit_logs_select_tenant_admin
- resultado: sucesso
- data: 2026-05-15
- riscos vistos: nenhum novo
- riscos ativos: nenhum
- estado_atual: estável
- ciclo_ref: ciclo-T4.1-audit-logs-20260513

---

### public.tenants — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.tenants
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Tabela core do multi-tenant. Armazena configuração de cada tenant (UUID PK).
    Toda operação no sistema depende de get_tenant_id() que referencia esta tabela.
    RLS deve ser extremamente restrita — nenhum tenant pode acessar dados de outro.
    fn_provision_tenant (provisionamento automatizado) estava planejada e não deployada na época.
    Onboarding de novos tenants era manual.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: fn_provision_tenant ausente torna onboarding manual e suscetível a inconsistência
- riscos ativos: fn_provision_tenant não deployada — onboarding de novos tenants é manual
- estado_atual: estável

---

### public.tenants — snapshot-002
- id: 002
- tipo: incremental
- base: 001
- tarefa: investigacao-multi-tenant
- domínio: public.tenants
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    CORREÇÃO DO RISCO DO SNAPSHOT-001:
    fn_provision_tenant está deployada (confirmado: criou segundo tenant com sucesso).
    Onboarding via fn_provision_tenant funciona: cria tenant + subscription + produtos seed.

    DISCOVERY CONFIRMADO — SEGUNDO TENANT:
    Origem: experimento de onboarding multi-tenant / white-label.
    Criado com fn_provision_tenant ou manualmente durante validação.
    Tenant piloto: id=7b5217d1-81ef-464e-83ae-8c8bb3b714f8 (afeto-em-forma) — operacional.
    Segundo tenant: detalhes aguardam T-MT.1a para documentação completa.

    COMPORTAMENTO EMERGENTE IDENTIFICADO:
    O login do usuário admin do segundo tenant não funcionou operacionalmente.
    Causa raiz desconhecida — investigação T-MT.1a pendente.

    STATUS: primeiro caso empírico de comportamento emergente multi-tenant.
    Não remover segundo tenant antes de concluir investigação T-MT.1a.
- resultado: pendente
- data: 2026-05-15
- riscos vistos: login do segundo tenant não funciona operacionalmente (causa desconhecida)
- riscos ativos: fluxo completo de onboarding+login+operação de novo tenant não homologado
- estado_atual: desconhecido

---

### public.tenants — snapshot-003
- id: 003
- tipo: incremental
- base: 002
- tarefa: auditoria-verificacao
- domínio: public.tenants
- módulos: r/r-handoff-codex, r/r-recuperacao-contextual
- decisão: |
    RESULTADO DE T-MT.1a (2026-05-15): banco está correto para multi-tenant.

    SEGUNDO TENANT IDENTIFICADO:
    - ID: e6840646-58ad-4ffd-8bb1-9064e3de48f2
    - Slug: teste-padaria
    - Nome: Padaria Teste
    - email_admin: dfsilva1903@gmail.com
    - Status: trial
    - Plano: free
    - Criado em: 2026-05-04
    - Dados: 1 profile, 1 subscription, 3 produtos, 0 fornadas

    HIPÓTESES H1–H4 REFUTADAS:
    - email_confirmed_at: 2026-05-04 (confirmado no mesmo dia)
    - profile: tenant_id correto, role=admin
    - policies: nenhuma hardcoda UUID do piloto
    - fn_custom_access_token_hook: injetaria tenant_id correto no próximo login

    HIPÓTESE H5 CONFIRMADA — FALHA É DE PRODUTO/FRONTEND:
    last_sign_in_at: null — usuário nunca completou um login com sessão registrada.
    Causa: App.jsx não tem slug routing. Sem /{slug}, o frontend não sabe qual
    contexto de tenant carregar após login bem-sucedido no Supabase.
    O login de Supabase auth funcionaria; a aplicação não saberia o que renderizar.

    OBSERVAÇÃO — 3 de 7 produtos esperados:
    fn_provision_tenant cria 7 seed products. Apenas 3 existem para teste-padaria.
    Possível causa: constraint UNIQUE(nome, categoria) em produtos não inclui tenant_id.
    Se confirmado: dois tenants não podem ter produtos com mesmo nome/categoria — blocker
    para white-label real. Requer verificação da constraint em ciclo posterior.

    SEPARAÇÃO CLARA:
    INFRAESTRUTURA (correto):
    - fn_handle_new_user v2, fn_custom_access_token_hook, get_tenant_id(), RLS
    PRODUTO (precisa de trabalho):
    - Slug routing /{slug} no App.jsx (blocker para multi-tenant real)
    - signUp frontend deve passar tenant_id no metadata
    - Constraint produtos_nome_categoria_unique deve incluir tenant_id
- resultado: auditoria
- data: 2026-05-15
- riscos vistos: slug routing ausente (blocker), constraint produtos sem tenant_id (possível blocker)
- riscos ativos: |
    - slug routing /{slug} não implementado — impede multi-tenant real (severidade: alta)
    - constraint produtos_nome_categoria_unique pode excluir tenant_id (severidade: média — verificar)
    - signUp frontend não passa tenant_id no metadata para clientes (severidade: alta)
- estado_atual: desconhecido (banco correto, produto incompleto)
- ciclo_ref: ciclo-T-MT.1a-tenants-20260515

---

### public.profiles — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.profiles
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Perfis de usuário vinculados ao auth.users via user_id. Campos: id, user_id, tenant_id, nome, telefone, role.
    role define admin vs cliente. RLS via get_tenant_id().
    CRÍTICO: joins DEVEM usar profiles!user_id(nome,telefone) — não profiles.id.
    fn_handle_new_user com tenant_id estava pendente ao criar este snapshot.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: fn_handle_new_user sem tenant_id, inconsistência entre role e permissões Auth
- riscos ativos: fn_handle_new_user sem suporte a tenant_id — novos usuários não recebem tenant_id automaticamente
- estado_atual: estável

---

### public.profiles — snapshot-002
- id: 002
- tipo: incremental
- base: 001
- tarefa: auditoria-verificacao
- domínio: public.profiles
- módulos: r/r-handoff-codex, r/r-recuperacao-contextual
- decisão: |
    Verificação empírica via inspeção arquitetural (T6.1a, 2026-05-15).

    RISCO ATIVO DO SNAPSHOT-001 RESOLVIDO:
    fn_handle_new_user v2 está deployada em produção.
    Confirmado: lê tenant_id de raw_user_meta_data + fallback email_admin.
    0 profiles com tenant_id NULL (nenhum usuário afetado).
    Re-login não necessário.

    CADEIA CONFIRMADA OPERACIONAL:
    fn_handle_new_user v2 → profiles.tenant_id preenchido
    → fn_custom_access_token_hook → JWT app_metadata.tenant_id injetado
    → get_tenant_id() → RLS funciona

    SCHEMA REAL DE PROFILES (snapshot-001 incompleto):
    Colunas: id, nome, telefone, endereco, preferencias, tags, role, created_at, updated_at, tenant_id
    Nota: k-db-tabelas-core.md desatualizado — não documenta endereco, preferencias, tags.

    TRIGGER CONFIRMADO:
    trg_on_auth_user_created (AFTER INSERT ON auth.users) → fn_handle_new_user()

    DISCOVERY — SEGUNDO TENANT:
    2 tenants encontrados em produção (esperado: 1).
    Tenant piloto confirmado: id=7b5217d1-81ef-464e-83ae-8c8bb3b714f8, slug=afeto-em-forma.
    Segundo tenant: dados não retornados na inspeção. Origem provável: teste de fn_provision_tenant.
    Requer confirmação do usuário antes de qualquer ação.

    LIÇÃO ARQUITETURAL:
    Snapshots de auditoria-inicial refletem estado arquitetural CONHECIDO na época de criação —
    não estado verificado em produção. Sempre executar verificação antes de deploy baseado em
    risco_ativo de snapshot tipo auditoria-inicial.
- resultado: sucesso
- data: 2026-05-15
- riscos vistos: segundo tenant de origem desconhecida em produção; k-db-tabelas-core.md desatualizado
- riscos ativos: segundo tenant requer investigação (origem e estado não confirmados)
- estado_atual: estável
- ciclo_ref: ciclo-T6.1a-profiles-inspect-20260515

---

### public.fornadas — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.fornadas
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Entidade central do modelo de negócio. Representa sessão de produção com capacidade limitada.
    Campos principais: id, tenant_id, data_entrega, vagas_total, ativo.
    view vagas_fornada calcula disponibilidade em tempo real.
    Phase 3 TODO identificado em fetchFornadas: slug routing para multi-tenant não implementado.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: slug routing ausente impede onboarding real de múltiplos tenants
- riscos ativos: slug routing para acesso por URL de tenant não implementado (Fase 3 pendente)
- estado_atual: estável

---

### public.produtos — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.produtos
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Catálogo operacional por tenant. Campos: id, tenant_id, nome, tipo, preco, ativo.
    Produtos com ativo=false não aparecem no catálogo público.
    Isolamento garantido por RLS + tenant_id.
    Phase 3 TODO em fetchProdutos: slug routing pendente.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: slug routing ausente, sem validação de estoque/disponibilidade no schema
- riscos ativos: slug routing para catálogo por tenant não implementado (Fase 3 pendente)
- estado_atual: estável

---

### public.pedidos — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.pedidos
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Registro de pedidos/agendamentos. Campos: id, tenant_id, user_id, fornada_id, status, valor_total.
    Vincula cliente autenticado à fornada. Usado em relatórios.
    Botão confirmar pedido está pendente na Fase 3 — status pode não ser atualizado corretamente.
    Dependência crítica: profiles via user_id (join obrigatório profiles!user_id).
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: fluxo de confirmação incompleto, dependência de profiles sem tenant_id (fn_handle_new_user pendente)
- riscos ativos: confirmação de pedido (botão + status update) não implementada — Fase 3 pendente
- estado_atual: estável

---

### public.itens_pedido — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.itens_pedido
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Itens individuais de cada pedido. Campos: id, tenant_id, pedido_id, produto_id, quantidade, preco_unitario.
    Dependência dupla: pedidos (via pedido_id) e produtos (via produto_id).
    Usado em métricas e relatórios de receita.
    Sem histórico operacional — nenhuma modificação direta realizada nesta tabela até hoje.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: nenhum identificado na auditoria inicial
- riscos ativos: nenhum
- estado_atual: estável

---

### public.subscriptions — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.subscriptions
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Controla planos/assinaturas dos tenants na plataforma. Família banco/financeiro.
    Acesso esperado via is_tenant_admin() para operações administrativas.
    Estrutura detalhada (campos, triggers, integração de billing) não está documentada no RAG.
    Nenhuma operação executada neste domínio até hoje.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: ausência de documentação detalhada — modelo de billing não especificado no RAG
- riscos ativos: documentação de billing/subscriptions ausente — qualquer operação exige auditoria prévia do schema
- estado_atual: desconhecido

---

### public.platform_metrics — snapshot-001
- id: 001
- tipo: base
- tarefa: auditoria-inicial
- domínio: public.platform_metrics
- módulos: r/r-rls-padrao, k/banco/k-db-tabelas-core
- decisão: |
    Métricas de plataforma. Família banco/plataforma. Acesso restrito a is_platform_admin().
    Estrutura detalhada não documentada no RAG atual.
    Nenhuma operação executada neste domínio até hoje.
    Tab "plataforma" em App.jsx existe — dados desta tabela provavelmente já são consumidos pelo frontend.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: estrutura da tabela não documentada no RAG; acesso platform_admin não verificado
- riscos ativos: documentação de platform_metrics ausente — qualquer operação exige auditoria prévia do schema
- estado_atual: desconhecido

---

## REGRA DE APLICAÇÃO

Ao identificar nova tarefa em domínio com snapshot existente:

1. carregar snapshot de maior prioridade (ver hierarquia)
2. verificar se decisão anterior ainda é válida
3. checar riscos_ativos — se houver, incluir na análise atual
4. ajustar proposta com base no histórico
5. registrar novo snapshot ao final do ciclo homologado

---

## ATUALIZAÇÃO DE SNAPSHOTS

Após cada ciclo homologado e executado:

- criar novo snapshot no domínio (id sequencial)
- registrar resultado real (não esperado)
- preencher riscos_ativos com o que permanece pendente
- não editar snapshots anteriores — apenas acrescentar
- atualizar este arquivo e o index.md se necessário

---

### frontend/App.jsx — snapshot-001
- id: 001
- tipo: base
- tarefa: multi-tenant-white-label
- domínio: frontend/App.jsx
- módulos: k/frontend/k-fe-app-estrutura
- decisão: |
    Ciclo T-MT.1b ativou o white-label multi-tenant (2026-05-15).

    O slug routing JÁ ESTAVA IMPLEMENTADO antes deste ciclo:
    - getRouteTenantSlug(): URL → slug
    - resolveTenant(): slug → activeTenant via tenant_public view
    - fetchFornadas/fetchProdutos: .eq("tenant_id", activeTenant.id)
    - AuthScreen: tenantId={activeTenant?.id}
    - signUp: passa tenant_id em raw_user_meta_data

    BLOCKER ERA APENAS o vercel.json ausente (SPA hosting config).
    Sem ele, /{slug} retornava 404 do CDN antes do React carregar.

    Mudanças aplicadas:
    1. vercel.json: SPA rewrite — /{slug} não retorna 404
    2. Header: cidade/estado dinâmicos via activeTenant.cidade/estado
    3. CSS variables: useEffect([activeTenant]) aplica cor_primaria/cor_acento
       com fallback para cores padrão do piloto quando null
    4. Encoding: strings de loading/erro corrigidas (🔥, negócio, não encontrado)

    Lição: a Fase 3 estava mais avançada do que os snapshots indicavam.
    O diagnóstico T-MT.1a foi necessário para revelar isso.
- resultado: sucesso
- data: 2026-05-15
- riscos vistos: constraint produtos_nome_categoria_unique pode não incluir tenant_id
- riscos ativos: |
    - constraint produtos (nome, categoria) sem tenant_id: dois tenants não podem ter produtos
      com mesmo nome/categoria — verificar via query antes do próximo ciclo em produtos
- estado_atual: estável
- ciclo_ref: ciclo-T-MT.1b-frontend-20260515

---

## PROTOCOLO DE PRIMEIRO SNAPSHOT

Ao operar em domínio com `snapshots: []` no registry:

**OBRIGATÓRIO ao encerrar a sessão:**

1. verificar: este domínio tinha snapshots antes desta sessão?
   - SIM → atualizar snapshot existente (incremental ou base pós-revert)
   - NÃO → criar snapshot base com conteúdo mínimo abaixo

**Conteúdo mínimo do snapshot de primeiro ciclo:**

```
- id: [domínio]-001
- tipo: base
- tarefa: auditoria-inicial | [tipo real da operação]
- domínio: [canônico — schema.tabela]
- módulos: [lista dos /r e /k usados]
- decisão: [o que foi observado, analisado ou executado — mesmo que sem execução direta]
- resultado: auditoria | sucesso | falha | pendente
- data: [YYYY-MM-DD]
- riscos vistos: [lista — pode ser vazia se nenhum identificado]
- riscos ativos: [lista dos não resolvidos]
- estado_atual: estável | degradado | desconhecido | em_manutenção
```

**Regra:**
- Não precisa ser perfeito. Precisa existir.
- Snapshot ausente viola Contrato 2 (r-continuidade-cognitiva).
- A próxima sessão pagará o custo da ausência.

---

## PROIBIÇÕES

Nunca:
- recuperar snapshot de domínio diferente do alvo
- usar snapshot com resultado = falha como referência positiva
- substituir validação humana por contexto histórico
- carregar mais de 1 snapshot por execução
- editar snapshots já registrados (imutabilidade do histórico)
- expandir snapshot além dos campos definidos
- encerrar sessão em domínio operado sem snapshot correspondente

---

## RESULTADO ESPERADO

O C.A.O.S deve:
- operar com memória acumulada entre sessões
- reduzir redundância de análise em domínios conhecidos
- preservar decisões arquiteturais homologadas
- detectar regressões em domínios já operados
- escalar o histórico sem aumentar o contexto por execução
