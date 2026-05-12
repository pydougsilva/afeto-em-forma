# C.A.O.S v3.5 — Persistência Operacional Verificável

versao: 3.5
status: homologado — aguardando implementação
data: 2026-05-10
motivacao: formalização do Git como camada de evidência operacional verificável
depende-de: v3.0 (r-estados-ciclo, r-handoff-codex)
independente-de: v4.0 (SBERT, embeddings)
documenta: arquitetura Git institucional + estados verificáveis + rollback + replay

---

# 1. Introdução Arquitetural

O C.A.O.S v3.5 introduz a camada de persistência operacional verificável:
a integração estrutural do Git como mecanismo de evidência de execução
dentro da infraestrutura cognitiva do sistema.

Esta versão não muda o que o sistema decide.
Muda o que o sistema pode provar.

Antes de v3.5: execuções são registradas em snapshots — registros semânticos
de decisões homologadas. O snapshot documenta o que foi decidido.
Ninguém pode verificar objetivamente o que foi executado.

Com v3.5: cada execução produz um commit com metadados institucionais.
Dado um snapshot, localiza-se o diff exato. Dado um commit, localiza-se
a decisão que o autorizou. A rastreabilidade é completa e verificável
por qualquer agente ou stakeholder, em qualquer sessão futura.

---

# 2. O Problema da Auditabilidade em Sistemas de IA

Sistemas de IA operam em sessões efêmeras.
Cada sessão começa sem memória da anterior.
O C.A.O.S resolveu parcialmente esse problema com snapshots (v2.1)
e recuperação contextual automática (v2.2).

O problema residual:

Snapshots registram decisões. Não registram execuções.

Consequências práticas:

- Não é possível verificar se uma instrução foi executada exatamente
  como foi autorizada
- Não é possível reconstruir o estado do sistema em um ponto histórico
  específico sem análise manual
- Drift arquitetural silencioso — o sistema evolui sem trilha verificável
- Rollback depende de reconstrução manual, não de artefato concreto
- Em sistemas multi-agente, cada agente produz efeitos sem evidência comum

O Git resolve esse problema ao introduzir:
prova criptográfica de execução — o que mudou, quando, por quem,
com qual autorização institucional.

---

# 3. O Papel do Git no C.A.O.S

Git não é ferramenta auxiliar nesta arquitetura.
Git não é backup.
Git não é versionamento de código no sentido convencional.

Git é a camada de evidência operacional verificável do C.A.O.S.

Separação arquitetural obrigatória:

| Componente | O que registra | Natureza |
|---|---|---|
| Snapshot | o que foi decidido, por quê, com quais riscos | semântica da decisão |
| Git commit | o que realmente mudou nos arquivos, quando, por quem | evidência da execução |
| RAG /r | como operar | regras |
| RAG /k | o que são as coisas | conhecimento |

Snapshot e commit são complementares, não equivalentes.

Um snapshot pode existir sem commit correspondente:
decisão tomada, execução pendente.
Estado: VALIDADO.

Um commit nunca deve existir sem snapshot correspondente:
execução sem decisão institucional.
Estado: violação arquitetural.

Um snapshot com commit correspondente verificado:
ciclo operacional completo.
Estado: CONCLUÍDO.

---

# 4. Git como Evidência Operacional

O commit institucional no C.A.O.S é a prova de que:

- a instrução autorizada foi aplicada
- o agente executor registrado realizou a operação
- o agente orquestrador coordenou o ciclo
- o snapshot que gerou a instrução está identificado
- o diff real corresponde ao que foi autorizado

A natureza criptográfica do Git garante que o registro não pode ser
alterado retroativamente sem que a alteração seja detectável.
O SHA do commit é uma impressão digital da execução.

O que torna um commit institucional:

