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
    fn_provision_tenant (provisionamento automatizado) está planejada mas não deployada.
    Onboarding de novos tenants é atualmente manual.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: fn_provision_tenant ausente torna onboarding manual e suscetível a inconsistência
- riscos ativos: fn_provision_tenant não deployada — onboarding de novos tenants é manual
- estado_atual: estável

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
    fn_handle_new_user com tenant_id está pendente — novos usuários criados sem tenant_id.
- resultado: auditoria
- data: 2026-05-12
- riscos vistos: fn_handle_new_user sem tenant_id, inconsistência entre role e permissões Auth
- riscos ativos: fn_handle_new_user sem suporte a tenant_id — novos usuários não recebem tenant_id automaticamente
- estado_atual: estável

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
