# C.A.O.S v3.0 — Continuidade Operacional entre Agentes

versao: 3.0
status: modelagem arquitetural oficial — aguardando implementação
data: 2026-05-10
motivacao: formalização da continuidade operacional entre Claude e Codex
prepara-para: v3.5 (Git), v4.0 (SBERT)
documenta: cinco novos primitivos + fluxo revisado + novos módulos

---

# 1. Introdução Arquitetural

O C.A.O.S v3.0 é o marco de continuidade operacional entre agentes.

v2.x resolveu o problema da memória efêmera:
snapshots preservam decisões, recuperação contextual reutiliza histórico.

v3.0 resolve o problema da continuidade de estado:
quando Claude transfere uma tarefa para Codex, o que exatamente
é transferido? Em qual estado está o ciclo? O Codex tem contexto suficiente
para executar sem improvisar? Codex pode retornar estado para Claude?

Sem v3.0, a transferência entre agentes é implícita e dependente
de contexto conversacional efêmero. Com v3.0, a transferência
é estruturada, rastreável e independente de sessão ativa.

---

# 2. O Problema da Continuidade entre Agentes

O C.A.O.S opera com dois agentes primários:
Claude como orquestrador e Codex como executor.

O problema atual na transição entre eles:

**Problema 1 — Handoff não estruturado**
Claude gera instrução textual. Codex interpreta.
Não há formato formal, campos obrigatórios nem validação de completude.
Instrução incompleta ou ambígua leva Codex a improvisar.

**Problema 2 — Estado do ciclo não rastreado**
Quando um ciclo é interrompido (falha, pausa, mudança de sessão),
não há forma de retomá-lo sem reconstrução manual.
O estado operacional não persiste além da sessão.

**Problema 3 — Domínios sem registry estruturado**
Domínios são reconhecidos por alias e texto livre.
Não há registro canônico de quais domínios existem,
quais módulos são padrão para cada um e quais snapshots pertencem a cada domínio.

**Problema 4 — Matching frágil**
O matching atual é por substring e gatilhos textuais.
Termos novos não previstos em aliases falham silenciosamente.
Não há pesos de relevância nem desambiguação estruturada.

**Problema 5 — Snapshots completos sem delta**
Cada snapshot é um registro completo independente.
A relação entre snapshots de um mesmo domínio é implícita.
Não há rastreamento da evolução de um domínio ao longo do tempo.

v3.0 resolve esses cinco problemas com cinco primitivos novos.

---

# 3. Os Cinco Primitivos de v3.0

| Primitivo | Problema que resolve |
|---|---|
| Registry estruturado de domínios | domínios sem registro canônico |
| Estados formais do ciclo | estado do ciclo não rastreado |
| Handoff Claude → Codex | handoff não estruturado |
| Matching por conceito | matching frágil |
| Snapshots incrementais | snapshots completos sem delta |

Os cinco primitivos são independentes entre si em implementação,
mas complementares em operação. Cada um pode ser implementado
em ordem, sem bloquear os demais.

---

# 4. Registry Estruturado de Domínios

## O que é

O registry é o catálogo canônico de domínios operacionais do sistema.
Define quais domínios existem, como são reconhecidos, quais módulos são padrão
e quais snapshots pertencem a cada um.

## Estrutura de um domínio no registry

```
domínio:
  id: public.audit_logs
  canônico: public.audit_logs
  aliases:
    - audit_logs         (peso: 1.0)
    - logs               (peso: 0.8)
    - auditoria          (peso: 0.8)
    - trilha             (peso: 0.7)
    - trilha de auditoria (peso: 0.7)
  família: banco/segurança
  módulos_padrão:
    - r/r-rls-padrao
    - k/banco/k-db-funcoes
  snapshots: [audit-logs-001]
  estado_atual: estável
  última_operação: hotfix-rls
  última_data: 2026-05-09
```

## Campos obrigatórios