```
[tipo](domínio): descrição em imperativo

snapshot: ID-do-snapshot
agent-executor: Codex
agent-orchestrator: Claude
risks-addressed: N

Co-Authored-By: Codex <noreply@codex>
Orchestrated-By: Claude <noreply@claude>
```

Sem os campos `snapshot:`, `agent-executor:` e `agent-orchestrator:`,
o commit não é reconhecido como evento institucional do C.A.O.S.

---

# 5. Integração Git ↔ Memória Institucional

A integração é bidirecional e obrigatória após a execução.

## Snapshot referencia commit

O snapshot é atualizado ao final do ciclo com:

```
commit_hash: abc123f7
branch: ops/audit-logs-20260509
estado: CONCLUÍDO
```

## Commit referencia snapshot

O commit message inclui obrigatoriamente:

```
snapshot: audit-logs-001
```

## Rastreabilidade resultante

Dado snapshot-001 → commit abc123f7 → diff exato das alterações
Dado commit abc123f7 → snapshot-001 → decisão, contexto, riscos, agentes

A rastreabilidade é completa nos dois sentidos.
Qualquer agente em qualquer sessão futura pode reconstruir
o ciclo completo a partir de qualquer um dos dois artefatos.

## O que acontece se o vínculo é quebrado

Snapshot sem commit_hash: ciclo marcado PENDENTE de evidência.
Claude deve detectar e sinalizar ao usuário na próxima sessão no domínio.

Commit sem referência de snapshot: commit não reconhecido como
evento institucional. Deve ser documentado retroativamente ou
tratado como alteração não-autorizada.

---

# 6. Estados Verificáveis do Ciclo

Com Git integrado, o ciclo operacional passa de estados semânticos
para estados verificáveis:

```
PROPOSTO
  ↓ (validação humana — gate obrigatório)
VALIDADO
  ↓ (Codex inicia execução)
EXECUTANDO
  ↓ (Codex conclui execução)
EXECUTADO
  ↓ (Codex cria commit com metadados institucionais)
COMMITADO
  ↓ (Claude valida: diff do commit ↔ instrução autorizada)
  ↓ correspondência confirmada          ↓ divergência detectada
VERIFICADO                           DIVERGENTE → retorna ao usuário
  ↓ (snapshot atualizado com commit_hash)
CONCLUÍDO

Estados de exceção:
REJEITADO    → usuário rejeitou na validação (etapa PROPOSTO → VALIDADO)
REVERTIDO    → ciclo desfeito após CONCLUÍDO (requer rollback completo)
```

O estado COMMITADO é novo. Representa execução com evidência mas
sem validação de correspondência ainda.

O estado VERIFICADO é o crítico: Claude compara o diff do commit com
a instrução autorizada. Se houver divergência, o ciclo não avança para
CONCLUÍDO. O usuário recebe a divergência para decisão.

Isso introduz uma verificação que hoje não existe:
o que foi executado pode diferir do que foi autorizado, e o sistema
detecta isso antes de fechar o ciclo.

---

# 7. Fluxo Operacional Revisado

Fluxo atual (v2.2):

```
0.   Detectar domínio
0a.  Recuperar snapshot
1-4. Classificar → index → módulos → skill
5.   Gerar instrução estruturada
6.   Validar com usuário [GATE]
7.   Executar
8.   Registrar snapshot
```

Fluxo com Git (v3.5):

```
0.   Detectar domínio (r-auto-recuperacao-contextual)
0b.  [NOVO] Ler histórico Git do domínio (r-git-operacional)
          → metadados dos últimos N commits no domínio
          → detectar drift entre estado Git e último snapshot
0a.  Recuperar snapshot (r-recuperacao-contextual)
1-4. Classificar → index → módulos → skill
5.   Gerar instrução + contexto de commit
          → branch sugerido, tipo de commit, snapshot ID de referência
6.   Validar com usuário [GATE — sem alteração]
7.   Executar (Codex aplica instrução)
7a.  [NOVO] Codex cria branch ops/ e commit com metadados institucionais
7b.  [NOVO] Claude valida: diff do commit corresponde à instrução?
          → sim: avançar para estado VERIFICADO
          → não: retornar ao usuário com divergência identificada
8.   Registrar snapshot com commit_hash e estado CONCLUÍDO
8a.  [NOVO] Usuário autoriza merge do branch ops/ para main [GATE]
```

