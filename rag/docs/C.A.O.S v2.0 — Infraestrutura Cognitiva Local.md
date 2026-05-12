# C.A.O.S v2.0 — Infraestrutura Cognitiva Local

versao: 2.0
status: homologado
data: 2026-05-10
motivacao: consolidação arquitetural de v2.1 + v2.2 e formalização da identidade do sistema
documenta: estado atual implementado + roadmap oficial v3.0 e v4.0

---

# 1. Identidade do Sistema

O C.A.O.S (Cognitive Autonomous Operational System) é uma infraestrutura cognitiva local
para engenharia de software assistida por agentes de IA.

O sistema não é:

- um chatbot
- um plugin
- um framework de prompts
- um modelo de linguagem

O sistema é:

Infraestrutura cognitiva local com memória institucional persistente
para continuidade operacional entre agentes de IA.

Essa definição implica:

- as sessões são efêmeras; a memória do sistema não é
- o raciocínio pertence ao agente; o conhecimento pertence ao sistema
- a execução pode ser delegada; a governança permanece com o humano
- o sistema opera localmente sem dependência de cloud em execução

---

# 2. Problema que o C.A.O.S Resolve

Agentes de IA operam em sessões efêmeras.
Cada nova sessão começa do zero.
Decisões arquiteturais tomadas em sessões anteriores são perdidas.
Contexto institucional não persiste entre agentes.

Consequências práticas desse problema:

- mesmos erros são cometidos em ciclos diferentes
- decisões homologadas precisam ser reconstruídas em cada sessão
- a troca de agente (Claude → Codex) perde contexto operacional
- auditoria histórica de decisões é impraticável
- drift arquitetural silencioso acumula sem detecção

O C.A.O.S resolve esse problema através de:

- memória modular estruturada (RAG /r e /k)
- memória institucional persistente (snapshots homologados)
- recuperação contextual automática antes de cada execução
- governança desacoplada do modelo — não depende de sessão ativa

---

# 3. Arquitetura Cognitiva

O sistema opera em cinco camadas desacopladas:

## Camada de Raciocínio — Claude
Responsável por: classificar tarefas, carregar contexto mínimo, analisar
domínios, identificar riscos, propor soluções estruturadas, orquestrar o ciclo.

Claude não executa — propõe. Claude não decide — analisa e apresenta
para validação humana.

## Camada de Execução — Codex
Responsável por: executar instruções estruturadas e validadas pelo usuário.
Recebe instrução de Claude após aprovação humana. Não improvisa arquitetura.
Atua exclusivamente sobre o que foi proposto e homologado.

O executor é intercambiável: o ciclo permanece íntegro independente
de qual agente executa, conforme validado no ciclo de v1.2.

## Camada de Memória Modular — RAG /r e /k
Responsável por: fornecer regras operacionais (/r) e conhecimento
estruturado (/k) relevantes à tarefa em execução.

Características:
- carregamento seletivo — máximo 3 módulos por execução
- /r carregado antes de /k
- cada módulo responde uma única pergunta
- escopo isolado, sem duplicação

## Camada de Memória Institucional — Snapshots
Responsável por: preservar decisões arquiteturais homologadas entre ciclos.
Detalhado na seção 5.

## Camada de Governança — Usuário
Responsável por: validar toda proposta antes de execução estrutural.
Único gate obrigatório do sistema. Não pode ser substituído por automação.

---

# 4. Transferência Cognitiva

A transferência cognitiva é o processo pelo qual conhecimento operacional
gerado em um ciclo é depositado na memória institucional do sistema.

Funciona da seguinte forma:

```
1. Claude analisa o domínio e propõe solução
2. Usuário valida (gate obrigatório)
3. Codex executa a instrução validada
4. O resultado é verificado
5. O ciclo é registrado como snapshot homologado
6. O snapshot integra a memória institucional permanentemente
```

Propriedade central da transferência cognitiva:

A memória resultante é independente de:
- qual agente de IA executou o ciclo
- qual sessão estava ativa no momento
- qual modelo de linguagem foi utilizado

Uma decisão homologada por Claude em uma sessão está disponível
para recuperação por Codex, por outro Claude ou por qualquer agente
que opere sob o C.A.O.S em sessões futuras.

O conhecimento migra do contexto efêmero da sessão
para a memória persistente do sistema.

---

# 5. Memória Institucional

## O que é

Um snapshot é a unidade de memória institucional do C.A.O.S.

