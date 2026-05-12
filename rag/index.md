# RAG Index — Afeto em Forma
versao: 8.0

---

# REGRA PRINCIPAL

Carregar apenas módulos necessários.

Nunca carregar o RAG inteiro.

Máximo recomendado:
3 módulos por tarefa.

---

# SEPARAÇÃO DE RESPONSABILIDADES

| Camada | Componente | Papel |
|---|---|---|
| Raciocínio | Claude | Classifica, analisa, propõe, orquestra, emite handoff |
| Execução | Codex | Executa handoff validado, retorna resultado estruturado |
| Memória modular | RAG /r e /k | Regras e conhecimento operacional |
| Memória institucional | Snapshots | Histórico de decisões homologadas |
| Registry de domínios | k-sys-registry-dominios | Catálogo canônico com aliases e pesos |
| Governança | Usuário | Validação obrigatória antes de toda execução estrutural |

---

# ORDEM DE CARREGAMENTO

```
Etapa 0   → Detectar gatilho (r-auto-recuperacao-contextual)
Etapa 0a  → Matching por conceito (r-matching-conceito + k-sys-registry-dominios)
            se match único → prosseguir
            se AMBÍGUO     → sinalizar usuário, aguardar esclarecimento
            se SEM MATCH   → fallback v2.2
Etapa 0b  → Recuperar snapshot (r-recuperacao-contextual)
            se domínio com histórico → carregar snapshot prioritário
Etapa 1   → /r  (regras — carregar antes de /k)
Etapa 2   → /k  (conhecimento)
```

A detecção ocorre antes de qualquer carregamento.
O snapshot deve vir antes das regras.
As regras devem vir antes do conhecimento.
Máximo 3 módulos /r + /k por execução.

---

# FALLBACK v2.2

Quando módulos v3.0 não estiverem carregados, o sistema opera em modo v2.2:

| Capacidade | Modo v3.0 | Fallback v2.2 |
|---|---|---|
| Matching de domínio | score ponderado por aliases (r-matching-conceito) | heurístico por substring (r-auto-recuperacao-contextual) |
| Handoff Claude→Codex | protocolo estruturado (r-handoff-codex) | instrução textual informal |
| Rastreamento de estados | estados formais (r-estados-ciclo) | sem rastreamento |
| Snapshots | base + incremental (r-snapshots-incrementais) | somente base |
| Leitura Git + drift | r-git-operacional ativo | etapa 0b pulada |
| Commits institucionais | r-commit-governance ativo | sem evidência verificável |
| Rollback formal | r-rollback-contextual ativo | rollback manual |
| Replay assistido | r-replay-operacional ativo | replay manual |

O fallback não é erro — é degradação controlada.
Todos os módulos v3.0 são aditivos. Sua ausência não quebra o sistema.

---

# TAREFA → MÓDULOS

| Tarefa | Arquivo 1 | Arquivo 2 | Arquivo 3 |
|---|---|---|---|
| Script SQL | r/r-sql-idiomatico | k/banco/k-db-tabelas-core | r/r-rls-padrao |
| Policy RLS | r/r-rls-padrao | k/banco/k-db-funcoes | k/banco/k-db-tabelas-core |
| Hotfix Checkout | r/r-hotfix-padrao | k/frontend/k-fe-checkout | k/integracao/k-int-supabase-client |
| Hotfix Admin | r/r-hotfix-padrao | k/frontend/k-fe-admin-* | — |
| Hotfix Auth | r/r-hotfix-padrao | k/frontend/k-fe-auth-context | — |
| Multi-tenant | k/projeto/k-proj-roadmap | k/banco/k-db-funcoes | r/r-rls-padrao |
| Erro 401/403 | r/r-rls-padrao | k/banco/k-db-funcoes | k/integracao/k-int-supabase-client |
| Mudança Visual | r/r-design-padrao | k/frontend/k-fe-css-tokens | — |
| Relatório | r/r-relatorio-padrao | — | — |
| Orientação Geral | k/projeto/k-proj-identidade | k/projeto/k-proj-decisoes | — |
| Domínio com histórico | r/r-recuperacao-contextual | — | — |
| Orquestração / sessão nova | r/r-orquestracao-caos | — | — |
| Atualização do RAG | r/r-atualizacao-rag | — | — |
| Handoff estruturado | r/r-handoff-codex | k/sistema/k-sys-handoff-format | r/r-estados-ciclo |
| Retomada de ciclo | r/r-estados-ciclo | r/r-recuperacao-contextual | k/sistema/k-sys-handoff-format |
| Matching de domínio | r/r-matching-conceito | k/sistema/k-sys-registry-dominios | — |
| Snapshot incremental | r/r-snapshots-incrementais | r/r-recuperacao-contextual | — |
| Commit institucional | r/r-commit-governance | k/sistema/k-sys-governanca-git | r/r-git-operacional |
| Rollback de ciclo | r/r-rollback-contextual | r/r-estados-ciclo | — |
| Replay de ciclo | r/r-replay-operacional | r/r-recuperacao-contextual | — |
| Auditoria Git | r/r-git-operacional | k/sistema/k-sys-persistencia-operacional | — |

