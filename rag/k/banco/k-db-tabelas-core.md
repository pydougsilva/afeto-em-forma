# k-db-tabelas-core
versao: 5.3

## OBJETIVO

Descrever tabelas operacionais centrais do Afeto em Forma.

---

# profiles

Finalidade:
armazenar perfil do usuário autenticado.

Colunas principais:
- id (uuid)
- user_id (uuid)
- tenant_id (uuid)
- nome
- telefone
- role

Regras:
- vinculado ao auth.users
- usado em joins administrativos
- role define permissões operacionais

Observações:
- joins devem usar:
profiles!user_id(nome,telefone)

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

Colunas principais:
- id
- tenant_id
- user_id
- fornada_id
- status
- valor_total

Regras:
- vinculado ao cliente autenticado
- usado em relatórios
- exige isolamento por tenant

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