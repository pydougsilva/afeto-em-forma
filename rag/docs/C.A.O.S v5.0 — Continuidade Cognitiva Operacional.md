# C.A.O.S v5.0 — Continuidade Cognitiva Operacional

versao: 5.0
status: em design — implementação incremental
data: 2026-05-12
motivacao: transformar memória episódica em continuidade sistêmica entre projetos, agentes e sessões

---

# PARTE I — IDENTIDADE DA FASE 5

## O que a Fase 5 representa

As fases anteriores construíram camadas:

```
v1.x → organização inicial — protocolo e RAG
v2.x → memória operacional — snapshots
v3.0 → causalidade — handoff, estados, matching
v3.5 → verificabilidade — Git como ledger
v3.9 → auto-auditoria — staleness, pruning, concurrency
v4.0 → replicabilidade — core, bootstrap, distribuição
```

Cada fase adicionou uma camada.
A Fase 5 não adiciona uma nova camada.

**A Fase 5 conecta as camadas que existem em continuidade sistêmica.**

A diferença entre "ter memória" e "ter continuidade":

| Memória | Continuidade |
|---|---|
| registra o que aconteceu | permite retomar de onde parou |
| preserva decisões | preserva estado operacional |
| é recuperável se você sabe onde buscar | é recuperável sem saber onde buscar |
| depende da sessão que a criou | independe de quem retoma |

**O princípio da Fase 5:**
> O sistema deve lembrar o suficiente para continuar operando sem exigir reconstrução manual constante.

---

## O que a Fase 5 não é

- Não é adição de novas capacidades técnicas complexas
- Não é automação sem supervisão humana
- Não é infraestrutura enterprise
- Não é substituição do gate humano por nada

A Fase 5 é aperfeiçoamento de continuidade com os mecanismos que já existem.

---

# PARTE II — GRAFO DE CONTINUIDADE COGNITIVA

## O conceito

As capacidades do C.A.O.S não são uma lista.
São um grafo onde cada nó contribui para continuidade:

```
┌─────────────────────────────────────────────────────────────┐
│                     GRAFO DE CONTINUIDADE                    │
│                                                             │
│  AGENTS.md ──── autoridade ──── index.md                   │
│      │                              │                        │
│      │                         módulos /r + /k              │
│      │                              │                        │
│      └──── identidade ────── registry de domínios          │
│                                     │                        │
│                              matching (aliases → domínio)   │
│                                     │                        │
│                              snapshots (decisão)            │
│                                     │                        │
│                              Git commits (execução)          │
│                                     │                        │
│                              telemetria (contexto de sessão) │
│                                     │                        │
│                              handoff (transferência)         │
│                                     │                        │
│                              replay (retomada histórica)     │
│                                     │                        │
│                         CONTINUIDADE OPERACIONAL             │
└─────────────────────────────────────────────────────────────┘
```

## Como o grafo garante continuidade

Cada nó do grafo tem uma responsabilidade precisa:

| Nó | Pergunta que responde | Quando ausente |
|---|---|---|
| AGENTS.md | "Quem é este projeto?" | falha total — deve sempre existir |
| index.md | "O que está disponível?" | agente usa módulos aleatoriamente |
| Módulos /r | "Como devo agir?" | agente improvisa regras |
| Módulos /k | "O que existe aqui?" | agente não conhece o domínio |
| Registry | "Qual domínio é este?" | matching falha → fallback heurístico |
| Snapshots | "O que foi decidido?" | sem memória institucional |
| Git commits | "O que foi executado?" | sem evidência verificável |
| Telemetria | "O que aconteceu nesta sessão?" | contexto perdido entre sessões |
| Handoff | "O que Codex precisa saber?" | execução sem instrução estruturada |
| Replay | "Como retomar ciclo histórico?" | reconstrução manual |

## A regra do grafo

Um nó ausente não destrói o grafo.
Destrói apenas a continuidade que depende desse nó.

Este é o princípio de degradação controlada como arquitetura:
o grafo continua funcionando — em menor capacidade, mas nunca em colapso total.

---

# PARTE III — ARQUITETURA DE CONTINUIDADE COGNITIVA

## Os três níveis de continuidade

### Nível 1 — Continuidade de Sessão

**O que é:** preservar contexto dentro de uma única sessão de trabalho.

**Já implementado:** telemetria de sessão, locks de ciclo ativo.

**Gap atual:** a telemetria é criada ao final. Durante a sessão, o contexto não é externalizado progressivamente.

**Solução planejada para Fase 5:** telemetria progressiva — checkpoints intermediários opcionais dentro de sessões longas.