Dois novos gates aparecem:
- 7b: validação de correspondência instrução ↔ execução (Claude)
- 8a: autorização de merge para main (usuário)

---

# 8. Responsabilidades por Agente

## Claude

Com Git, Claude acrescenta às suas responsabilidades atuais:

- Etapa 0b: ler metadados de histórico Git do domínio
- Etapa 5: preparar contexto de commit (branch, tipo, snapshot ref)
- Etapa 7b: validar correspondência entre instrução autorizada e diff do commit
- Em ciclos futuros: usar histórico Git para detectar drift arquitetural

Claude não cria commits. Isso é execução — pertence ao Codex.
Claude não realiza operações Git diretas durante a análise.

## Codex

Com Git, Codex acrescenta às suas responsabilidades atuais:

- Etapa 7a: criar branch operacional antes de executar
- Etapa 7a: criar commit institucional após execução com metadados completos
- Reportar commit hash para Claude para validação em 7b
- Não decide conteúdo ou formato do commit — segue instrução de Claude

## Usuário

Responsabilidades inalteradas com adição de:

- Etapa 8a: autorizar merge do branch operacional para main

O usuário continua sendo o único gate de governança.
Git não remove nenhuma responsabilidade humana — acrescenta
um ponto de auditoria adicional antes do merge.

## Git

Git é o sistema, não um agente. Suas responsabilidades no C.A.O.S:

- persistir evidência imutável de execuções
- fornecer histórico verificável por domínio
- habilitar rollback técnico controlado
- habilitar replay operacional
- manter trilha de atribuição (executor + orquestrador)

---

# 9. Estrutura de Branches

Para o contexto de pequenos negócios, a estratégia mínima
que entrega auditabilidade completa sem overhead operacional:

```
main
  └── ops/[domínio]-[data]      ← execuções operacionais
  └── rag/[modulo]-[data]       ← atualizações de módulos RAG
  └── docs/[marco]-[data]       ← documentação institucional
```

## main

Estado institucional validado.
Nenhum commit vai diretamente para main.
Toda alteração entra via branch com merge explicitamente autorizado pelo usuário.
main é auditável: cada commit em main representa um ciclo institucional completo.

## ops/

Branches operacionais de vida curta.
Criados por Codex antes de executar.
Existem apenas durante o ciclo.
Mergeados para main após validação 7b e autorização 8a.
Deletados após merge — o histórico do merge permanece em main.

Nomenclatura: `ops/[domínio-abreviado]-[YYYYMMDD]`
Exemplo: `ops/audit-logs-20260509`

## rag/

Para atualizações de módulos RAG.
Mesmo ciclo: Claude propõe, usuário valida, Codex commita, merge autorizado.
RAG versionado = o próprio sistema de memória tem história verificável.

## docs/

Para criação ou atualização de documentação institucional.
Opcional — documentação pode ir direto em main se pequena.

## O que não existe nessa estratégia

Não há: feature branches, release branches, develop branches,
hotfix branches com nomes genéricos.
Simplicidade operacional é requisito arquitetural para pequenos negócios.

---

# 10. Modelo Institucional de Commits

## Formato obrigatório

```
[tipo](domínio): descrição em imperativo

snapshot: ID-do-snapshot
agent-executor: Codex
agent-orchestrator: Claude
risks-addressed: N

Co-Authored-By: Codex <noreply@codex>
Orchestrated-By: Claude <noreply@claude>
```

## Prefixos de tipo

