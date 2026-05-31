# HANDOFF — ciclo-fix-sprint-d-20260531

```yaml
handoff:
  # Identificação do ciclo
  ciclo_id: "b3c2d1e0-f4a5-4b6c-8d7e-9f0a1b2c3d4e"
  versao_protocolo: "3.5"
  timestamp_emissao: "2026-05-31T00:00:00-03:00"

  # Referência institucional
  snapshot_ref: "telemetria-20260531-sprint-d"
  dominio: "frontend/App.jsx"
  familia: "frontend"

  # Classificação
  tarefa: hotfix

  # Estado obrigatório — gate humano executado
  estado_atual: VALIDADO
  timestamp_validacao: "2026-05-31T00:00:00-03:00"

  # Instrução
  instrucao: |
    Aplicar 3 patches cirúrgicos em src/App.jsx.
    Nenhuma migration SQL. Nenhum outro arquivo é alterado.

    PATCH A — Corrigir exibição do nome do produto no select do form de pedido manual.

    Localizar exatamente (única ocorrência):
      {produtos.filter(p => p.ativo).map(p =>
        <option key={p.id} value={p.id}>{p.n} — R$ {p.preco}</option>
      )}

    Substituir por:
      {produtos.filter(p => p.ativo).map(p =>
        <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco}</option>
      )}

    Causa: `produtos` é o state raw (colunas do banco: `nome`, `preco`).
    O campo `p.n` pertence ao `produtosShape` (derivado, não o state).

    ---

    PATCH B — Corrigir campo nome_produto no insert de criarPedidoManual.

    Localizar exatamente (única ocorrência dentro de criarPedidoManual):
          nome_produto:   prod.n,

    Substituir por:
          nome_produto:   prod.nome,

    Causa: mesma raiz do Patch A — `prod` vem de `produtos.find(...)` (state raw).

    ---

    PATCH C — Tornar telefone obrigatório no pedido manual. 3 sub-patches.

    C1 — Validação (localizar exatamente dentro de criarPedidoManual):
      if (!guestForm.nome.trim()) { setGuestErr("Nome do cliente é obrigatório."); return; }

    Substituir por:
      if (!guestForm.nome.trim())     { setGuestErr("Nome do cliente é obrigatório."); return; }
      if (!guestForm.telefone.trim()) { setGuestErr("Telefone é obrigatório."); return; }

    C2 — Placeholder (localizar exatamente no JSX do form):
      <input placeholder="Telefone (opcional)" value={guestForm.telefone}

    Substituir por:
      <input placeholder="Telefone *" value={guestForm.telefone}

    C3 — Insert (localizar exatamente dentro de criarPedidoManual):
          telefone_cliente: guestForm.telefone.trim() || null,

    Substituir por:
          telefone_cliente: guestForm.telefone.trim(),

    ---

    Após aplicar os 3 patches:
    - Criar branch: ops/fix-sprint-d-20260531
    - Commit: [fix](frontend): corrige nome produto e telefone obrigatorio no pedido manual
    - Retornar commit_hash ao agente_orquestrador para validação de diff

  # Contexto histórico
  contexto_historico:
    snapshot_anterior: "telemetria-20260531-sprint-d"
    decisao_anterior: |
      Sprint D entregue em 2026-05-31 (merge 1b655eb).
      5 patches em App.jsx: guest orders + Meus Pedidos.
      Dois bugs identificados pós-entrega pelo usuário:
      1. Select de produto exibia só preço (p.n undefined em state raw)
      2. Telefone era opcional — deve ser obrigatório para pedido manual
    resultado_anterior: "CONCLUÍDO com bugs residuais"
    riscos_ativos:
      - "pedido manual criado com nome_produto null enquanto bug persiste"
      - "pedido manual sem telefone impossibilita contato com cliente"

  # Rastreabilidade
  agente_orquestrador: "Claude Sonnet 4.6"
  agente_executor: "Codex"

  # Módulos RAG usados na análise
  modulos_usados:
    - k/frontend/k-fe-app-estrutura
    - k/banco/k-db-tabelas-core
    - r/r-hotfix-padrao

  # Campos v3.5 — ativos
  commit_type: "fix"
  branch_sugerido: "ops/fix-sprint-d-20260531"
```

---

## CHECKLIST DE VALIDAÇÃO PARA agente_executor

Antes de executar, verificar:

```
□ ciclo_id único: b3c2d1e0-f4a5-4b6c-8d7e-9f0a1b2c3d4e — já processado?
  → NÃO: prosseguir normalmente
  → SIM: retornar resultado anterior (idempotente)

□ estado_atual === "VALIDADO"?
  → SIM: prosseguir

□ instrucao contém condicionais (se/então)?
  → NÃO: instrução é determinística — prosseguir

□ Arquivo alvo existe?
  → src/App.jsx — verificar presença antes de editar

□ Cada localização existe como string exata no arquivo?
  → Verificar Patch A, B, C1, C2, C3 antes de aplicar
  → Se alguma não for encontrada: retornar HANDOFF_INVALIDO
     com campo_invalido: "instrucao" e motivo_rejeicao descrevendo
     qual localização não foi encontrada
```

---

## RETORNO ESPERADO

O agente_executor deve retornar ao agente_orquestrador:

```yaml
retorno_codex:
  ciclo_id: "b3c2d1e0-f4a5-4b6c-8d7e-9f0a1b2c3d4e"
  versao_protocolo: "3.5"
  timestamp_execucao: [ISO 8601]

  estado: CONCLUÍDO  # ou FALHOU ou HANDOFF_INVALIDO

  agente_executor: "Codex"

  resultado: |
    [descrever o que foi alterado]

  artefatos_alterados:
    - "src/App.jsx — Patch A: p.n → p.nome no select de produtos"
    - "src/App.jsx — Patch B: prod.n → prod.nome em nome_produto"
    - "src/App.jsx — Patch C1: validação telefone obrigatório"
    - "src/App.jsx — Patch C2: placeholder Telefone *"
    - "src/App.jsx — Patch C3: remoção de || null em telefone_cliente"

  commit_hash: [hash do commit em ops/fix-sprint-d-20260531]
```
