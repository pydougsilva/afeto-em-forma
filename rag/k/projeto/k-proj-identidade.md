# k-proj-identidade
versao: 5.4

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
5.4

Estado atual:
single-tenant com infraestrutura multi-tenant implementada.
Produto em Fase 3 (pendente). C.A.O.S em Fase 5 (Sprint 5A/5B concluídas).

---

## FASES CONCLUÍDAS — PRODUTO

- Fase 0 → tabelas plataforma
- Fase 1 → tenant_id + backfill
- Fase 2 → isolamento RLS

---

## FASE ATUAL — PRODUTO

Fase 3:
correções pendentes + onboarding multi-tenant.

---

## PRÓXIMAS ENTREGAS — PRODUTO

BLOQUEADORES PARA MULTI-TENANT REAL (confirmados empiricamente em T-MT.1a):
- slug routing /{slug} no App.jsx — frontend não sabe qual tenant renderizar (severidade: alta)
- signUp de clientes deve passar tenant_id no metadata — sem isso, novos clientes sem isolamento
- constraint produtos_nome_categoria_unique deve incluir tenant_id — verificar (severidade: média)

PENDENTES (Fase 3):
- fn_handle_new_user com tenant_id — RESOLVIDO (v2 já deployada, confirmado T6.1a)
- fn_provision_tenant — RESOLVIDO (deployada e funcional, confirmado T-MT.1a)
- botão confirmar pedido (domínio: pedidos)
- onboarding completo de novos tenants (bloqueado pelos 3 itens acima)

NOTA: infraestrutura banco/auth/JWT/RLS está correta para multi-tenant (validado T-MT.1a).
O blocker de produto é o frontend.

---

## C.A.O.S — ESTADO ATUAL

Versão: 5.0 (Sprint 5A/5B + ciclos T4.1, T6.1a, T-MT.1a/1b concluídos)

| Fase C.A.O.S | Status |
|---|---|
| v3.0 — continuidade entre agentes | concluído |
| v3.5 — persistência verificável Git | concluído |
| v3.9 — hardening institucional | concluído |
| v4.0 — replicabilidade institucional | concluído |
| v5.0 — continuidade cognitiva (5A/5B) | concluído |
| v5.0 — Sprint 5C (Registry v2.0) | pendente — após 30+ ciclos reais |
| v5.5 — memória semântica SBERT | planejado |

Cobertura de snapshots: 10 domínios (9 banco + 1 frontend)
Nível de continuidade: Pleno
Sprint 5C: 4/30 ciclos reais acumulados

## MARCO DA FASE 5

T-MT.1b (2026-05-15): white-label multi-tenant ativado em produção.
A infraestrutura multi-tenant (banco + auth + RLS) estava correta.
O blocker era a ausência de SPA routing no hosting (vercel.json).
Cada tenant agora tem:
- URL própria: /{slug}
- Nome de marca dinâmico: activeTenant.nome
- Localização dinâmica: activeTenant.cidade/estado
- Cores de marca dinâmicas: cor_primaria/cor_acento → CSS variables

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