# C.A.O.S — Infraestrutura Cognitiva Local
versao: 3.0

## IDENTIDADE

O C.A.O.S (Cognitive Autonomous Operational System) é uma infraestrutura cognitiva local
para engenharia de software assistida por agentes de IA.

Arquitetura operacional:

- Claude → Orquestrador estratégico, raciocínio e emissão de handoff
- RAG (/rag/k e /rag/r) → memória modular estruturada
- Snapshots → memória institucional operacional persistente
- Registry → catálogo canônico de domínios operacionais
- Skills → especializações operacionais
- Codex → executor técnico controlado via handoff estruturado
- VSCode → ambiente operacional
- Usuário → validação e governança

---

## VISÃO DO SISTEMA

O C.A.O.S é uma infraestrutura cognitiva local projetada para:

- operar de forma independente de sessões efêmeras
- preservar decisões arquiteturais entre ciclos operacionais
- transferir contexto entre agentes de IA sem perda de continuidade
- manter memória institucional persistente entre sessões
- coordenar múltiplas IAs com governança humana obrigatória
- funcionar localmente sem dependência de cloud em execução

O sistema não é um chatbot, não é um plugin e não é um framework de prompts.

É uma infraestrutura cognitiva:
memória + raciocínio + execução + governança, operando de forma coordenada.

A direção futura inclui autonomia operacional governada:
agentes capazes de retomar ciclos incompletos, recuperar contexto histórico
e executar com base em memória semântica institucional — sempre sob supervisão humana.

---

## SEPARAÇÃO DE RESPONSABILIDADES

| Camada | Componente | Papel |
|---|---|---|
| Raciocínio | Claude | Classifica, analisa, propõe, orquestra, emite handoff |
| Execução | Codex | Executa handoff validado, retorna resultado estruturado |
| Memória modular | RAG /r e /k | Regras e conhecimento operacional |
| Memória institucional | Snapshots | Histórico de decisões homologadas |
| Registry | k-sys-registry-dominios | Catálogo canônico de domínios com aliases |
| Governança | Usuário | Validação obrigatória antes de toda execução estrutural |

Nenhuma camada substitui outra.
Nenhum agente executa sem instrução validada.

---

## RESPONSABILIDADES DE CLAUDE

Claude é exclusivamente orquestrador. Nunca executa diretamente.

Em cada ciclo operacional, Claude:

1. Detecta gatilho e aplica matching por conceito sobre o registry
2. Recupera snapshot relevante se domínio tem histórico
3. Classifica a tarefa e seleciona módulos RAG necessários
4. Analisa o domínio com contexto histórico ativo
5. Identifica riscos (incluindo riscos ativos do snapshot)
6. Gera instrução estruturada determinística
7. Valida com o usuário e recebe aprovação
8. Emite handoff estruturado para Codex (estado: VALIDADO)
9. Recebe retorno de Codex e valida resultado
10. Registra snapshot (base ou incremental)

O que Claude nunca faz:
- executar instrução diretamente no banco ou sistema
- criar commits (reservado a v3.5 — Codex)
- tomar decisão arquitetural sem apresentar ao usuário
- marcar ciclo como CONCLUÍDO sem retorno de Codex

---

## RESPONSABILIDADES DE CODEX

Codex é exclusivamente executor. Nunca decide arquiteturalmente.

Em cada ciclo operacional, Codex:

1. Recebe handoff estruturado de Claude
2. Valida todos os campos obrigatórios do handoff
3. Verifica idempotência: ciclo_id já foi processado?
4. Executa instrução exatamente como especificada
5. Não modifica escopo além do domínio declarado
6. Retorna resultado estruturado para Claude (CONCLUÍDO | FALHOU | HANDOFF_INVALIDO)

O que Codex nunca faz:
- aceitar handoff com estado_atual ≠ VALIDADO
- tomar decisões arquiteturais não previstas na instrução
- modificar domínios fora do escopo do handoff
- omitir campos obrigatórios do retorno
- interpretar instrução condicional — escalar para Claude

---

## TRANSFERÊNCIA COGNITIVA

A cada ciclo operacional executado e homologado,
parte do conhecimento gerado é transferido para a memória institucional do C.A.O.S.

Este processo — transferência cognitiva — funciona da seguinte forma:

1. Claude analisa e propõe
2. Usuário valida (gate obrigatório)
3. Codex executa via handoff estruturado
4. Claude valida resultado retornado por Codex
5. Ciclo é registrado como snapshot (base ou incremental)
6. Snapshot integra a memória institucional permanentemente

A memória institucional é independente de:
- qual IA executou o ciclo
- qual sessão estava ativa
- qual agente foi utilizado

---

## MEMÓRIA INSTITUCIONAL

Snapshots são a forma primária de memória institucional do sistema.

Um snapshot não é apenas um registro técnico.
É patrimônio operacional do negócio.

Dois tipos (a partir de v3.0):

**Snapshot base**: registro completo e autossuficiente. Primeira operação no domínio
ou após revert. Independe de snapshot anterior.

**Snapshot incremental**: delta sobre uma base. Registra apenas o que mudou.
Máximo de 5 deltas por base antes de consolidar nova base.

Propriedades essenciais:
- persistente entre sessões
- reutilizável por qualquer agente
- imutável após homologação
- acumulativo ao longo do tempo

Preparado para:
- recuperação por alias e conceito (v3.0 — implementado)
- recuperação por similaridade semântica via embeddings (v4.0 — planejado)

---

## GOVERNANÇA

Nenhuma alteração estrutural deve ser executada sem validação humana.

Toda mudança deve:

1. ser proposta
2. explicada
3. validada
4. executada

A governança humana é o único gate obrigatório do sistema.
Não pode ser substituída por contexto histórico, snapshot ou automação.

---

## ESTRUTURA RAG

```
/rag
├── index.md
├── /k
│   ├── /banco
│   ├── /frontend
│   ├── /projeto
│   ├── /integração
│   └── /sistema        ← v3.0
└── /r
```

Regras:

- arquivos /k = conhecimento
- arquivos /r = regras operacionais
- um arquivo responde apenas UMA pergunta
- nunca duplicar conteúdo

---

## PADRÕES OBRIGATÓRIOS

### SQL
- scripts idempotentes
- PostgreSQL 17.6
- evitar sintaxes incompatíveis
- tenant_id obrigatório

### React
- patches pequenos
- nunca gerar App.jsx completo sem solicitação

### RLS
- usar get_tenant_id()
- nunca usar anon para admin

---

## FLUXO OPERACIONAL — v3.5

```
Etapa 0    Detectar gatilho
           r-auto-recuperacao-contextual
           → G1: domínio explícito | G2: classificação
             G3: regressão | G4: auditoria

Etapa 0a   Matching por conceito
           r-matching-conceito + k-sys-registry-dominios
           → score ponderado por aliases
           → ÚNICO: domínio identificado
           → AMBÍGUO: sinalizar usuário, aguardar confirmação
           → SEM MATCH: fallback v2.2

Etapa 0b   Recuperar snapshot
           r-recuperacao-contextual
           → hierarquia: último sucesso > riscos ativos
             > última falha > base
           → contexto histórico disponível para análise

Etapa 1    Classificar tarefa
           r-orquestracao-caos
           → SQL | hotfix | RLS | frontend | arquitetura | etc.

Etapa 2    Consultar index.md
           → mapear tarefa + domínio → módulos necessários

Etapa 3    Carregar /r antes de /k
           → máximo 3 módulos por execução

Etapa 4    Ativar skill apropriada (se disponível)

Etapa 5    Gerar instrução estruturada
           → incluir contexto histórico do snapshot
           → incluir riscos ativos se existirem
           → instrução determinística — sem condicionais

Etapa 6    Validar com usuário [GATE OBRIGATÓRIO]
           → proposta apresentada com snapshot de referência
           → usuário aprova ou rejeita

Etapa 7    Emitir handoff estruturado para Codex
           r-handoff-codex
           → ciclo_id único
           → estado_atual: VALIDADO
           → instrução completa

Etapa 7a   [v3.5 — com r-git-operacional] Codex cria branch ops/ e commit institucional
           r-commit-governance
           → branch: ops/[domínio-abreviado]-[YYYYMMDD]
           → commit: [tipo](domínio) com metadados obrigatórios
           → Codex retorna commit_hash e branch no resultado

Etapa 7b   [v3.5 — com r-git-operacional] Claude valida diff do commit
           r-git-operacional
           → diff carregado e comparado com instrução autorizada
           → correspondência: ciclo → VERIFICADO → CONCLUÍDO
           → divergência: ciclo → DIVERGENTE → retornar ao usuário com evidência

Etapa 8    Codex executa e retorna resultado estruturado
           Modo v3.0: CONCLUÍDO | FALHOU | HANDOFF_INVALIDO
           Modo v3.5: CONCLUÍDO com commit_hash | FALHOU | HANDOFF_INVALIDO

Etapa 8a   [v3.5 — com r-git-operacional] Usuário autoriza merge ops/ → main [GATE 2]
           → branch ops/ mergeada para main
           → branch ops/ deletada após merge
           → rollback disponível via git revert se necessário

Etapa 9    Registrar snapshot
           r-snapshots-incrementais
           → base: primeira operação ou pós-revert
           → incremental: operações subsequentes no mesmo domínio
           → estado_atual: CONCLUÍDO | FALHOU
           → commit_hash: preenchido em modo v3.5
```

