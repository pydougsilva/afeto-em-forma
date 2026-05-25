# r-estados-ciclo
versao: 2.0

## OBJETIVO

Definir os estados formais do ciclo operacional do C.A.O.S
e as regras de transição entre eles.

Responde à pergunta:
"em qual estado está este ciclo e quem pode avançá-lo?"

---

## PRINCÍPIO CENTRAL

Todo ciclo operacional possui um estado rastreável.

O estado é registrado no snapshot a cada transição.
O estado é transferido no handoff entre agentes.
O estado é consultado na retomada de ciclos interrompidos.

---

## MAPA DE ESTADOS

```
DETECTADO
    ↓ agente_orquestrador conclui análise
ANALISADO
    ↓ agente_orquestrador gera instrução estruturada
PROPOSTO
    ↓ usuário aprova         ↓ usuário rejeita
VALIDADO                  REJEITADO ──► (terminal)
    ↓ handoff emitido para agente_executor
EXECUTANDO
    ↓ agente_executor conclui         ↓ agente_executor falha
CONCLUÍDO               FALHOU ──► retorna a ANALISADO
    │
    ↓ rollback solicitado (excepcional)
REVERTIDO ──► (terminal)
```

Estados v3.5 — ativos quando r-git-operacional carregado:

```
EXECUTANDO
    ↓ agente_executor cria commit institucional
COMMITADO
    ↓ agente_orquestrador valida diff ↔ instrução   ↓ divergência detectada
VERIFICADO                           DIVERGENTE ──► retorna ao usuário
    ↓
CONCLUÍDO
```

Modo v3.0 (sem r-git-operacional):
  EXECUTANDO → CONCLUÍDO diretamente.

Modo v3.5 (com r-git-operacional carregado):
  EXECUTANDO → COMMITADO → VERIFICADO → CONCLUÍDO
  ou
  EXECUTANDO → COMMITADO → DIVERGENTE → (decisão do usuário)

---

## DEFINIÇÃO DE CADA ESTADO

### DETECTADO

Condição: domínio foi identificado no prompt (por matching ou menção explícita).
Snapshot disponível se domínio tem histórico.

Quem avança: agente_orquestrador (ao iniciar análise)
Registra no snapshot: estado = DETECTADO, timestamp, domínio identificado

Campos obrigatórios antes de avançar para ANALISADO:
- domínio canônico identificado
- snapshot recuperado (se existir)
- módulos /r e /k selecionados

---

### ANALISADO

Condição: análise arquitetural completa realizada por agente_orquestrador.
Riscos identificados. Contexto histórico consultado.

Quem avança: agente_orquestrador (ao gerar proposta)
Registra no snapshot: estado = ANALISADO, timestamp, módulos usados, riscos identificados

Campos obrigatórios antes de avançar para PROPOSTO:
- análise de riscos documentada
- módulos carregados listados
- contexto histórico consultado (snapshot anterior se existir)

---

### PROPOSTO

Condição: instrução estruturada gerada por agente_orquestrador.
Apresentada ao usuário para validação.

Quem avança: usuário (via aprovação ou rejeição)
Registra no snapshot: estado = PROPOSTO, timestamp, instrução gerada

Campos obrigatórios antes de avançar para VALIDADO:
- instrução completa e sem ambiguidade
- riscos documentados na proposta
- impacto arquitetural descrito

Transições válidas a partir de PROPOSTO:
- PROPOSTO → VALIDADO (aprovação humana)
- PROPOSTO → REJEITADO (rejeição humana)

---

### VALIDADO

Condição: usuário aprovou a instrução proposta.
Gate humano cumprido. Handoff pode ser emitido para agente_executor.

Quem avança: agente_orquestrador (ao emitir handoff)
Registra no snapshot: estado = VALIDADO, timestamp, responsável_validacao = usuário

Campos obrigatórios antes de avançar para EXECUTANDO:
- handoff estruturado completo (r-handoff-executor)
- ciclo_id gerado
- agente_executor identificado

Importante:
VALIDADO é o único estado a partir do qual handoff pode ser emitido.
agente_executor não deve aceitar handoff com estado ≠ VALIDADO.

---

### EXECUTANDO

Condição: agente_executor recebeu handoff válido e está executando a instrução.

Quem avança: agente_executor (ao concluir ou falhar)
Registra no snapshot: estado = EXECUTANDO, timestamp, agente_executor, ciclo_id

