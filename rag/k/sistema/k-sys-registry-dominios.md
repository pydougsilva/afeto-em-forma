# k-sys-registry-dominios
versao: 1.0

## OBJETIVO

Catálogo canônico de domínios operacionais do C.A.O.S.

Define quais domínios existem, como são reconhecidos,
quais módulos RAG são padrão para cada um
e quais snapshots pertencem a cada domínio.

Responde à pergunta:
"quais domínios o sistema conhece e como identifica cada um?"

---

## COMO USAR

Este arquivo é consultado na etapa 0a do fluxo operacional
pelo módulo r-matching-conceito para identificar domínios a partir de prompts.

Também é usado pelo módulo r-recuperacao-contextual para
localizar snapshots de um domínio específico.

Não carregar este arquivo sem necessidade de matching ou recovery.
Contexto mínimo — carregar apenas quando domínio precisa ser identificado.

---

## ESTRUTURA DE UM DOMÍNIO

```
id:               identificador canônico único (schema.tabela)
canônico:         nome completo do domínio
aliases:          lista de termos com pesos de reconhecimento (0.0–1.0)
família:          categoria arquitetural
módulos_padrão:   /r e /k a carregar por padrão para este domínio
snapshots:        IDs de snapshots registrados neste domínio
estado_atual:     estável | degradado | em_manutenção | desconhecido
última_operação:  tipo e data da última operação executada
embedding_path:   [vazio — reservado para v4.0 SBERT]
```

---

## REGISTRY DE DOMÍNIOS

---

### public.audit_logs

```
id: public.audit_logs
canônico: public.audit_logs
aliases:
  - audit_logs         (peso: 1.0)
  - audit_log          (peso: 0.9)
  - logs               (peso: 0.8)
  - auditoria          (peso: 0.8)
  - trilha             (peso: 0.7)
  - trilha_auditoria   (peso: 0.7)
  - histórico          (peso: 0.5)
  - registro           (peso: 0.5)
família: banco/segurança
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-funcoes
snapshots:
  - audit-logs-001
  - audit-logs-002
estado_atual: estável
última_operação: auditoria-verificacao / 2026-05-15
embedding_path:
```

---

### public.tenants

```
id: public.tenants
canônico: public.tenants
aliases:
  - tenants            (peso: 1.0)
  - tenant             (peso: 0.9)
  - negócio            (peso: 0.8)
  - negócios           (peso: 0.8)
  - empresa            (peso: 0.7)
  - loja               (peso: 0.7)
  - estabelecimento    (peso: 0.6)
  - plataforma         (peso: 0.5)
família: banco/multi-tenant
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - tenants-001
  - tenants-002
  - tenants-003
  - tenants-004
estado_atual: estável
última_operação: auth-fix / 2026-05-15
embedding_path:
```

---

### public.profiles

```
id: public.profiles
canônico: public.profiles
aliases:
  - profiles           (peso: 1.0)
  - profile            (peso: 0.9)
  - perfis             (peso: 0.9)
  - perfil             (peso: 0.9)
  - usuário            (peso: 0.8)
  - usuários           (peso: 0.8)
  - cliente            (peso: 0.7)
  - clientes           (peso: 0.7)
  - admin              (peso: 0.6)
família: banco/auth
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - profiles-001
  - profiles-002
estado_atual: estável
última_operação: auditoria-verificacao / 2026-05-15
embedding_path:
```

---

### public.fornadas

```
id: public.fornadas
canônico: public.fornadas
aliases:
  - fornadas           (peso: 1.0)
  - fornada            (peso: 1.0)
  - forno              (peso: 0.8)
  - producao           (peso: 0.7)
  - produção           (peso: 0.7)
  - agendamento        (peso: 0.6)
  - calendário         (peso: 0.5)
  - datas_producao     (peso: 0.7)
família: banco/operacional
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - fornadas-001
estado_atual: estável
última_operação: auditoria-inicial / 2026-05-12
embedding_path:
```

---

### public.produtos

```
id: public.produtos
canônico: public.produtos
aliases:
  - produtos           (peso: 1.0)
  - produto            (peso: 1.0)
  - cardápio           (peso: 0.8)
  - catálogo           (peso: 0.7)
  - pão                (peso: 0.6)
  - bolo               (peso: 0.6)
  - biscoito           (peso: 0.6)
família: banco/operacional
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - produtos-001
estado_atual: estável
última_operação: auditoria-inicial / 2026-05-12
embedding_path:
```

Nota: alias "item" não registrado — peso insuficiente e ambiguidade com public.itens_pedido.

---

### public.pedidos

