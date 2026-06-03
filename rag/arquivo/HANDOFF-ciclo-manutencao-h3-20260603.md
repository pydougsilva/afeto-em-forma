# HANDOFF — ciclo-manutencao-h3-20260603

```yaml
handoff:
  ciclo_id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"
  versao_protocolo: "3.5"
  timestamp_emissao: "2026-06-03T00:00:00-03:00"

  snapshot_ref: "telemetria-20260603-T52-redesenho"
  dominio: "rag/k/projeto"
  familia: "documentacao"

  tarefa: rag

  estado_atual: VALIDADO
  timestamp_validacao: "2026-06-03T00:00:00-03:00"

  instrucao: |
    Executar duas tarefas de manutenção RAG. Sem migration SQL. Sem alteração de código.
    Apenas os arquivos listados abaixo devem ser modificados.

    ── TAREFA 1: k-proj-identidade.md ──────────────────────────────────────

    Arquivo: rag/k/projeto/k-proj-identidade.md

    Patch 1.1 — Versão
    Localizar exatamente (linha 1 do arquivo):
      versao: 5.5
    Substituir por:
      versao: 5.6

    Patch 1.2 — Status atual
    Localizar exatamente:
      Produto em Fase 3 (pendente). C.A.O.S em Fase 5 — v5.0 completo em ambos os repos.
    Substituir por:
      Produto em Fase 3 (Sprint D concluída, Sprint E pendente). C.A.O.S em Fase 5 — v5.0 completo.

    Patch 1.3 — Itens concluídos (adicionar ao final do bloco ITENS CONCLUÍDOS)
    Localizar exatamente:
      - editar perfil oculto em tenant alheio ✓
    Substituir por:
      - editar perfil oculto em tenant alheio ✓
      - guest orders (pedido manual admin) + Meus Pedidos (cliente logado) ✓ Sprint D
      - fix display nome_cliente/telefone_cliente + telefone obrigatório no pedido manual ✓ fix Sprint D
      - constraint produtos_nome_categoria_unique — não existe, sem risco ✓ verificado 2026-06-03
      - vagas_fornada view — SECURITY INVOKER, seguro ✓ verificado 2026-06-03

    Patch 1.4 — Remover verificações já resolvidas
    Localizar exatamente (bloco completo):
      VERIFICAR ANTES DE MULTI-TENANT COM CLIENTES REAIS:
      - constraint produtos_nome_categoria_unique: verificar se inclui tenant_id
      - vagas_fornada view: verificar security_invoker
      - submitPedido: tenant_id vem de profile, não de activeTenant (coerência)
    Substituir por:
      VERIFICAR ANTES DE MULTI-TENANT COM CLIENTES REAIS:
      - signUp de clientes: tenant_id passado corretamente — verificar em produção com SMTP real
      - fornadas_select_anon + produtos_select_anon: expõem dados de todos os tenants para anon
        sem filtro de tenant_id (ver H3 — auditado 2026-06-03; aceitável no piloto single-tenant)
      - submitPedido não existe — função real é handleCheckout (L1257 App.jsx) ✓ já documentado

    Patch 1.5 — Sprint 5C count
    Localizar exatamente:
      Sprint 5C: 12/30 ciclos reais acumulados
    Substituir por:
      Sprint 5C: 15/30 ciclos reais acumulados

    Patch 1.6 — Tabela C.A.O.S (adicionar linhas após v5.1)
    Localizar exatamente:
      | v5.1 — limpeza institucional | **concluído (2026-05-31)** |
    Substituir por:
      | v5.1 — limpeza institucional | **concluído (2026-05-31)** |
      | v5.3 — Bootstrap Institucional Verificável | **concluído (2026-05-31)** |
      | v5.4 — Camada de Navegação Mínima (resumption-index v2.0) | **concluído (2026-06-03)** |
      | T5.2 — retomada real via resumption-index | **homologado (2026-06-03)** |

    ── TAREFA 2: k-proj-roadmap.md ─────────────────────────────────────────

    Arquivo: rag/k/projeto/k-proj-roadmap.md

    Patch 2.1 — Status H3
    Localizar exatamente:
      ## N3
      Auditoria final de policies anon.
    Substituir por:
      ## N3 — AUDITADO 2026-06-03
      Policies anon auditadas. Encontrado: fornadas_select_anon e produtos_select_anon
      expõem dados de todos os tenants para usuários anon sem filtro de tenant_id.
      Decisão: aceitável para piloto single-tenant atual (dado exposto é cardápio público).
      Risco real ao lançar com múltiplos tenants ativos — revisar antes de Sprint E go-live.
      Solução futura: isolar anon por tenant via PostgREST header ou view segura por tenant.

    ── FIM DA INSTRUÇÃO ─────────────────────────────────────────────────────

    Após os 7 patches:
    - Criar branch: ops/manutencao-h3-20260603
    - Commit: [rag](projeto): manutencao k-proj-identidade v5.5->v5.6 + H3 auditado
    - Retornar commit_hash ao agente_orquestrador para validação de diff

  contexto_historico:
    snapshot_anterior: "telemetria-20260603-T52-redesenho"
    decisao_anterior: |
      Sprint D concluída (guest orders, Meus Pedidos).
      P5/P6 verificados e fechados (2026-06-03).
      H3 auditado nesta sessão: risco documentado, sem migration por ora.
    resultado_anterior: "CONCLUÍDO (sprint D + verificações)"
    riscos_ativos:
      - "fornadas/produtos anon sem tenant isolation — aceitável no piloto, revisar para go-live"

  agente_orquestrador: "Claude Sonnet 4.6"
  agente_executor: "Codex"

  modulos_usados:
    - k/projeto/k-proj-identidade
    - k/projeto/k-proj-roadmap
    - r/r-atualizacao-rag

  commit_type: "rag"
  branch_sugerido: "ops/manutencao-h3-20260603"
```

---

## CHECKLIST PARA agente_executor

```
□ ciclo_id único: d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a — já processado?
  → NÃO: prosseguir

□ estado_atual === "VALIDADO"?
  → SIM: prosseguir

□ Cada localização existe como string exata nos arquivos?
  → Verificar todos os 7 patches antes de aplicar
  → Se alguma não for encontrada: retornar HANDOFF_INVALIDO com campo_invalido: "instrucao"
     e motivo descrevendo qual patch não foi localizado

□ Apenas os 2 arquivos listados serão modificados?
  → SIM — sem código, sem SQL, sem outros arquivos
```

---

## RETORNO ESPERADO

```yaml
retorno_codex:
  ciclo_id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"
  versao_protocolo: "3.5"
  timestamp_execucao: [ISO 8601]

  estado: CONCLUÍDO

  agente_executor: "Codex"

  resultado: |
    [descrever patches aplicados]

  artefatos_alterados:
    - "rag/k/projeto/k-proj-identidade.md — 6 patches (v5.5->v5.6)"
    - "rag/k/projeto/k-proj-roadmap.md — 1 patch (H3 auditado)"

  commit_hash: [hash em ops/manutencao-h3-20260603]
```