| Prefixo | Uso |
|---|---|
| `[hotfix]` | correções em código ou banco |
| `[migration]` | alterações de schema SQL |
| `[rls]` | alterações em Row Level Security |
| `[rag]` | atualizações de módulos RAG |
| `[docs]` | documentação institucional |
| `[snapshot]` | quando snapshots são versionados via Git |
| `[handoff]` | registros de handoff entre agentes |
| `[revert]` | rollback técnico de execução anterior |

## Exemplo real

```
[rls](public.audit_logs): substituir policy baseada em email_admin por get_tenant_id()

snapshot: audit-logs-001
agent-executor: Codex
agent-orchestrator: Claude
risks-addressed: 4

Co-Authored-By: Codex <noreply@codex>
Orchestrated-By: Claude <noreply@claude>
```

## Commits proibidos

Definidos em `r-commit-governance`:

- commit sem campo `snapshot:`
- commit sem `agent-executor:`
- commit diretamente em main (sem branch intermediário)
- commit com múltiplos domínios não relacionados sem aprovação explícita
- commit contendo arquivos `.env`, credentials ou tokens
- commit de revert sem registro institucional correspondente

---

# 11. Git na Recuperação Contextual

## O que Git acrescenta à recuperação

A recuperação contextual atual (v2.2) usa snapshots para responder:
"o que foi decidido neste domínio?"

Git acrescenta a resposta a: "o que foi efetivamente executado
neste domínio, e o estado atual corresponde ao que foi decidido?"

## Como funciona na etapa 0b

```
Etapa 0b — Ler histórico Git do domínio:

1. Identificar domínio (vem da etapa 0)
2. Consultar commits com referência ao domínio
3. Extrair metadados dos últimos N commits:
      tipo, data, snapshot-ref, estado do commit
4. Comparar último commit com último snapshot:
      snapshot_data > último_commit_data → drift potencial
      snapshot sem commit_hash → ciclo pendente de evidência
      commit sem snapshot_ref → violação arquitetural
5. Incluir resultado na análise de Claude
```

Claude não carrega diffs completos em contexto por padrão.
Apenas metadados: tipo, data, domínio, snapshot-ref.
Diffs completos são carregados apenas quando:
- divergência é detectada (etapa 7b)
- replay operacional é solicitado
- auditoria histórica é explicitamente requisitada

## Limite de consulta

Máximo N commits por domínio por execução (definido em r-git-operacional).
Não há carregamento de histórico completo.
Princípio de contexto mínimo preservado.

---

# 12. Replay Operacional

## O que é

Replay operacional é a capacidade de reconstruir e re-executar
um ciclo histórico em novo contexto, com base em seus artefatos originais.

Replay não é automação. Replay é reconstrução assistida.

## Inputs necessários

- ID do snapshot
- Hash do commit correspondente
- Ambiente alvo (ex: staging, novo tenant)

## Sequência do replay

```
1. Claude carrega snapshot → lê decisão, contexto, riscos do ciclo original
2. Claude carrega metadados do commit → lê o que foi executado
3. Claude reconstrói instrução com base nos dois artefatos
4. Usuário valida que a reconstrução corresponde à intenção [GATE]
5. Codex re-executa no ambiente alvo seguindo instrução validada
6. Novo ciclo é registrado com referência ao ciclo original
```

## O que replay garante

- Contexto do ciclo original está disponível e estruturado
- A instrução é reconstruída com base em artefatos verificáveis
- O novo ciclo segue governança completa (gate humano em etapa 4)

## O que replay não garante

- Resultado idêntico ao ciclo original (ambiente pode ter diferido)
- Ausência de efeitos colaterais (dependências podem ter mudado)
- Equivalência de estado entre ambientes

Claude deve avaliar explicitamente se o contexto do replay
é comparável ao contexto original antes de reconstruir a instrução.
Se não for comparável, deve sinalizar ao usuário antes de prosseguir.

---

# 13. Rollback Contextual