| Campo | Tipo | Descrição |
|---|---|---|
| id | string | identificador canônico único |
| canônico | string | nome completo do domínio |
| aliases | lista[{termo, peso}] | termos de reconhecimento com pesos |
| família | string | categoria arquitetural do domínio |
| módulos_padrão | lista | módulos /r e /k padrão para o domínio |
| snapshots | lista[id] | IDs dos snapshots pertencentes ao domínio |
| estado_atual | enum | estável, degradado, em_manutenção, desconhecido |

## Como o registry é consultado

Na etapa 0 (detecção de domínio), em vez de matching textual livre,
o sistema consulta o registry para:
1. verificar se algum alias do prompt corresponde a domínio registrado
2. calcular score ponderado se múltiplos aliases forem encontrados
3. retornar domínio canônico com seus módulos padrão e snapshots

## Arquivo de persistência

`k/sistema/k-sys-registry-dominios.md`
Um único arquivo com todos os domínios registrados.
Atualizado sempre que um novo domínio é operado pela primeira vez.

---

# 5. Estados Formais do Ciclo Operacional

## O que são

Estados formais são rótulos verificáveis que descrevem em qual ponto
do fluxo operacional um ciclo se encontra. São a base para:
- handoff estruturado entre agentes (qual estado está sendo transferido)
- retomada de ciclos interrompidos (retomar de onde parou)
- rastreamento histórico do ciclo no snapshot

## Mapa de estados

```
DETECTADO
  │ domínio reconhecido, snapshot disponível
  ↓
ANALISADO
  │ análise arquitetural completa
  ↓
PROPOSTO
  │ instrução estruturada gerada por Claude
  ↓
  ├── [GATE: validação humana]
  │
  ↓ aprovado           ↓ rejeitado
VALIDADO            REJEITADO (estado terminal)
  ↓
EXECUTANDO
  │ Codex em execução
  ↓
CONCLUÍDO            FALHOU (retorna ao estado ANALISADO para nova proposta)
  │ snapshot registrado, ciclo fechado
  │
  [possível transição futura]
  ↓
REVERTIDO (se rollback for solicitado após CONCLUÍDO)
```

## Propriedades dos estados

- **Imutável**: um estado registrado não é editado — apenas avançado
- **Rastreável**: cada transição de estado é registrada no snapshot com timestamp
- **Transferível**: o handoff inclui o estado atual — Codex sabe onde o ciclo está

## Campos de estado no snapshot

```
estado_atual: VALIDADO
historico_estados:
  - estado: DETECTADO    timestamp: 2026-05-09T10:00
  - estado: ANALISADO    timestamp: 2026-05-09T10:15
  - estado: PROPOSTO     timestamp: 2026-05-09T10:30
  - estado: VALIDADO     timestamp: 2026-05-09T10:45
```

## Arquivo de regras

`r/r-estados-ciclo.md`
Define: quais transições são válidas, quais campos devem existir em cada
estado, quem pode avançar cada transição e o que é registrado.

---

# 6. Handoff Claude → Codex

## O que é

O handoff é o documento estruturado que Claude gera para Codex
ao final da fase de raciocínio. Contém todo o contexto necessário
para que Codex execute a instrução sem improviso e sem ambiguidade.

## Estrutura do handoff

```
handoff:
  ciclo_id: [uuid gerado por Claude]
  snapshot_ref: audit-logs-001
  domínio: public.audit_logs
  família: banco/segurança
  tarefa: hotfix-rls
  estado_atual: VALIDADO
  instrução: |
    [instrução completa, estruturada, sem ambiguidade]
    [inclui: o que fazer, onde, como validar resultado]
  contexto_histórico:
    decisão_anterior: "substituir subquery email_admin por get_tenant_id()"
    resultado_anterior: sucesso
    riscos_ativos: nenhum
  módulos_usados: [r/r-rls-padrao, k/banco/k-db-funcoes]
  agente_orquestrador: Claude
  agente_executor: Codex
  timestamp_validacao: 2026-05-09T10:45:00
  branch_sugerido: ops/audit-logs-20260509
  commit_type: [rls]
```

## Campos obrigatórios