Não é apenas um registro técnico.
É patrimônio operacional do negócio: uma decisão arquitetural verificada,
com riscos identificados, resultado confirmado e contexto documentado.

## Estrutura de um snapshot

| Campo | Conteúdo |
|---|---|
| id | identificador sequencial por domínio |
| tarefa | classificação do ciclo operacional |
| domínio | tabela, componente ou fluxo afetado |
| módulos usados | lista de /r e /k carregados na execução |
| decisão | o que foi proposto e validado |
| resultado | sucesso, falha ou pendente |
| data | data de execução do ciclo |
| riscos vistos | riscos identificados durante a análise |
| riscos ativos | riscos não resolvidos ao final do ciclo |

## Propriedades essenciais

- **Persistente**: não depende de sessão ativa
- **Imutável**: snapshots homologados não são editados — apenas acrescidos
- **Reutilizável**: qualquer agente pode recuperar e usar como referência
- **Acumulativo**: cada ciclo adiciona ao corpus, nunca substitui
- **Auditável**: mantém trilha histórica de decisões

## Três tipos de memória — separação arquitetural

| Tipo | Componente | Estado atual |
|---|---|---|
| Memória modular | RAG /r e /k | implementado |
| Memória institucional | Snapshots | implementado |
| Memória semântica | SBERT + embeddings | planejado — v4.0 |

Cada tipo tem escopo, ciclo de vida e mecanismo de recuperação distintos.
Nenhum substitui os outros — são camadas complementares.

## Snapshot homologado — ciclo de referência

Ciclo `hotfix-audit-logs-rls` — executado em 2026-05-09:

- domínio: `public.audit_logs`
- problema: policy RLS baseada em subquery de `email_admin` em vez de `get_tenant_id()`
- riscos identificados: cross-tenant por email, ausência de cobertura platform_admin,
  degradação de performance, inconsistência com padrão arquitetural
- decisão: substituir policy por `get_tenant_id() AND is_tenant_admin()` +
  adicionar `audit_logs_platform_admin`
- resultado: sucesso — migration aplicada e validada via MCP
- riscos ativos: nenhum

Este snapshot é o primeiro registro da memória institucional do sistema.

---

# 6. Fluxo Operacional

O fluxo atual do C.A.O.S opera em 9 etapas:

```
Etapa 0   — Detecção automática de domínio
            (r-auto-recuperacao-contextual)

Etapa 0a  — Se match: recuperar snapshot via r-recuperacao-contextual
            Hierarquia de prioridade: último sucesso > riscos ativos >
            última falha > referência base

Etapa 1   — Classificar tarefa
            (SQL, hotfix, RLS, frontend, arquitetura, etc.)

Etapa 2   — Consultar index.md
            Mapear tarefa → módulos necessários

Etapa 3   — Carregar /r antes de /k
            Máximo 3 módulos por execução

Etapa 4   — Ativar skill apropriada se disponível

Etapa 5   — Gerar instrução estruturada
            Claude propõe — não executa

Etapa 6   — Validar com usuário
            Gate obrigatório — sem exceção

Etapa 7   — Executar
            Codex ou agente executor aplica instrução validada

Etapa 8   — Registrar snapshot
            Transferência cognitiva para memória institucional
```

A detecção automática (etapas 0 e 0a) é o comportamento adicionado em v2.2.
Antes de v2.2, o fluxo iniciava na etapa 1.

---

# 7. Governança

A governança humana é o único gate obrigatório do sistema.

Regra absoluta:

Nenhuma alteração estrutural é executada sem validação humana explícita.

Toda mudança passa por quatro estados obrigatórios:
proposta → explicada → validada → executada

O que a governança humana não pode ser substituída por:

- histórico de snapshots (memória não autoriza execução)
- confiança em ciclos anteriores bem-sucedidos (cada ciclo é validado individualmente)
- automação de qualquer camada do sistema
- instrução implícita ou inferida

A governança é desacoplada do modelo:
não depende de Claude, Codex ou qualquer IA específica.
Reside no processo — não no agente.

---

# 8. Persistência Operacional Versionada — Direção Futura

Esta seção documenta uma direção arquitetural futura.
Não está implementada. Não há previsão de versão fixada.

## O que é

A integração do Git como camada de persistência operacional verificável
do C.A.O.S — complementar aos snapshots.

## Separação conceitual

| Componente | Papel |
|---|---|
| Snapshot | memória institucional homologada — a decisão |
| Git commit | persistência verificável da execução real — o que mudou |

Snapshots registram o porquê e o quê foi decidido.
Git registra o que foi efetivamente alterado no sistema.