---

### Nível 2 — Continuidade entre Sessões

**O que é:** um novo agente assume onde o anterior parou sem reconstrução manual.

**Já implementado:** snapshots, telemetria de entrada, k-sys-handoff-institucional.

**Gap atual:** 8 de 9 domínios do Afeto em Forma não têm snapshots. A "continuidade" existe como protocolo mas não como conteúdo.

**Solução planejada para Fase 5:** protocol of first snapshot — toda operação em domínio sem histórico DEVE gerar snapshot antes de encerrar. Este é o contrato de continuidade mínima.

---

### Nível 3 — Continuidade entre Projetos

**O que é:** conhecimento arquitetural de um projeto informa outros projetos.

**Já implementado:** caos-core como repositório compartilhado.

**Gap atual:** não há mecanismo para promover um módulo de projeto específico para o core universal quando ele se prova genérico.

**Solução planejada para Fase 5:** protocolo de promoção de módulo — critérios formais para quando um módulo de projeto deve migrar para caos-core.

---

## O protocolo de primeiro snapshot

Este é o contrato de continuidade mínima da Fase 5.

```
REGRA: Toda sessão que opera em um domínio sem snapshot
       DEVE registrar um snapshot antes de encerrar.

Conteúdo mínimo do snapshot de primeiro ciclo:
  - domínio canônico
  - o que foi observado/analisado
  - o que foi decidido (mesmo que parcialmente)
  - riscos identificados
  - estado atual do domínio
  - contexto relevante para próxima sessão

Este snapshot não precisa ser perfeito.
Precisa ser suficiente para que a próxima sessão não comece do zero.
```

---

# PARTE IV — EVOLUÇÃO DO REGISTRY

## Estado atual (v1.0)

O registry atual mapeia:
- `id` → domínio canônico
- `aliases` com pesos → para matching
- `família` → categoria
- `módulos_padrão` → o que carregar
- `snapshots` → IDs dos ciclos

## Limitações conhecidas

1. **Sem relações entre domínios:** `pedidos` e `itens_pedido` têm FK entre si, mas o registry não registra essa dependência. Um novo agente não sabe que mudanças em `pedidos` afetam `itens_pedido`.

2. **Sem staleness budget:** não há definição de quanto tempo um snapshot de um domínio é considerado válido sem revalidação.

3. **Sem confidence threshold:** todos os domínios têm o mesmo tratamento no matching. Domínios críticos (como `tenants`) merecem threshold mais alto.

4. **Aliases são globais:** o alias "pedido" poderia conflitar com "pedido" num novo projeto de e-commerce. O registry não tem namespace por projeto.

## Evolução planejada — registry v2.0

Adicionar três novos campos por domínio:

```yaml
# Novos campos em k-sys-registry-dominios v2.0

dominio:
  # [campos existentes mantidos]
  
  # NOVO — relações com outros domínios
  dependencias:
    - public.itens_pedido   # pedidos tem itens
    - public.fornadas       # pedidos referenciam fornadas
  dependentes:              # quem depende de mim
    - public.itens_pedido
    
  # NOVO — política de staleness
  staleness_budget_dias: 30   # quantos dias sem ciclo até sinalizar staleness
  
  # NOVO — confiança no matching
  confidence_threshold: 0.7   # score mínimo para aceitar match automático
  criticidade: alta | média | baixa  # domínios críticos = threshold maior
```

**Implementação:** r-matching-conceito e r-staleness-detection precisam ser atualizados para consumir esses campos.

**Quando implementar:** após 30+ ciclos reais com o registry v1.0, quando os gaps de relação e staleness forem observados empiricamente em produção.

---

# PARTE V — MEMÓRIA PERSISTENTE ENTRE PROJETOS

## O problema

Quando um novo projeto adota o caos-core, ele começa do zero cognitivamente:
- registry vazio
- sem snapshots
- sem telemetria
- sem contexto de domínio

Mas o conhecimento operacional acumulado no caos-core é rico.
Falta um mecanismo para herdar a experiência sem herdar o caos anterior.

## A solução planejada — kit de herança cognitiva

Um projeto novo herda do caos-core não apenas protocolos, mas padrões operacionais:

```
Herança obrigatória (sempre vem do core):
  - Todos os módulos /r
  - Estrutura de /k/sistema
  - Templates
  - Governança (AGENTS.md base)
  
Herança opcional (quando relevante):
  - Padrões de aliases de domínio semelhante
    (ex: novo projeto com tabela "pedidos" pode reusar aliases de public.pedidos)
  - Padrões de snapshots de domínios análogos
  - Decisões arquiteturais do caos-core que se aplicam ao novo contexto
  
Nunca herdar:
  - Snapshots específicos de outro projeto
  - Registry preenchido de outro projeto
  - Telemetria de outro projeto
  - Módulos /k de banco, frontend ou produto específico
```

## O protocolo de promoção de módulo

Quando um módulo de projeto específico se prova universal:

```
Critérios para promoção a caos-core:
  1. O módulo foi usado em 2+ projetos distintos com adaptação mínima
  2. O módulo responde uma pergunta que qualquer projeto pode ter
  3. O módulo não contém referências a domínios, tecnologias ou negócios específicos
  4. O módulo foi validado em pelo menos 5 ciclos reais

Processo:
  1. Identificar o módulo candidato
  2. Remover referências específicas (generalizar)
  3. Criar PR no caos-core com justificativa de universalidade
  4. Atualizar index.md do caos-core
  5. O projeto original mantém sua cópia (não remove)
  6. Projetos futuros herdam a versão generalizada
```

---

# PARTE VI — ESTRATÉGIA DE RETOMADA OPERACIONAL

## O cenário da Fase 5

Qualquer agente, em qualquer ponto, deve conseguir:

1. Identificar em qual estado o projeto está
2. Identificar qual era o ciclo ativo
3. Retomar a partir do estado correto
4. Sem intervenção humana para reconstrução de contexto

## O protocolo de retomada — consolidado

```
CHECKLIST DE RETOMADA (em ordem):

□ 1. Ler AGENTS.md — entender o projeto
□ 2. Verificar rag/locks/ — há ciclo ativo?
□ 3. Ler última telemetria — contexto da última sessão
□ 4. Verificar git log --oneline -5 — último estado verificável
□ 5. Recuperar snapshot do domínio ativo — decisão institucional
□ 6. Aplicar r-staleness-detection — artefatos são confiáveis?
□ 7. Declarar confiança — antes de propor qualquer ação

Tempo esperado: < 15 minutos para retomada completa.
Se > 15 minutos: o sistema não está funcionando como deveria.
```

## Métricas de continuidade

Para a Fase 5, três métricas operacionais são propostas:

| Métrica | Definição | Alvo |
|---|---|---|
| Tempo de retomada | Minutos para novo agente operar com confiança ≥ 70% | < 15 min |
| Cobertura de snapshots | Domínios com pelo menos 1 snapshot / total de domínios | > 80% |
| Frescor de telemetria | Dias desde a última telemetria de sessão | < 7 dias |

Se qualquer métrica estiver fora do alvo, o sistema precisa de manutenção antes de novos ciclos.

---

# PARTE VII — DEGRADAÇÃO CONTROLADA FORMALIZADA

## Os quatro níveis de operação

A degradação controlada é parte oficial da arquitetura, não uma falha.

### Nível 0 — Operação Plena (v3.5+)

Todos os módulos carregados. Git com histórico institucional.
Ciclos com estados formais, handoff estruturado, verificação de diff.

**Indicador:** `git log --oneline | head -3` mostra commits com `[tipo](domínio):`

---

### Nível 1 — Operação Completa sem Verificação (v3.0)

Módulos de continuidade ativos. Snapshots e telemetria disponíveis.
Handoff formal. Estados rastreados. Sem verificação de diff Git.

**Quando ocorre:** r-git-operacional não carregado ou Git sem commits institucionais.

**Impacto:** ciclos são confiáveis mas não verificáveis externamente.

---

### Nível 2 — Operação Estruturada sem Estado Formal (v2.x)

Snapshots e RAG ativos. Matching heurístico.
Handoff informal. Sem rastreamento de estados de ciclo.

**Quando ocorre:** módulos v3.0+ não disponíveis.

**Impacto:** ciclos funcionam mas sem rastreamento formal de transições.

---

### Nível 3 — Operação Mínima (núcleo)

Apenas AGENTS.md + index.md + módulos core + snapshots disponíveis.
Claude lê o contexto e propõe. Humano valida. Execução ocorre.

**Quando ocorre:** projeto recém-bootstrapped ou após perda de módulos avançados.

**Impacto:** funcional para maioria dos casos. Sem continuidade formal entre sessões.

---

### Nível 4 — Operação Básica (sem RAG estruturado)

Apenas AGENTS.md disponível. Sem modules, sem snapshots formais.

**Quando ocorre:** bootstrapping inicial ou repositório vazio.