| Campo | Obrigatório | Descrição |
|---|---|---|
| ciclo_id | sim | identificador único do ciclo |
| snapshot_ref | sim | snapshot que originou o handoff |
| domínio | sim | domínio canônico alvo |
| tarefa | sim | classificação da tarefa |
| estado_atual | sim | deve ser VALIDADO para handoff válido |
| instrução | sim | instrução completa sem ambiguidade |
| agente_orquestrador | sim | Claude |
| agente_executor | sim | Codex (ou agente designado) |
| timestamp_validacao | sim | quando o usuário validou |

## Handoff inválido

Um handoff é considerado inválido se:
- estado_atual ≠ VALIDADO (não houve gate humano)
- instrução ausente ou incompleta
- snapshot_ref não corresponde a snapshot existente
- ciclo_id duplicado (handoff já foi processado)

Codex não deve executar handoff inválido.
Deve retornar estado de rejeição para Claude com motivo.

## Retorno de Codex para Claude

Após execução, Codex retorna:

```
retorno_codex:
  ciclo_id: [mesmo uuid do handoff]
  estado: CONCLUÍDO | FALHOU
  resultado: [descrição do resultado]
  artefatos: [lista de arquivos alterados]
  commit_hash: [se v3.5 estiver implementado]
  timestamp_execucao: [quando executou]
  erros: [se houver]
```

Claude usa o retorno para:
- atualizar o snapshot com estado final
- registrar commit_hash se disponível (v3.5)
- sinalizar ao usuário o resultado do ciclo

## Arquivo de regras

`r/r-handoff-codex.md`
Define: campos obrigatórios, handoff inválido, retorno esperado,
o que Codex não deve fazer sem instrução explícita.

---

# 7. Matching por Conceito

## O que é

Matching por conceito é o mecanismo estruturado que substitui
o matching heurístico atual (substring + gatilhos textuais).

Usa o registry de domínios para calcular um score ponderado
quando múltiplos termos do prompt correspondem a aliases de domínios.

## Algoritmo

```
1. Para cada token relevante do prompt:
      verificar se é alias de algum domínio no registry

2. Para cada domínio com match encontrado:
      calcular score = soma dos pesos dos aliases correspondentes

3. Ordenar domínios por score decrescente

4. Aplicar regra de desambiguação:
      score_1 > score_2 × 1.5 → match único confirmado
      scores próximos → ambiguidade → sinalizar ao usuário

5. Retornar domínio canônico com maior score não ambíguo
```

## Exemplo

Prompt: "verificar isolamento entre tenants nas políticas de acesso dos logs"

Termos encontrados no registry:
- "logs" → public.audit_logs (peso 0.8)
- "políticas" → public.audit_logs / public.profiles (peso 0.6 cada)
- "acesso" → múltiplos domínios (peso 0.4 cada)

Score calculado:
- public.audit_logs: 0.8 + 0.6 + 0.4 = 1.8
- public.profiles: 0.6 + 0.4 = 1.0

Score 1.8 > 1.0 × 1.5? Não (1.8 < 1.5). Ambiguidade leve.
Mas "logs" é alias exclusivo de audit_logs (peso 0.8 dominante).
Regra de alias exclusivo: se um termo tem peso ≥ 0.7 e é exclusivo
de um domínio → esse domínio tem prioridade.

Resultado: public.audit_logs com score ajustado.

## O que matching por conceito não é

Matching por conceito não é matching semântico (v4.0).
Não usa embeddings, não calcula cosine similarity.
Usa uma tabela de aliases com pesos — estruturada, explícita, mantida.

A diferença é importante:
matching por conceito requer que os aliases sejam predefinidos.
Novos termos não previstos no registry não produzem match.
Matching semântico (v4.0) generaliza para termos não previstos.

## Arquivo de regras

`r/r-matching-conceito.md`
Define: algoritmo de score, regra de desambiguação,
limite de ambiguidade, fallback quando sem match.

---

# 8. Snapshots Incrementais

## O que são

Snapshots incrementais registram apenas o delta em relação
ao snapshot anterior do mesmo domínio, em vez de um registro completo.

## Quando usar