A combinação dos dois cria rastreabilidade completa:
decisão arquitetural ↔ diff real ↔ agente executor ↔ agente orquestrador.

## Capacidades futuras com essa integração

- **Commits como eventos operacionais rastreáveis**: cada execução produz
  um commit vinculado ao snapshot que o originou
- **Vínculo snapshot ↔ commit**: dado um snapshot, localizar o diff exato
  que foi aplicado; dado um commit, localizar a decisão que o autorizou
- **Auditoria arquitetural histórica**: reconstruir a linha do tempo de
  decisões, execuções e resultados de qualquer domínio
- **Rollback contextual**: reverter uma execução e restaurar o estado
  institucional correspondente ao snapshot anterior
- **Replay operacional**: re-executar um ciclo histórico em novo ambiente
  com base nos artefatos originais
- **Versionamento institucional do conhecimento**: cada evolução do RAG
  rastreada como commit — o próprio sistema de memória tem história verificável

## Por que isso importa

Sistemas de IA operam em sessões efêmeras.
Git é permanente e auditável.
A combinação transforma execuções de IA em eventos verificáveis —
com autor, contexto, data e diff real — não apenas em registros textuais.

Esta integração tornaria o C.A.O.S auditável em nível institucional:
qualquer stakeholder poderia reconstruir o que foi decidido, por quem,
quando e com qual resultado real.

---

# 9. Evolução Arquitetural

| Versão | Marco | Status | Data |
|---|---|---|---|
| v1.0 | framework operacional inicial | concluído | — |
| v1.1 | primeiro ciclo operacional vivo | concluído | — |
| v1.2 | validação em ambiente real (MCP + migration) | concluído | — |
| v2.1 | persistência operacional — snapshots | concluído | — |
| v2.2 | auto-recuperação contextual automática | concluído | — |
| **v2.0-doc** | **consolidação documental oficial** | **concluído** | **2026-05-10** |
| v3.0 | continuidade operacional entre agentes | planejado | — |
| v4.0 | memória semântica institucional | planejado | — |

Nota sobre versionamento: versões operacionais (v2.1, v2.2) e versão
documental (v2.0) seguem trilhas paralelas. A documentação v2.0 consolida
o estado arquitetural de v2.1 + v2.2 em registro único.

---

# 10. Roadmap v3.0 — Continuidade Operacional entre Agentes

## Objetivo

Permitir que Claude e Codex operem como agentes coordenados
com estado compartilhado, handoff estruturado e continuidade
preservada entre transições de agente.

## Novos componentes previstos

### k/sistema/k-sys-registry-dominios
Registry estruturado de domínios operacionais com aliases,
pesos de relevância, snapshots associados e estado atual.
Fundação para matching por conceito e, futuramente, semântico.

### r/r-estados-ciclo
Estados formais do ciclo operacional:

```
DETECTADO → ANALISADO → PROPOSTO → VALIDADO → EXECUTANDO → CONCLUÍDO
                                      ↓
                                  REJEITADO
```

Cada estado define: quem pode avançar, o que deve existir,
o que é transferível para o próximo agente.

### r/r-matching-conceito
Matching por aliases e conceito com pesos de relevância.
Substitui o matching heurístico atual com uma camada estruturada
que generaliza para termos não previstos nos aliases principais.

### r/r-handoff-codex
Protocolo formal de transferência de contexto Claude → Codex.
Define o formato da instrução estruturada, campos obrigatórios,
estado do ciclo na transferência e o que Codex recebe de volta.

### r/r-snapshots-incrementais
Snapshots que registram deltas sobre o estado anterior,
em vez de snapshots completos a cada ciclo.
Reduz redundância e preserva trilha evolutiva de um domínio.

## Impacto em módulos existentes

- `r-auto-recuperacao-contextual`: Nível 2 (substring) evoluirá para
  matching por conceito via registry estruturado
- `r-recuperacao-contextual`: adicionará suporte a snapshots incrementais
- `index.md`: evoluirá para v7.0 com novos módulos e tarefas

---

# 11. Roadmap v4.0 — Memória Semântica Institucional

## Objetivo

Introduzir recuperação de contexto baseada em similaridade semântica real
usando SBERT (Sentence-Transformers) localmente, sem cloud, sem custo recorrente.

## Por que v4.0 e não v3.0

v3.0 deve ser deployável imediatamente, sem dependências externas.
v4.0 requer setup técnico (Python + sentence-transformers + modelo).
O valor de SBERT aumenta proporcionalmente ao corpus de snapshots.
v3.0 é o ciclo em que esse corpus cresce.

