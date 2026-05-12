# k-fe-checkout
versao: 5.3

## OBJETIVO

Descrever o fluxo completo de checkout do Afeto em Forma.

---

## CONCEITO

O checkout transforma:
- capacidade operacional
em
- pedidos confirmados

Cada fornada representa:
- uma sessão operacional
- com vagas limitadas

---

## FLUXO PRINCIPAL

Fluxo:

openModal
→ preenchimento do modal
→ handleCheckout
→ validações
→ insert pedidos
→ insert itens_pedido
→ redirecionamento WhatsApp

---

## openModal()

Finalidade:
abrir modal de compra do produto selecionado.

Responsabilidades:
- carregar produto
- carregar fornadas disponíveis
- resetar estados do modal

---

## handleCheckout()

Finalidade:
executar validações e persistir pedido.

Responsabilidades:
- validar campos obrigatórios
- validar vagas disponíveis
- validar regras por tipo de produto
- criar pedido
- criar itens
- enviar usuário ao WhatsApp

---

## VALIDAÇÃO DE VAGAS

O sistema utiliza:
dupla validação

Camadas:
1. frontend
2. banco

Objetivo:
evitar overbooking.

---

## PEDIDOS

Tabela:
pedidos

Campos importantes:
- tenant_id
- user_id
- fornada_id
- status
- valor_total

---

## ITENS

Tabela:
itens_pedido

Campos importantes:
- pedido_id
- produto_id
- quantidade
- preco_unitario

---

## WHATSAPP

Após checkout:
usuário é redirecionado para WhatsApp.

Objetivo:
- confirmação operacional
- comunicação humana
- fechamento do atendimento

---

## LISTA DE ESPERA

Quando fornada lota:
cliente pode entrar:
- em fila
- ou próxima sessão

Conceito:
escassez operacional controlada.

---

## MULTI-TENANT

Toda operação:
deve respeitar tenant_id.

---

## SEGURANÇA

O frontend:
não é fonte da verdade.

Banco:
deve validar:
- vagas
- tenant
- permissões

---

## DEPENDÊNCIAS

Este fluxo depende:
- AuthContext
- Supabase
- RLS
- vagas_fornada
- integração WhatsApp

---

## OBSERVAÇÕES

Este módulo:
- não descreve CSS
- não descreve AuthContext
- não descreve policies RLS