# k-db-tabelas-core
versao: 5.4

## OBJETIVO

Descrever tabelas operacionais centrais do Afeto em Forma.

---

# profiles

Finalidade:
armazenar perfil do usuário autenticado.

Colunas reais (verificadas via inspeção T6.1a, 2026-05-15):
- id (uuid) — PK, equivale a auth.users.id
- nome (text)
- telefone (text)
- endereco (text)
- preferencias (jsonb ou text)
- tags (text[] ou jsonb)
- role (text) — customer | admin | platform_admin
- created_at (timestamptz)
- updated_at (timestamptz)
- tenant_id (uuid)

Regras:
- vinculado ao auth.users via id (profiles.id = auth.users.id)
- role define permissões operacionais e nível de acesso RLS
- tenant_id é populado por fn_handle_new_user v2 no signUp

Observações:
- joins devem usar: profiles!user_id(nome,telefone)
- user_id não aparece como coluna separada — profiles.id é o auth.users.id diretamente
- fn_custom_access_token_hook lê role e tenant_id para injetar no JWT

---

# produtos

Finalidade:
catálogo operacional do tenant.

Colunas principais:
- id
- tenant_id
- nome
- tipo
- preco
- ativo

Regras:
- tenant isolado via RLS
- produtos inativos não aparecem no catálogo público

---

# fornadas

Finalidade:
representar sessões de produção/agendamento.

Conceito:
cada fornada representa:
- capacidade limitada
- janela operacional
- sessão vendável

Colunas principais:
- id
- tenant_id
- data_entrega
- vagas_total
- ativo

Regras:
- controla disponibilidade
- utilizada pela view vagas_fornada

---

# pedidos

Finalidade:
registrar pedidos/agendamentos realizados.

Colunas (verificadas via MCP 2026-05-16, Sprint A 2026-05-17):
- id (uuid, PK)
- tenant_id (uuid, NOT NULL, FK tenants ON DELETE CASCADE)
- user_id (uuid, NULLABLE, FK profiles ON DELETE SET NULL)
- fornada_id (uuid, NULLABLE, FK fornadas ON DELETE SET NULL)
- data_agendada (date, nullable)
- status (text, NOT NULL, DEFAULT 'pendente')
  CHECK: ('pendente','confirmado','entregue','cancelado')
- valor_total (numeric, nullable, CHECK >= 0)
- created_at (timestamptz, NOT NULL, DEFAULT now())
- pago (boolean, NOT NULL, DEFAULT false) ← Sprint A
- confirmado_em (timestamptz, nullable) ← Sprint A
- entregue_em (timestamptz, nullable) ← Sprint A
- nome_cliente (text, nullable) ← Sprint A (guest orders)
- telefone_cliente (text, nullable) ← Sprint A (guest orders)

Regras:
- user_id nullable: admin pode criar pedido sem conta de cliente (guest order)
- pago=false: pagamento ainda não recebido; pago=true: recebido
- confirmado_em preenchido por Sprint B (confirmarPedido)
- nome_cliente/telefone_cliente usados quando user_id = null
- join de cliente: profiles!user_id(nome,telefone) se user_id não null,
  fallback nome_cliente/telefone_cliente para guest orders

Status válidos:
- pendente → cliente submeteu, aguarda Jéssica
- confirmado → Jéssica vai produzir
- entregue → produto retirado/entregue
- cancelado → cancelado

SEPARAÇÃO OPERACIONAL/FINANCEIRO:
- status = contexto operacional (produção/entrega)
- pago = contexto financeiro (recebimento)
- Relatórios devem usar pago=true para receita recebida (Sprint C)

---

# itens_pedido

Finalidade:
itens individuais do pedido.

Colunas principais:
- id
- tenant_id
- pedido_id
- produto_id
- quantidade
- preco_unitario

Regras:
- vinculado ao pedido principal
- usado em métricas e relatórios

---

## RELACIONAMENTOS

profiles
→ pedidos

fornadas
→ pedidos

pedidos
→ itens_pedido

produtos
→ itens_pedido

---

## MULTI-TENANT

Todas tabelas operacionais:
- possuem tenant_id
- utilizam RLS
- dependem de get_tenant_id()

---

## OBSERVAÇÕES

Este módulo:
- não descreve policies
- não descreve triggers
- não descreve frontend

Esses itens possuem módulos próprios.