Snapshot completo (base):
- primeiro snapshot de um domínio
- após revert — o estado pós-revert é documentado como nova base
- quando mudança é suficientemente grande para justificar nova base

Snapshot incremental (delta):
- ciclos subsequentes no mesmo domínio
- quando a decisão ou contexto é uma evolução do snapshot anterior

## Estrutura de um snapshot incremental

```
snapshot-002 (incremental):
  id: audit-logs-002
  tipo: incremental
  base: audit-logs-001
  domínio: public.audit_logs
  data: 2026-06-15
  tarefa: auditoria-ras
  delta:
    estado: mudança de estável para degradado
    riscos_ativos: [novo risco identificado: policy platform_admin retornou obsoleta]
    nova_decisão: verificar regressão na policy audit_logs_platform_admin
    resultado: pendente
```

## Reconstrução de estado

Para reconstruir o estado completo de um domínio em qualquer ponto:

```
estado_completo = snapshot_base + delta_001 + delta_002 + ... + delta_N
```

Isso permite: "qual era o estado de public.audit_logs em 2026-06-01?"
Basta aplicar os deltas até a data solicitada sobre a base.

## Vantagens

- Reduz redundância: apenas mudanças são registradas
- Mantém trilha evolutiva: a história do domínio é reconstruível
- Facilita detecção de regressão: comparar estado atual com base

## Arquivo de regras

`r/r-snapshots-incrementais.md`
Define: quando usar base vs incremental, estrutura do delta,
como referenciar base, como reconstruir estado completo.

---

# 9. Fluxo Operacional v3.0

```
Etapa 0.   Detecção automática de domínio
             r-auto-recuperacao-contextual
             → gatilhos: G1 (explícito), G2 (classificação), G3 (regressão), G4 (auditoria)

Etapa 0a.  Matching por conceito
             r-matching-conceito + k-sys-registry-dominios
             → score ponderado de aliases
             → domínio canônico identificado ou sinalização de ambiguidade

Etapa 0b.  Recuperação de snapshot
             r-recuperacao-contextual
             → hierarquia de prioridade: último sucesso > riscos ativos > última falha > base
             → estado_atual do ciclo registrado

Etapa 1.   Classificar tarefa
             r-orquestracao-caos
             → tipo: SQL, hotfix, RLS, frontend, arquitetura, etc.

Etapa 2.   Consultar index.md
             → mapear tarefa + domínio → módulos necessários

Etapa 3.   Carregar /r antes de /k
             → máximo 3 módulos por execução

Etapa 4.   Ativar skill apropriada (se disponível)

Etapa 5.   Gerar instrução estruturada
             → incluir contexto histórico do snapshot
             → incluir riscos ativos se existirem
             → preparar campos do handoff

Etapa 6.   Validar com usuário [GATE OBRIGATÓRIO]
             → proposta + instrução apresentadas
             → snapshot de referência informado
             → usuário aprova ou rejeita

Etapa 7.   Emitir handoff estruturado para Codex
             r-handoff-codex
             → estado_atual: VALIDADO
             → instrução completa + contexto + branch + commit_type

Etapa 8.   Codex executa instrução
             → retorna resultado + artefatos

Etapa 9.   Claude recebe retorno de Codex
             → valida resultado vs instrução
             → registra snapshot (incremental se domínio tem base)
             → estado: CONCLUÍDO ou FALHOU
```

---

# 10. Responsabilidades por Agente — v3.0

## Claude (orquestrador)

Acrescenta ao papel atual:
- Consultar registry (etapa 0a) para matching estruturado
- Emitir handoff estruturado com campos obrigatórios (etapa 7)
- Validar retorno de Codex vs instrução emitida (etapa 9)
- Registrar snapshot incremental quando domínio tem base (etapa 9)
- Detectar handoff inválido de Codex e sinalizar ao usuário

## Codex (executor)

Acrescenta ao papel atual:
- Receber e validar handoff (campos obrigatórios presentes?)
- Rejeitar handoff inválido com motivo estruturado
- Executar instrução sem improviso arquitetural
- Retornar resultado estruturado com campos definidos
- Não tomar decisões arquiteturais — escalar para Claude via retorno