## Dois tipos distintos — nunca confundir

**Rollback técnico (Git):**
`git revert <commit>` — cria novo commit que desfaz as alterações.
O histórico Git permanece. O diff da reversão é registrado.
A execução e a reversão são rastreáveis.

**Rollback institucional (Snapshot):**
O snapshot correspondente ao commit revertido é marcado REVERTIDO.
Um novo snapshot documenta a reversão: o quê, por quê, estado resultante.
A memória institucional reflete a realidade atual.

## Regra arquitetural

Os dois rollbacks são inseparáveis.

Git revert sem atualização de snapshot:
→ divergência entre realidade e memória institucional
→ próxima sessão no domínio recupera snapshot desatualizado
→ análise baseada em estado incorreto

Snapshot marcado REVERTIDO sem Git revert:
→ memória institucional desconectada da realidade atual do sistema
→ drift arquitetural não registrado no diff histórico

## Sequência obrigatória de rollback

```
1. Usuário solicita rollback [inicia o ciclo]
2. Claude identifica: commit a reverter + snapshot correspondente
3. Claude apresenta: o que será revertido tecnicamente e institucionalmente
4. Usuário valida [GATE]
5. Codex executa: git revert <commit> → cria commit [revert](domínio)
6. Claude atualiza: snapshot original → status REVERTIDO
7. Claude registra: novo snapshot → documenta reversão
8. Usuário autoriza merge do revert para main [GATE]
```

Dois gates humanos em rollback — não um.
A reversão é um ciclo completo, não uma operação pontual.

---

# 14. Riscos Arquiteturais

| Risco | Severidade | Descrição | Mitigação |
|---|---|---|---|
| Commit sem snapshot | Alta | Execução sem autorização institucional | r-commit-governance requer campo snapshot:; Codex valida antes de commitar |
| Divergência instrução ↔ commit | Alta | O diff difere do que foi autorizado | Etapa 7b: Claude valida antes de estado VERIFICADO |
| Rollback técnico sem rollback institucional | Alta | Git revert sem atualizar snapshot cria divergência | r-rollback-contextual exige ambos como ciclo único |
| Git history inflando contexto | Média | Carregamento de histórico completo aumenta tokens | r-git-operacional limita a N commits + apenas metadados por padrão |
| Branches ops/ orphans | Baixa | Branches não mergeadas acumulam | Política: branch existe apenas durante o ciclo; merge ou delete obrigatório |
| Dados sensíveis em commits | Alta | .env, tokens, credenciais no diff | .gitignore + r-git-operacional proíbe; verificação antes do commit |
| Atribuição opaca de commits | Média | Difícil distinguir Codex vs human | Formato obrigatório com agent-executor: e Co-Authored-By: |
| Replay com ambiente divergente | Média | Reconstrução falha por contexto modificado | r-replay-operacional exige validação humana da equivalência ambiental |
| Merge sem gate humano | Alta | Branch mergeado para main sem autorização | Etapa 8a é gate obrigatório; proteção de branch em main recomendada |

---

# 15. Novos Módulos Necessários

## /r

### r-git-operacional
Pergunta: como Claude lê e interpreta histórico Git operacionalmente?

Conteúdo:
- quando carregar histórico Git (apenas domínios com histórico + etapa 0b)
- quais campos carregar por padrão (metadados apenas — não diffs)
- como detectar drift: snapshot_data > último commit, snapshot sem commit_hash
- limite: máximo N commits por consulta por domínio
- quando carregar diff completo: divergência 7b, replay solicitado, auditoria

### r-commit-governance
Pergunta: quais são as regras obrigatórias para criação de commits?

Conteúdo:
- formato institucional completo (ver seção 10)
- campos obrigatórios e seus valores válidos
- quem cria commits (Codex; Claude nunca diretamente)
- commits proibidos e suas razões
- escopo de um commit: um domínio, um ciclo, uma instrução