## Como funcionaria

```
Snapshot criado
  ↓
Documento composto: "{tarefa} {domínio} {decisão} {riscos_vistos}"
  ↓
SBERT.encode(documento_composto) → vetor de 384 dimensões
  ↓
Persistido localmente: embeddings/public.audit_logs_001.npy

Nova sessão recebe prompt
  ↓
SBERT.encode(prompt) → vetor de prompt
  ↓
cosine_sim(prompt_vec, snapshot_vecs) → scores
  ↓
score > threshold (0.75)? → recuperar snapshot correspondente
```

## Modelo recomendado para português

`paraphrase-multilingual-MiniLM-L12-v2`
~400MB, opera em CPU, suporta português nativamente.

## Infraestrutura necessária

Para o porte atual do sistema (< 200 snapshots):
arquivos `.npy` com numpy são suficientes — zero infraestrutura adicional.

| Item | Custo |
|---|---|
| Modelo | download único ~400MB |
| Encode de 1 prompt | < 50ms em CPU |
| Busca em 200 vetores | < 1ms |
| Custo por consulta | R$ 0,00 — local e offline |

## Novos componentes previstos

- `k/sistema/k-sys-camada-semantica`: o que é SBERT, configuração,
  seleção de modelo para português, limitações reais
- `r/r-semantic-retrieval`: threshold, top-k, fallback para alias matching,
  detecção de embeddings stale
- `r/r-embedding-management`: quando gerar/regenerar embeddings,
  formato de persistência, ciclo de vida

---

# 12. Visão de Longo Prazo

Com v3.0 e v4.0 implementados, o C.A.O.S operaria com:

- **Raciocínio** (Claude): análise, proposta, orquestração
- **Execução** (Codex): aplicação de instruções validadas
- **Memória modular** (RAG): regras e conhecimento estruturado
- **Memória institucional** (Snapshots): decisões homologadas persistentes
- **Memória semântica** (SBERT): recuperação por similaridade vetorial
- **Persistência verificável** (Git — futuro): execução rastreável e auditável
- **Governança** (Usuário): gate obrigatório em toda execução estrutural

Essa combinação configuraria um sistema operacional cognitivo
com memória semântica institucional local.

O termo "sistema operacional cognitivo" é preciso neste contexto:
o sistema gerencia memória, coordena agentes, persiste estado e
governa execução — tal como um SO gerencia recursos de hardware.
A camada "cognitiva" refere-se à capacidade de recuperação associativa
por similaridade semântica — não a raciocínio autônomo.

---

# 13. Limites Arquiteturais Reais

Esta seção documenta o que o sistema não faz e não fará nas versões planejadas.
Precisão sobre limites é parte da identidade arquitetural do sistema.

| Limite | Explicação |
|---|---|
| Não aprende autonomamente | SBERT é modelo fixo, pré-treinado. Sem fine-tuning no domínio. |
| Não executa sem aprovação | Governança humana é gate obrigatório — nenhuma versão planejada remove isso. |
| Não substitui julgamento humano | Snapshots informam análise, não autorizam execução. |
| Não tem autonomia irrestrita | Autonomia operacional governada é direção futura — com supervisão explícita. |
| Memória semântica depende de setup | SBERT requer Python + modelo. Não é zero-friction para usuário não técnico. |
| Git integration não está implementada | Direção futura sem versão fixada. |
| Handoff Claude→Codex não está implementado | Planejado para v3.0. Hoje o fluxo é manual. |
| Corpus pequeno limita SBERT | Com < 30 snapshots, alias matching é igualmente eficaz. |
| Português é segundo plano nos modelos | Modelos multilingual têm qualidade menor em cada idioma individualmente. |

---

# 14. Definição Oficial do Sistema

**C.A.O.S:**

Infraestrutura Cognitiva Local com Memória Institucional Persistente
para continuidade operacional entre agentes de IA.

---

Composto por:

- raciocínio desacoplado de sessão
- execução governada e verificável
- memória modular carregada por demanda
- memória institucional homologada e persistente
- governança humana como único gate obrigatório
- arquitetura preparada para memória semântica e continuidade multi-agente

---

versao-documento: 2.0
alinhado-com: AGENTS.md v3.0 | rag/index.md v6.0
substitui-como-referencia-atual: C.A.O.S-v1.2-relatório-consolidado-atualizado.md
preserva: C.A.O.S-v1.2 como registro histórico homologado