---

# MÓDULOS EXISTENTES

## /r

| Arquivo | Versão | Finalidade |
|---|---|---|
| r-sql-idiomatico | 1.0 | regras para migrations SQL |
| r-rls-padrao | 1.0 | regras de isolamento multi-tenant |
| r-hotfix-padrao | 1.0 | padrão de hotfix cirúrgico no frontend |
| r-orquestracao-caos | v1.1 | comportamento do orquestrador Claude |
| r-atualizacao-rag | v1.1 | quando e como evoluir o RAG |
| r-recuperacao-contextual | 1.1 | recuperação de snapshots históricos entre sessões |
| r-auto-recuperacao-contextual | 1.0 | detecção automática de domínios e disparo de recovery |
| r-estados-ciclo | 2.0 | estados formais do ciclo — COMMITADO/VERIFICADO/DIVERGENTE ativos |
| r-handoff-codex | 2.0 | protocolo handoff — campos v3.5 ativos condicionalmente |
| r-matching-conceito | 1.0 | matching por score ponderado de aliases |
| r-snapshots-incrementais | 1.0 | cadeia de deltas sobre snapshot base |
| r-git-operacional | 1.0 | leitura e interpretação do histórico Git |
| r-commit-governance | 1.0 | regras de criação de commits institucionais |
| r-rollback-contextual | 1.0 | rollback técnico + institucional sincronizados |
| r-replay-operacional | 1.0 | reconstrução e re-execução de ciclos históricos |

---

## /k/banco

| Arquivo | Finalidade |
|---|---|
| k-db-tabelas-core | estrutura operacional do banco |
| k-db-funcoes | funções estratégicas do sistema |

---

## /k/sistema

| Arquivo | Versão | Finalidade |
|---|---|---|
| k-sys-registry-dominios | 1.0 | catálogo canônico de domínios com aliases e pesos |
| k-sys-handoff-format | 1.0 | estrutura dos documentos handoff e retorno |
| k-sys-persistencia-operacional | 1.0 | camada Git no C.A.O.S — stack completo |
| k-sys-governanca-git | 1.0 | branches, commits e convenções operacionais Git |

---

# PRINCÍPIOS

Cada módulo:
- responde uma única pergunta
- possui escopo isolado
- evita duplicação
- reduz tokens

---

# EVOLUÇÃO ARQUITETURAL

| Versão | Marco | Status |
|---|---|---|
| v2.1 | persistência operacional — snapshots | concluído |
| v2.2 | auto-recuperação contextual | concluído |
| v3.0 | continuidade operacional entre agentes | **concluído** |
| v3.5 | persistência operacional verificável (Git) | **concluído** |
| v4.0 | memória semântica institucional (SBERT) | planejado |

### v3.0 — módulos implementados

| Módulo | Tipo | Primitivo |
|---|---|---|
| k-sys-registry-dominios | /k | registry estruturado de domínios |
| r-estados-ciclo | /r | estados formais do ciclo |
| k-sys-handoff-format | /k | estrutura canônica do handoff |
| r-handoff-codex | /r | protocolo handoff Claude→Codex |
| r-matching-conceito | /r | matching por score ponderado |
| r-snapshots-incrementais | /r | cadeia incremental de deltas |

### v3.5 — módulos implementados

| Módulo | Tipo | Capacidade |
|---|---|---|
| k-sys-persistencia-operacional | /k | camada Git — stack conceitual |
| k-sys-governanca-git | /k | convenções de branch e commit |
| r-git-operacional | /r | leitura Git + detecção de drift |
| r-commit-governance | /r | governança de commits institucionais |
| r-rollback-contextual | /r | rollback técnico + institucional |
| r-replay-operacional | /r | replay assistido de ciclos históricos |

Módulos ativados condicionalmente (Sprint 4):
- r-estados-ciclo v2.0 (COMMITADO, VERIFICADO, DIVERGENTE com r-git-operacional)
- r-handoff-codex v2.0 (campos commit_type, branch_sugerido, commit_hash ativos)

### v4.0 — módulos previstos

- k/sistema/k-sys-camada-semantica
- r/r-semantic-retrieval
- r/r-embedding-management

---

# OBJETIVO FINAL

Transformar documentação:
em memória operacional reutilizável.

Transformar memória operacional:
em continuidade institucional entre agentes.