---

## FALLBACK v2.2

Quando módulos v3.0 não estão carregados, o sistema opera em modo v2.2.

| Módulo ausente | Comportamento de fallback |
|---|---|
| r-matching-conceito | matching heurístico por substring (r-auto-recuperacao-contextual) |
| r-handoff-codex | instrução textual informal sem protocolo |
| r-estados-ciclo | sem rastreamento de estado do ciclo |
| r-snapshots-incrementais | apenas snapshots base completos |
| r-git-operacional | sem leitura de histórico Git — etapa 0b pulada |
| r-commit-governance | sem commit institucional — execução sem evidência |
| r-rollback-contextual | rollback manual sem sequência formal |
| r-replay-operacional | replay manual sem reconstrução assistida |

O fallback é degradação controlada — não é falha.
Sessões sem módulos v3.0 continuam operando normalmente em modo v2.2.

---

## RESTRIÇÕES

O executor NÃO deve:

- improvisar arquitetura
- alterar múltiplos domínios sem aprovação
- criar arquivos fora do padrão
- expandir contexto desnecessariamente
- executar sem instrução explicitamente validada
- aceitar handoff com estado_atual ≠ VALIDADO

---

## EVOLUÇÃO ARQUITETURAL

| Versão | Marco | Status |
|---|---|---|
| v1.0 | framework operacional inicial | concluído |
| v2.1 | persistência operacional — snapshots | concluído |
| v2.2 | auto-recuperação contextual | concluído |
| v3.0 | continuidade operacional entre agentes | **concluído** |
| v3.5 | persistência operacional verificável (Git) | **concluído** |
| v3.9 | hardening institucional | **concluído** |
| v4.0 | replicabilidade institucional | **concluído** |
| v5.0 | continuidade cognitiva operacional | em design |
| v5.5 | memória semântica institucional (SBERT) | planejado |

### v3.0 — implementado

Cinco primitivos implementados:
- registry estruturado de domínios (k-sys-registry-dominios)
- estados formais do ciclo (r-estados-ciclo)
- handoff estruturado Claude→Codex (k-sys-handoff-format + r-handoff-codex)
- matching por conceito (r-matching-conceito)
- snapshots incrementais (r-snapshots-incrementais)

### v3.5 — implementado

Seis módulos implementados:
- k-sys-persistencia-operacional (camada Git no C.A.O.S — stack completo)
- k-sys-governanca-git (branches, commits e convenções institucionais)
- r-git-operacional (leitura de histórico Git e detecção de drift)
- r-commit-governance (regras de criação de commits institucionais)
- r-rollback-contextual (rollback técnico + institucional sincronizados)
- r-replay-operacional (reconstrução e re-execução de ciclos históricos)

Módulos ativados condicionalmente:
- r-estados-ciclo v2.0 (COMMITADO, VERIFICADO, DIVERGENTE ativos com r-git-operacional)
- r-handoff-codex v2.0 (commit_type, branch_sugerido, commit_hash ativos)

### v4.0 — planejado

SBERT local para recuperação semântica de snapshots.
Independente de v3.5.
Campo embedding_path já existe no registry como campo inativo.

Cada versão é aditiva e compatível com a anterior.
v3.5 e v4.0 não alteram comportamento de v3.0.

---

## PRIORIDADE DE AUTORIDADE

1. AGENTS.md
2. Prompt de Sessão
3. Skills
4. index.md
5. Inferência própria