### r-rollback-contextual
Pergunta: como executar rollback preservando integridade institucional?

Conteúdo:
- distinção técnico (Git) vs institucional (Snapshot)
- sequência obrigatória dos dois rollbacks
- gates humanos obrigatórios
- o que constitui inconsistência de rollback e como resolvê-la

### r-replay-operacional
Pergunta: como reconstruir e re-executar ciclos históricos?

Conteúdo:
- inputs necessários (snapshot ID + commit hash)
- sequência do replay com gate humano em etapa 4
- o que replay garante vs não garante
- como avaliar equivalência ambiental

## /k

### k/sistema/k-sys-persistencia-operacional
Pergunta: o que é a camada Git dentro do C.A.O.S?

Conteúdo:
- a pilha completa de persistência: RAG + Snapshots + Git
- como as três camadas se complementam
- o vínculo snapshot ↔ commit
- exemplo de ciclo completo rastreável com artefatos reais

### k/sistema/k-sys-governanca-git
Pergunta: quais são as convenções de branch e commit do sistema?

Conteúdo:
- estratégia de branches (main, ops/, rag/, docs/)
- tabela de prefixos de commit
- regras de merge e autorização
- o que constitui violação arquitetural de commit

---

# 16. Impacto na Identidade do Sistema

## Antes de v3.5

O sistema preserva decisões.
Execuções são inferidas a partir dos snapshots.
Drift é detectável por análise subjetiva.
Rollback depende de reconstrução manual.

## Com v3.5

O sistema preserva decisões e comprova execuções.
Drift é detectável por comparação objetiva (snapshot vs histórico Git).
Rollback é reversível e rastreável com artefatos concretos.
Qualquer ciclo histórico pode ser reconstruído por qualquer agente.

## A mudança de categoria

| Dimensão | Antes de v3.5 | Com v3.5 |
|---|---|---|
| Decisões | preservadas em snapshots | preservadas em snapshots |
| Execuções | registradas em snapshots (semântico) | evidenciadas em commits (verificável) |
| Drift | detectável por análise | detectável por comparação objetiva |
| Rollback | manual, baseado em reconstrução | reversível com artefatos concretos |
| Auditabilidade | depende de sessão e agente | independente de sessão e agente |

O sistema evolui de:
"confiável — as decisões estão registradas"

Para:
"verificável — as execuções podem ser provadas"

---

# 17. Justificativa do Marco v3.5

## Por que não v3.0

Git depende de r-estados-ciclo (v3.0) para saber em qual estado
um commit deve ser criado. Depende de r-handoff-codex (v3.0) para
saber quais metadados incluir na transferência para Codex.
Git não pode ser implementado antes de v3.0.

## Por que não v4.0

Git não requer SBERT. É uma camada independente da memória semântica.
Inserir Git em v4.0 atrasaria uma capacidade que pode ser deployada
imediatamente após v3.0, sem dependências externas além do Git
— que já existe no ambiente de desenvolvimento.

## Por que não integrar em v3.0

v3.0 já tem escopo substancial: registry, estados, handoff, matching,
snapshots incrementais. Adicionar Git ao v3.0 aumenta o escopo
além do que é prudente para um marco único.

Separar em v3.5 permite:
- v3.0 ser deployável e estável antes de Git
- v3.5 ser implementado incrementalmente sobre v3.0
- v4.0 ser independente de v3.5

## Por que v3.5 e não v3.1 ou v3.9

v3.5 sinaliza: evolução substancial da linha v3.x,
mais que uma correção menor (v3.1) mas sem a magnitude de um
novo marco arquitetural completo (v4.0). O numeral .5 é deliberado:
Git transforma a capacidade do sistema, não apenas a estende.

---

# 18. Roadmap Evolutivo

