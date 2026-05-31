# Sprint Readiness — 2026-05-31
versao: 1.0
data: 2026-05-31
modo_operacional: nominal (Codex operante)

## ESTADO DO SISTEMA

### caos-core

```yaml
estado: LIMPO (working tree vazio pela primeira vez)
versao: v5.0 completo
commits_desde_bootstrap: 8 commits / 4 merges
artefatos_ativos:
  - /k/sistema: 10 módulos (3 novos desta sessão)
  - /r: 24 módulos (2 novos desta sessão — r-continuidade-cognitiva, r-executor-contingencia)
  - /docs/validacoes: 3 artefatos (A1.0, A1.1, dependencia-nominal-residual) + index
  - /templates: AGENTS, snapshot, telemetria
pendencias_residuais:
  - MANUAL-OPERACIONAL: em afetoeforma, previsto para caos-core (v5.1)
  - DISTRIBUICAO-GITHUB: idem
  - validacoes T0.1, T0.1B, T2.1, T2.2: idem
  - k-proj-caos-metodo.md: drift nominal (hardening pendente)
```

### afetoeforma

```yaml
estado: limpo (exceto .vscode/mcp.json — fora de escopo)
versao_caos: v5.0 (Sprint 5A/5B concluídas)
versao_produto: Fase 3 (em andamento)
sprint_5c_contagem: 12/30 ciclos reais
cobertura_snapshots: 100% (10 domínios)
continuidade: Pleno (8 min retomada)
```

---

## OPÇÕES DE SPRINT

### OPÇÃO 1 — Sprint v5.1 Institucional (Limpeza)
**Prioridade:** Média | **Duração estimada:** 1-2 horas | **Executor:** Codex
**Bloqueador para:** v5.3 (Adapter Layer) ser executado com base limpa

Itens:
```
□ Remover rag/r/hotfix-padrao.md duplicata (afetoeforma)
□ Arquivar ou indexar k-proj-cooperacao-agentes.md (afetoeforma)
□ Popular ou remover snapshot-v2.1-inicial.md (afetoeforma)
□ Promover T0.1, T0.1B, T2.1, T2.2, CONVENCOES → caos-core
□ Promover MANUAL-OPERACIONAL, DISTRIBUICAO-GITHUB → caos-core
□ Atualizar k-proj-identidade.md (Sprint 5C: 12/30, C.A.O.S estado atual v5.0+)
□ Hardening nominal k-proj-caos-metodo.md (ambos os repos)
```

Módulos necessários: r-module-pruning, r-staleness-detection, r-atualizacao-rag

---

### OPÇÃO 2 — Sprint D Produto (Guest Orders + Meus Pedidos)
**Prioridade:** ALTA | **Duração estimada:** 3-5 horas | **Executor:** Codex
**Bloqueador para:** clientes sem conta (Jéssica) operarem o sistema

**Pré-verificação obrigatória (antes de qualquer código):**
```
□ constraint produtos_nome_categoria_unique: inclui tenant_id?
  → SQL: SELECT indexdef FROM pg_indexes WHERE indexname = 'produtos_nome_categoria_unique';
□ vagas_fornada view: tem security_invoker?
  → SQL: SELECT definition FROM pg_views WHERE viewname = 'vagas_fornada';
□ submitPedido: tenant_id vem de profile ou activeTenant?
  → App.jsx: buscar submitPedido e verificar fonte do tenant_id
```

**Domínios afetados:** public.pedidos, frontend/App.jsx
**Schema já suporta:** user_id nullable, nome_cliente, telefone_cliente (desde Sprint A)

**Entrega 1 — Admin: Formulário de pedido manual**
```
Admin pode criar pedido para cliente sem conta:
- nome_cliente (text)
- telefone_cliente (text)
- produtos selecionados
- fornada associada
- tenant_id do admin logado
```

**Entrega 2 — Cliente logado: Seção "Meus Pedidos"**
```
Cliente autenticado vê seus pedidos históricos:
- filtro por user_id
- estado do pedido (pendente/confirmado/pronto)
- data da fornada
```

Módulos necessários: r-sql-idiomatico, r-rls-padrao, r-hotfix-padrao,
k-db-tabelas-core, k-fe-app-estrutura, k-fe-auth-context

---

### OPÇÃO 3 — Sprint v5.3 Bootstrap Institucional Verificável
**Prioridade:** Baixa | **Duração estimada:** 2-3 horas
**Dependency:** v5.1 concluído
**Bloqueador para:** CLAUDE.md como adapter validado

Itens (decisão A1.1 aprovada):
```
□ Criar CLAUDE.md na raiz de caos-core e afetoeforma
  Conteúdo: ponteiro para AGENTS.md — não duplicar o protocolo
□ Criar .caos/adapters/ com adapters por ferramenta
□ Criar k-sys-adapter-layer.md em /k/sistema (caos-core)
□ Adicionar context_receipt ao template de telemetria
```

---

## SEQUÊNCIA RECOMENDADA

```
AGORA     → Sprint v5.1 (30-60 min, Codex executor, Orquestrador valida)
DEPOIS    → Sprint D produto (prioridade para Jéssica)
PARALELO  → Sprint v5.3 pode ser feito em qualquer momento após v5.1
```

**Justificativa:** v5.1 é pequeno e deixa o sistema em estado institucional perfeito
antes de qualquer sprint de produto. Não bloqueia Sprint D — pode ser feito antes ou em paralelo.

---

## MÓDULOS PARA CARREGAR NA PRÓXIMA SESSÃO

### Para Sprint v5.1
```
AGENTS.md
rag/index.md
r-module-pruning
r-staleness-detection
r-atualizacao-rag
k-sys-governanca-repositorios
```

### Para Sprint D (produto)
```
AGENTS.md
rag/index.md
r-sql-idiomatico
r-rls-padrao
r-hotfix-padrao
k-db-tabelas-core
k-fe-app-estrutura
k-fe-auth-context
```

---

## CONTRATOS ATIVOS RELEVANTES

- Continuidade mínima: criar snapshot se domínio novo for operado
- Gate humano: toda mudança SQL ou frontend exige validação antes de execução
- Modo nominal: ciclos degradados resetados — Codex como executor designado
- Sprint 5C: próximos ciclos reais incrementam contagem (atual: 12/30)