**Impacto:** Claude opera como assistente genérico com contexto mínimo do projeto.

---

## Regra de degradação

```
O sistema nunca deve indicar "operação impossível".
O sistema sempre indica "operando em nível N com capacidades reduzidas X, Y, Z."

Capacidade parcial é sempre preferível a paralisia.
```

---

# PARTE VIII — PREPARAÇÃO PARA CONTAINERIZAÇÃO

## Princípio

Containerização sem necessidade é complexity prematura.
Containerização preparada sem implementar é arquitetura saudável.

## Contratos que garantem portabilidade futura

### Contrato 1 — Independência de caminho absoluto

Nenhum módulo RAG deve referenciar caminhos absolutos.
Todos os caminhos são relativos à raiz do projeto.

**Verificação:** `grep -r "C:\\\\" rag/` não deve retornar resultados.

### Contrato 2 — Configuração via variáveis de ambiente

Toda credencial, URL e segredo é lida de `.env`.
Nenhum valor sensível está em arquivos commitados.

**Verificação:** `git ls-files .env` retorna vazio.

### Contrato 3 — Estado persistente isolado

Os dados que devem sobreviver ao container são identificáveis:
```
Persistente (volume):
  rag/docs/          ← documentação e snapshots
  rag/r/             ← módulos de regras
  rag/k/             ← módulos de conhecimento
  src/               ← código do produto

Efêmero (não volume):
  rag/locks/         ← estado de sessão
  node_modules/      ← dependências recriáveis
  dist/              ← build recriável
```

### Contrato 4 — Git disponível no ambiente

O C.A.O.S usa Git como ledger. Qualquer ambiente de execução deve ter Git instalado.
Sem Git: sistema opera em Nível 2 de degradação (sem verificação histórica).

### Contrato 5 — Operação offline por padrão

Nenhuma operação core do C.A.O.S depende de rede em tempo de execução.
Apenas: push/pull Git e calls Supabase dependem de rede.
O raciocínio, matching e recuperação de contexto funcionam offline.

## O que o Dockerfile futuro não pode violar

```dockerfile
# FUTURO — não criar agora
# Contratos que o Dockerfile deve respeitar:

# 1. Cópia do código (não volumes de código em produção)
COPY . /app

# 2. Variáveis de ambiente via --env-file
# (nunca ENV com valores hardcoded)

# 3. Volume para memória institucional
VOLUME /app/rag/docs
VOLUME /app/rag/r
VOLUME /app/rag/k

# 4. NÃO volume para locks (efêmero por design)
# rag/locks/ é regenerado em cada sessão

# 5. Git instalado
RUN apt-get install -y git
```

---

# PARTE IX — MODELO DE INICIALIZAÇÃO DE NOVOS PROJETOS

## O fluxo completo de nascimento de um projeto C.A.O.S

```
Fase A — Origem (15-30 minutos)

  1. git clone https://github.com/pydougsilva/caos-core.git novo-projeto
  2. cd novo-projeto && rm -rf .git && git init && git branch -m master main
  3. Personalizar AGENTS.md com identidade do projeto
  4. Preencher k-proj-identidade.md com produto, stack, fase
  5. Preencher k-sys-registry-dominios.md com 3-5 domínios iniciais
  6. git add . && git commit -m "[snapshot](sistema): baseline [nome-projeto]"

Fase B — Primeiro ciclo (30-60 minutos)

  7. Identificar o domínio de maior risco no projeto
  8. Executar primeiro ciclo real com o protocolo completo
  9. Registrar snapshot
  10. Registrar telemetria de entrada

Fase C — Maturação (contínua)

  11. Adicionar módulos /k de domínio conforme necessidade
  12. Executar ciclos, acumular snapshots
  13. Aplicar r-staleness-detection periodicamente
  14. Promover módulos genéricos ao caos-core quando maduros
```

## O critério de "pronto para operar"

Um projeto está pronto para operar com o C.A.O.S quando:

```
□ AGENTS.md personalizado (não template)
□ k-proj-identidade.md preenchido
□ k-sys-registry-dominios.md com ≥ 3 domínios
□ Pelo menos 1 snapshot real (mesmo que simples)
□ Git baseline commit criado
□ Tempo de retomada < 15 minutos para novo agente
```

---

# PARTE X — LIMITES ARQUITETURAIS DA FASE 5

## O que a Fase 5 não fará