| Versão | Marco | Status | Depende de |
|---|---|---|---|
| v2.2 | auto-recuperação contextual | concluído | v2.1 |
| v3.0 | continuidade entre agentes (registry, estados, handoff) | planejado | v2.2 |
| v3.5 | persistência operacional verificável (Git) | planejado | v3.0 |
| v4.0 | memória semântica (SBERT + embeddings) | planejado | v3.0 (independente de v3.5) |
| v5.0 | auditoria institucional completa | futuro | v3.5 + v4.0 |

### v5.0 — convergência das duas linhas

Com v3.5 (Git) e v4.0 (SBERT) implementados:

- SBERT encontra ciclos semanticamente similares ao prompt atual
- Git fornece evidência verificável dos ciclos encontrados
- Claude pode reconstruir um ciclo histórico baseado em:
  similaridade semântica (v4.0) + diff verificável (v3.5)

Isso é replay semântico auditável: o sistema recupera
o ciclo mais relevante por conteúdo e pode reproduzi-lo
com evidência verificável. A combinação das duas linhas
produz capacidade que nenhuma delas entrega isoladamente.

---

# 19. Limites Arquiteturais Reais

| Limite | Descrição |
|---|---|
| Git não substitui snapshots | Commits não contêm contexto semântico. Snapshots não contêm evidência técnica. São complementares. |
| Git não substitui governança humana | Nenhum commit vai para main sem gate humano. v3.5 acrescenta gates, não remove. |
| Commits não são self-enforcing | O formato institucional depende de Codex seguir r-commit-governance. Não há mecanismo automático de rejeição. |
| Histórico Git não é memória semântica | Git armazena diffs, não significado. Busca por similaridade semântica requer v4.0. |
| Replay não é determinístico | Mesmo com snapshot + commit, o replay em ambiente diferente pode produzir resultado diferente. |
| Drift detectado não é drift resolvido | A etapa 0b detecta divergência — não a resolve. Resolução requer ciclo completo com governança. |
| Branch protection não é automática | A política de proteção do main deve ser configurada no repositório Git. Não é garantida pelo C.A.O.S. |

---

# 20. Definição Oficial Pós-Git

**C.A.O.S v3.5:**

Sistema Operacional Cognitivo com Memória Institucional Persistente
e Persistência Operacional Verificável para continuidade auditável
entre agentes de IA.

---

A palavra que define a evolução de v2.0 para v3.5 é **verificável**.

v2.0: as decisões são preservadas.
v3.5: as decisões são preservadas e as execuções são verificáveis.

A diferença não é de escala — é de categoria epistêmica.
Preservar permite recuperar o que foi decidido.
Verificar permite provar o que foi executado.

---

## Diff Conceitual v2.0 → v3.5

| Dimensão | v2.0 | v3.5 |
|---|---|---|
| Memória de decisões | snapshots | snapshots (preservado) |
| Memória de execuções | ausente | commits institucionais |
| Detecção de drift | subjetiva (por análise) | objetiva (snapshot vs histórico Git) |
| Rollback | manual e semântico | técnico + institucional, sincronizados |
| Auditabilidade | depende de sessão ativa | independente de sessão |
| Replay | impossível sem reconstrução manual | assistido por artefatos verificáveis |
| Estados do ciclo | PROPOSTO → CONCLUÍDO | PROPOSTO → COMMITADO → VERIFICADO → CONCLUÍDO |
| Gate humano | etapa 6 (validação) | etapa 6 + etapa 8a (merge para main) |
| Identidade do sistema | infraestrutura cognitiva | sistema operacional cognitivo auditável |

---

versao-documento: 3.5
alinhado-com: AGENTS.md v3.0 | rag/index.md v6.0 | C.A.O.S v2.0
depende-de: v3.0 (r-estados-ciclo, r-handoff-codex, k-sys-registry-dominios)
independente-de: v4.0 (SBERT, embeddings, semantic retrieval)
preserva: C.A.O.S v2.0 como referência arquitetural anterior