Próximo estado — condicional:

Modo v3.0 (sem r-git-operacional): avançar para CONCLUÍDO
Modo v3.5 (com r-git-operacional): avançar para COMMITADO

Campos obrigatórios antes de avançar (ambos os modos):
- execução concluída sem erros
- resultado estruturado retornado para agente_orquestrador
- artefatos listados

Campos adicionais obrigatórios para COMMITADO (modo v3.5):
- commit_hash presente no retorno de agente_executor
- branch presente no retorno de agente_executor

Campos obrigatórios antes de avançar para FALHOU:
- descrição do erro
- artefatos afetados
- se reversão parcial foi necessária

---

### CONCLUÍDO

Condição: execução completada e verificada.
Snapshot atualizado com resultado final.

Estado terminal positivo.

Quem registra: agente_orquestrador (após receber retorno de agente_executor)
Registra no snapshot:
  estado = CONCLUÍDO
  timestamp
  resultado
  artefatos_alterados
  commit_hash: null em modo v3.0 | hash real em modo v3.5 (r-git-operacional)

Transição excepcional:
CONCLUÍDO → REVERTIDO (somente mediante rollback explícito com aprovação humana)

---

### REJEITADO

Condição: usuário rejeitou a proposta em estado PROPOSTO.
Estado terminal.

Registra no snapshot:
  estado = REJEITADO
  timestamp
  motivo_rejeicao (se fornecido pelo usuário)

O ciclo pode ser reiniciado a partir de ANALISADO com nova proposta,
desde que seja um novo ciclo — não continuação do rejeitado.

---

### FALHOU

Condição: agente_executor reportou falha durante a execução.
Não é estado terminal — permite retomada.

Registra no snapshot:
  estado = FALHOU
  timestamp
  erro_descricao
  artefatos_afetados
  reversao_parcial (boolean)

Retorna a ANALISADO para nova análise com contexto da falha.
agente_orquestrador deve incluir a falha e seus detalhes na nova análise.

---

### REVERTIDO

Condição: ciclo previamente CONCLUÍDO foi desfeito via rollback.
Estado terminal.

Requer: ciclo completo de rollback (r-rollback-contextual quando implementado).
Em v3.0: rollback é manual e deve ser documentado pelo usuário.

Registra no snapshot:
  estado = REVERTIDO
  timestamp
  motivo_reversao
  referencia_rollback (ciclo ou commit que desfez a operação)

---

## ESTADOS v3.5 — ativos com r-git-operacional

### COMMITADO (v3.5 — ativo quando r-git-operacional carregado)

Condição: agente_executor concluiu execução e criou commit institucional na branch ops/.
agente_orquestrador recebeu commit_hash e branch no retorno de agente_executor.

Quem avança: agente_orquestrador (ao receber commit_hash válido no retorno de agente_executor)
Registra no snapshot: estado = COMMITADO, timestamp, commit_hash, branch

Campos obrigatórios antes de avançar para VERIFICADO:
- commit_hash presente no retorno de agente_executor
- branch presente no retorno de agente_executor
- r-git-operacional carregado para executar verificação do diff

Sem r-git-operacional: estado não ativado.
Ciclo vai de EXECUTANDO diretamente para CONCLUÍDO (modo v3.0).

---

### VERIFICADO (v3.5 — ativo quando r-git-operacional carregado)

Condição: agente_orquestrador comparou diff do commit com instrução autorizada.
Correspondência confirmada — sem divergência detectada.

Quem avança: agente_orquestrador (ao confirmar correspondência diff ↔ instrução)
Registra no snapshot: estado = VERIFICADO, timestamp, verificacao = aprovada

Campos obrigatórios antes de avançar para CONCLUÍDO:
- diff do commit carregado via r-git-operacional (situação 1 — divergência)
- comparação instrução ↔ diff concluída sem divergência identificada

Sem r-git-operacional: estado não ativado.

---

### DIVERGENTE (v3.5 — ativo quando r-git-operacional carregado)

Condição: agente_orquestrador identificou divergência entre diff do commit e instrução autorizada.
O que agente_executor executou não corresponde ao que foi autorizado.

Quem avança: usuário (deve decidir sobre a divergência)
Registra no snapshot: estado = DIVERGENTE, timestamp, divergencia_descricao