## Usuário (governança)

Sem mudança de responsabilidade.
O gate na etapa 6 continua obrigatório e único.

---

# 11. Novos Módulos v3.0

## /k

### k/sistema/k-sys-registry-dominios
Pergunta: quais domínios existem no sistema e como são reconhecidos?

Conteúdo:
- registro de todos os domínios operacionais
- estrutura canônica de cada domínio
- aliases com pesos, família, módulos padrão, snapshots

### k/sistema/k-sys-handoff-format
Pergunta: qual é o formato oficial do documento de handoff?

Conteúdo:
- estrutura completa do handoff
- campos obrigatórios e opcionais
- estrutura do retorno de Codex
- exemplos de handoff válido e inválido

## /r

### r/r-estados-ciclo
Pergunta: quais são os estados formais do ciclo e como transicionam?

Conteúdo:
- mapa completo de estados e transições válidas
- campos obrigatórios por estado
- o que é registrado em cada transição
- estados terminais e seus significados

### r/r-handoff-codex
Pergunta: como Claude emite e Codex recebe um handoff?

Conteúdo:
- campos obrigatórios do handoff
- como validar handoff antes de executar
- o que Codex não deve fazer sem instrução explícita
- estrutura do retorno para Claude

### r/r-matching-conceito
Pergunta: como o sistema identifica domínios a partir de prompts?

Conteúdo:
- algoritmo de score ponderado
- regra de desambiguação
- limite de ambiguidade
- fallback: sem match → fluxo padrão sem recovery

### r/r-snapshots-incrementais
Pergunta: quando e como criar snapshots incrementais?

Conteúdo:
- critérios para base vs incremental
- estrutura do delta
- como referenciar snapshot base
- como reconstruir estado completo

---

# 12. Compatibilidade com v2.2

v3.0 é totalmente aditivo. Nenhum comportamento de v2.2 é removido.

| Componente v2.2 | Status em v3.0 |
|---|---|
| r-auto-recuperacao-contextual | preservado — etapa 0 continua funcionando |
| r-recuperacao-contextual | preservado — snapshots existentes são compatíveis |
| Snapshots completos (audit-logs-001) | preservados — incrementais são opcionais |
| Matching heurístico atual | substituído por matching por conceito — mais robusto |
| Fluxo de 8 etapas | expandido para 9 etapas com handoff estruturado |

Sessões que não carregam módulos v3.0 operam em modo v2.2 por padrão.
v3.0 ativa quando módulos específicos (r-handoff-codex, r-estados-ciclo) são carregados.

---

# 13. Preparação Estrutural para v3.5 (Git)

v3.0 não implementa Git. v3.0 prepara o sistema para receber Git.

**r-estados-ciclo** define os estados COMMITADO e VERIFICADO como
estados opcionais que v3.5 ativará. Em v3.0, esses estados existem
na especificação mas não são acionados.

**r-handoff-codex** inclui campo opcional `commit_type` no handoff.
Em v3.0, esse campo é ignorado por Codex. Em v3.5, Codex o utiliza
para criar o commit com prefixo institucional correto.

**Retorno de Codex** inclui campo opcional `commit_hash`.
Em v3.0, retornado como null. Em v3.5, preenchido com hash real.

Essa preparação garante que a adição de v3.5 não quebre v3.0:
os campos existem, mas são opcionais até que v3.5 seja implementado.

---

# 14. Preparação Estrutural para v4.0 (SBERT)

v3.0 não implementa SBERT. v3.0 prepara o sistema para receber SBERT.

**k-sys-registry-dominios** inclui campo opcional `embedding_path`:
o caminho para o vetor .npy quando v4.0 gerar o embedding do domínio.
Em v3.0, o campo é vazio. Em v4.0, é preenchido na primeira geração.

**r-matching-conceito** define a hierarquia de fallback:
matching semântico (v4.0) → matching por conceito (v3.0) → heurístico.
Em v3.0, apenas matching por conceito está ativo.
Em v4.0, matching semântico torna-se a primeira camada.