| O que não fará | Por quê |
|---|---|
| Automação de snapshots sem gate humano | Destrói garantia de autoria humana |
| Pipeline de sync automático entre projetos | Acoplamento desnecessário |
| Dashboard de métricas | Complexidade sem ROI comprovado |
| Agentes autonomamente promovendo módulos | Requer julgamento humano |
| Containerização implementada | Prematuro sem necessidade real |
| SBERT/embeddings | Reservado para Fase 6 (v4.5 nos termos anteriores) |

## O teto de complexidade da Fase 5

```
Módulos /r: máximo 25 (atualmente 21 — espaço para 4 novos)
Módulos /k: máximo 25 (atualmente 18 — espaço para 7 novos)
Tarefas em index.md: máximo 30 (atualmente ~17)
Documentos em rag/docs/: sem limite — são registros históricos
Snapshots: sem limite — memória acumulativa
```

Se qualquer limite de módulo for atingido: obrigatório aplicar r-module-pruning antes de adicionar novos.

---

# PARTE XI — ANTI-BUROCRACIA ATUALIZADA PARA FASE 5

## Novos sinais de hipertrofia para v5.0

Além dos sinais definidos em r-anti-burocracia, adicionar para Fase 5:

**Sinal 6 — Documentos sobre documentos:**
Se rag/docs/ cresce mais rápido que rag/docs/ciclos/ (onde estão os registros reais de operação), o sistema está documentando mais o C.A.O.S do que usando-o.

**Sinal 7 — Retomada que leva > 30 minutos:**
Se um novo agente leva mais de 30 minutos para entender o estado do projeto, o sistema falhou em seu objetivo central. Não adicionar mais módulos — simplificar o que existe.

**Sinal 8 — Snapshots sem ciclos correspondentes:**
Se há snapshots sendo criados sem ciclos operacionais reais correspondentes (documentando intenções em vez de execuções), o sistema está produzindo memória fictícia.

**Sinal 9 — Módulos que nunca são carregados:**
A partir da Fase 5, toda sessão deve registrar quais módulos foram carregados na telemetria. Módulos com zero carregamentos em 30 dias são candidatos imediatos a r-module-pruning.

---

# PARTE XII — ROADMAP DE IMPLEMENTAÇÃO DA FASE 5

## Sprint 5A — Continuidade de conteúdo (imediato)

**Objetivo:** preencher os gaps de memória identificados na auditoria.

```
1. Primeiro snapshot para os 8 domínios sem histórico
   (pode ser snapshot simples de auditoria, não precisa ser hotfix)
2. Telemetria de sessão atual (esta sessão)
3. Atualizar k-proj-identidade.md para refletir estado pós-Fase 4
```

## Sprint 5B — Protocolo de primeiro snapshot (próxima semana)

**Objetivo:** tornar obrigatório o snapshot ao final de qualquer ciclo em domínio sem histórico.

```
1. Atualizar r-recuperacao-contextual com protocolo de primeiro snapshot
2. Adicionar ao r-orquestracao-caos: "domínio sem snapshot → registrar antes de encerrar sessão"
3. Atualizar r-telemetria-cognitiva com campo: "domínios_sem_snapshot_operados"
```

## Sprint 5C — Registry v2.0 (quando 30+ ciclos reais acumulados)

**Objetivo:** adicionar relações entre domínios, staleness budget, confidence threshold.

```
1. Atualizar k-sys-registry-dominios.md com novos campos
2. Atualizar r-matching-conceito.md para consumir confidence_threshold
3. Atualizar r-staleness-detection.md para consumir staleness_budget_dias
```

## Sprint 5D — Protocolo de promoção de módulo (quando necessário)

**Objetivo:** formalizar como módulos específicos migram para caos-core.

```
1. Criar r-promocao-modulo.md
2. Atualizar caos-core com primeiro módulo promovido
```

---

# DEFINIÇÃO OFICIAL DA FASE 5

> **C.A.O.S v5.0:**
> Infraestrutura Cognitiva Local com Continuidade Operacional Sistêmica,
> capaz de preservar estado, contexto e causalidade entre sessões, agentes e projetos,
> com degradação controlada como design e governança humana como invariante.

A palavra que define a evolução de v4.0 para v5.0 é **sistêmica**.

v4.0: as peças existem e são replicáveis.
v5.0: as peças se conectam em continuidade que sobrevive a qualquer troca de agente, sessão ou projeto.

---

data-criacao: 2026-05-12
alinhado-com: AGENTS.md v3.0 | rag/index.md v10.0
referencia-anterior: C.A.O.S v3.9 — Consolidação Institucional Pré-Fase 4.md
proxima-fase: v5.5 — Memória Semântica Institucional (SBERT)