Campos obrigatórios antes de avançar:
- divergencia_descricao explicando o que divergiu e em qual artefato
- diff carregado e disponível como evidência

Transições válidas a partir de DIVERGENTE:
- DIVERGENTE → PROPOSTO: usuário decide aceitar com ajuste na instrução
- DIVERGENTE → REVERTIDO: usuário decide reverter a execução

agente_orquestrador nunca resolve divergência automaticamente.
Divergência é sempre apresentada ao usuário para decisão explícita.

Sem r-git-operacional: estado não ativado.

---

## TRANSIÇÕES VÁLIDAS — TABELA COMPLETA

| De | Para | Quem avança | Gate |
|---|---|---|---|
| DETECTADO | ANALISADO | agente_orquestrador | — |
| ANALISADO | PROPOSTO | agente_orquestrador | — |
| PROPOSTO | VALIDADO | Usuário | obrigatório |
| PROPOSTO | REJEITADO | Usuário | obrigatório |
| VALIDADO | EXECUTANDO | agente_orquestrador (via handoff) | — |
| EXECUTANDO | CONCLUÍDO | agente_executor | — |
| EXECUTANDO | FALHOU | agente_executor | — |
| FALHOU | ANALISADO | agente_orquestrador | — |
| CONCLUÍDO | REVERTIDO | Usuário | obrigatório |
| EXECUTANDO | COMMITADO | agente_executor | — (v3.5 — r-git-operacional) |
| COMMITADO | VERIFICADO | agente_orquestrador | — (v3.5 — r-git-operacional) |
| COMMITADO | DIVERGENTE | agente_orquestrador | — (v3.5 — r-git-operacional) |
| VERIFICADO | CONCLUÍDO | agente_orquestrador | — (v3.5 — r-git-operacional) |
| DIVERGENTE | PROPOSTO | Usuário | obrigatório (v3.5 — r-git-operacional) |
| DIVERGENTE | REVERTIDO | Usuário | obrigatório (v3.5 — r-git-operacional) |

---

## CAMPO DE ESTADO NO SNAPSHOT

Todo snapshot deve incluir o campo `estado_atual` e o array `historico_estados`.

Formato:

```
estado_atual: CONCLUÍDO

historico_estados:
  - estado: DETECTADO    timestamp: 2026-05-09T10:00
  - estado: ANALISADO    timestamp: 2026-05-09T10:15
  - estado: PROPOSTO     timestamp: 2026-05-09T10:30
  - estado: VALIDADO     timestamp: 2026-05-09T10:45
  - estado: EXECUTANDO   timestamp: 2026-05-09T11:00
  - estado: CONCLUÍDO    timestamp: 2026-05-09T11:10
```

---

## RETOMADA DE CICLO INTERROMPIDO

Quando uma sessão é interrompida e o ciclo está em estado intermediário:

1. Carregar snapshot com estado_atual registrado
2. Identificar a partir de qual estado retomar
3. Retomar a partir desse estado sem reanalisar etapas anteriores

Regras de retomada:

| Estado ao interromper | Ação de retomada |
|---|---|
| DETECTADO | reiniciar análise — dados suficientes |
| ANALISADO | retomar com proposta — análise válida |
| PROPOSTO | reapresentar proposta ao usuário |
| VALIDADO | reemitir handoff — validação ainda válida |
| EXECUTANDO | verificar estado real do sistema antes de continuar |
| COMMITADO | verificar commit_hash e executar validação diff com r-git-operacional |
| VERIFICADO | confirmar verificação e avançar para CONCLUÍDO |
| DIVERGENTE | reapresentar divergência ao usuário para decisão |
| FALHOU | retomar em ANALISADO com contexto da falha |

---

## PROIBIÇÕES

Nunca:
- avançar de PROPOSTO para EXECUTANDO sem passar por VALIDADO
- criar handoff com estado ≠ VALIDADO
- marcar CONCLUÍDO sem retorno de agente_executor
- reutilizar ciclo_id de ciclo anterior
- omitir historico_estados do snapshot
- ativar COMMITADO / VERIFICADO / DIVERGENTE sem r-git-operacional carregado

---

## RESULTADO ESPERADO

Ciclos operacionais do C.A.O.S devem:
- ter estado rastreável e verificável em qualquer momento
- ser retomáveis após interrupção sem perda de contexto
- ser transferíveis entre agentes com estado explícito
- registrar história completa de transições no snapshot