Isso garante que v4.0 seja aditivo sobre v3.0 sem quebrar compatibilidade.

---

# 15. Riscos Arquiteturais v3.0

| Risco | Severidade | Descrição | Mitigação |
|---|---|---|---|
| Registry desatualizado | Média | Novo domínio operado sem entrada no registry | r-atualizacao-rag define: nova operação em domínio novo → atualizar registry |
| Handoff incompleto aceito por Codex | Alta | Campos obrigatórios ausentes mas Codex executa assim mesmo | r-handoff-codex define validação obrigatória antes da execução |
| Ambiguidade de domínio não resolvida | Média | Score ponderado produz empate; sistema escolhe arbitrariamente | r-matching-conceito define: empate → sinalizar usuário, não assumir |
| Snapshot incremental órfão | Média | Delta referencia base inexistente | r-snapshots-incrementais exige validação da existência da base antes de criar delta |
| Excesso de estados no ciclo | Baixa | Tracking de estados aumenta overhead | Estados são registrados no snapshot, não processados em runtime — overhead mínimo |
| Registry como ponto único de falha | Média | Se registry não for consultado, matching regride para v2.2 | Fallback definido: sem registry → comportamento v2.2 preservado |

---

# 16. Limites Arquiteturais

| Limite | Descrição |
|---|---|
| Matching por conceito não generaliza | Aliases devem ser predefinidos. Termos novos não reconhecidos. Generalização semântica requer v4.0. |
| Handoff não é self-enforcing | Codex deve implementar validação de campos obrigatórios. Não há mecanismo automático de rejeição. |
| Estados são informativos, não operacionais | O sistema registra estados; não há motor de estado que bloqueie transições inválidas automaticamente. |
| Registry é um arquivo — não um banco | Consulta ao registry requer leitura de arquivo markdown. Sem query engine. |
| Snapshots incrementais requerem reconstrução | Para obter estado completo, o sistema soma base + deltas. Requer carregamento múltiplo. |

---

# 17. Impacto na Identidade do Sistema

## Antes de v3.0

Claude e Codex operam com transferência implícita de contexto.
O estado do ciclo não é rastreado além da sessão.
Domínios são reconhecidos por texto livre.

## Com v3.0

Claude e Codex compartilham estado estruturado via handoff formal.
O ciclo tem estados verificáveis registrados no snapshot.
Domínios são reconhecidos por registry canônico com pesos.
A continuidade operacional é independente de sessão ativa.

## Definição v3.0

**C.A.O.S v3.0:**

Infraestrutura Cognitiva Local com Memória Institucional Persistente
e Continuidade Operacional Estruturada entre Agentes de IA.

A palavra que define a evolução de v2.x para v3.0 é **estruturada**.

v2.x: a continuidade existe, mas é implícita e dependente de sessão.
v3.0: a continuidade é estruturada, formal e independente de sessão.

---

# 18. Ordem de Implementação Recomendada

Os cinco primitivos podem ser implementados sequencialmente:

```
Sprint 1 — Fundação
  1. k-sys-registry-dominios (registry com domínios existentes)
  2. r-estados-ciclo (estados formais + mapa de transições)

Sprint 2 — Comunicação entre agentes
  3. k-sys-handoff-format (estrutura do handoff)
  4. r-handoff-codex (regras de emissão e recepção)

Sprint 3 — Matching e memória
  5. r-matching-conceito (algoritmo de score + desambiguação)
  6. r-snapshots-incrementais (delta sobre base)

Sprint 4 — Atualização de índices
  7. index.md → versão 7.0 com novos módulos e tarefa handoff
  8. AGENTS.md → atualizar fluxo operacional para 9 etapas
```

Cada sprint é deployável e testável independentemente.
Nenhum sprint bloqueia os demais — são aditivos.

---

versao-documento: 3.0
alinhado-com: AGENTS.md v3.0 | rag/index.md v6.0 | C.A.O.S v2.0
prepara-para: v3.5 (Git) | v4.0 (SBERT)
preserva: toda arquitetura v2.x — aditivo, não substitutivo