```
id: public.pedidos
canônico: public.pedidos
aliases:
  - pedidos            (peso: 1.0)
  - pedido             (peso: 1.0)
  - encomenda          (peso: 0.8)
  - encomendas         (peso: 0.8)
  - ordem              (peso: 0.7)
  - compra             (peso: 0.6)
  - checkout           (peso: 0.7)
  - venda              (peso: 0.6)
família: banco/operacional
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - pedidos-001
  - pedidos-002
  - pedidos-003
  - pedidos-004
estado_atual: estável
última_operação: sprint-b-ciclo-operacional / 2026-05-17
embedding_path:
```

---

### public.itens_pedido

```
id: public.itens_pedido
canônico: public.itens_pedido
aliases:
  - itens_pedido       (peso: 1.0)
  - item_pedido        (peso: 0.9)
  - itens              (peso: 0.7)
  - linha_pedido       (peso: 0.7)
  - itens_encomenda    (peso: 0.7)
  - itens_da_encomenda (peso: 0.7)
família: banco/operacional
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - itens-pedido-001
estado_atual: estável
última_operação: auditoria-inicial / 2026-05-12
embedding_path:
```

Nota: alias "itens" tem peso reduzido (0.7) para evitar ambiguidade com itens de cardápio.

---

### public.subscriptions

```
id: public.subscriptions
canônico: public.subscriptions
aliases:
  - subscriptions      (peso: 1.0)
  - subscription       (peso: 0.9)
  - assinaturas        (peso: 0.9)
  - assinatura         (peso: 0.9)
  - plano              (peso: 0.8)
  - planos             (peso: 0.8)
  - billing            (peso: 0.7)
  - pagamento          (peso: 0.6)
família: banco/financeiro
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - subscriptions-001
estado_atual: desconhecido
última_operação: auditoria-inicial / 2026-05-12
embedding_path:
```

---

### public.platform_metrics

```
id: public.platform_metrics
canônico: public.platform_metrics
aliases:
  - platform_metrics   (peso: 1.0)
  - platform_metric    (peso: 0.9)
  - métricas           (peso: 0.9)
  - metrica            (peso: 0.8)
  - analytics          (peso: 0.8)
  - estatísticas       (peso: 0.7)
  - kpis               (peso: 0.6)
  - indicadores        (peso: 0.6)
família: banco/plataforma
módulos_padrão:
  - r/r-rls-padrao
  - k/banco/k-db-tabelas-core
snapshots:
  - platform-metrics-001
estado_atual: desconhecido
última_operação: auditoria-inicial / 2026-05-12
embedding_path:
```

---

### frontend/App.jsx

```
id: frontend/App.jsx
canônico: frontend/App.jsx
aliases:
  - App.jsx          (peso: 1.0)
  - frontend         (peso: 0.9)
  - app              (peso: 0.7)
  - componente       (peso: 0.5)
família: frontend/produto
módulos_padrão:
  - k/frontend/k-fe-app-estrutura
snapshots:
  - frontend-App.jsx-001
  - frontend-App.jsx-002
  - frontend-App.jsx-003
estado_atual: estável
última_operação: security-fix-staleness / 2026-05-16
embedding_path:
```

---

## COMO ADICIONAR NOVO DOMÍNIO

Quando uma operação é realizada pela primeira vez em um domínio não registrado:

1. Identificar: schema.tabela canônico
2. Definir: aliases relevantes com pesos (mínimo 2 aliases, máximo 8)
3. Definir: família arquitetural
4. Definir: módulos /r e /k padrão
5. Registrar: estado_atual = desconhecido até primeira operação
6. Após primeira operação: atualizar estado_atual e última_operação

Regra de peso:
- 1.0 → nome exato da tabela
- 0.9 → variação singular/plural do nome
- 0.8 → tradução direta ou sinônimo forte
- 0.7 → termo relacionado do domínio
- 0.6 → termo contextual (produto do negócio, fluxo)
- 0.5 → termo genérico com ambiguidade

Não registrar alias com peso < 0.5 — aumenta falsos positivos.

---

## FAMÍLIAS REGISTRADAS

| Família | Domínios |
|---|---|
| banco/segurança | public.audit_logs |
| banco/multi-tenant | public.tenants |
| banco/auth | public.profiles |
| banco/operacional | public.fornadas, public.produtos, public.pedidos, public.itens_pedido |
| banco/financeiro | public.subscriptions |
| banco/plataforma | public.platform_metrics |
| frontend/produto | frontend/App.jsx |

---

## LIMITES

- Este arquivo é lido integralmente quando r-matching-conceito está ativo
- Para projetos com > 30 domínios: considerar divisão por família
- Aliases não devem ser criados para aumentar recall — apenas precisão
- embedding_path permanece vazio até v4.0 ser implementado
