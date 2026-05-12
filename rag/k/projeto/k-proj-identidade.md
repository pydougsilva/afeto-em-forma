# k-proj-identidade
versao: 5.3

## NOME

Afeto em Forma

---

## TIPO

Plataforma SaaS white label de micro-pedidos com janela de produção.

---

## CONCEITO CENTRAL

O sistema transforma:
- tempo
- capacidade operacional
- agenda
em 
produto escasso controlado.

Cada:
- fornada
- sessão
- agenda
- slot operacional

funciona como:
uma sessão com vagas limitadas.

---

## MODELO OPERACIONAL

O sistema trabalha com:

- capacidade limitada
- gestão de escassez
- fila operacional
- previsibilidade
- comunicação clara com cliente

Objetivo:
eliminar overbooking.

---

## CASOS DE USO

A arquitetura atende:

- padarias artesanais
- marmitarias
- clínicas
- consultorias
- oficinas
- salões
- advocacia
- CSA agrícola

Qualquer negócio:
onde tempo ou capacidade são produtos limitados.

---

## PILOTO ATUAL

Cliente:
Jéssica

Negócio:
padaria artesanal.

Cidade:
São Sebastião/SP.

---

## STACK

Frontend:
- React 18
- Vite

Backend:
- Supabase
- PostgreSQL 17.6
- Auth
- RLS

Relatórios:
- Recharts

---

## STATUS

Versão:
5.3

Estado atual:
single-tenant evoluindo para multi-tenant.

---

## FASES CONCLUÍDAS

- Fase 0 → tabelas plataforma
- Fase 1 → tenant_id + backfill
- Fase 2 → isolamento RLS

---

## FASE ATUAL

Fase 3:
correções pendentes + onboarding multi-tenant.

---

## PRÓXIMAS ENTREGAS

- fn_handle_new_user com tenant_id
- botão confirmar pedido
- fn_provision_tenant
- onboarding de tenants

---

## DESIGN

Paleta:
- Bege (#F5EBDD)
- Marrom (#6B3E2E)
- Caramelo (#C68A4D)

Fontes:
- Playfair Display
- Poppins
- Dancing Script

---

## WHITE LABEL

Na Fase 5:
cores e fontes
serão dinâmicas por tenant.

---

## PRINCÍPIO

O sistema:
não vende software.

O sistema:
organiza capacidade operacional.

---

## RELACIONAMENTO

Este módulo:
define identidade e propósito do projeto.

Não define:
- regras SQL
- RLS
- CSS
- lógica de frontend