# k-proj-identidade
versao: 5.6

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
5.5

Estado atual:
single-tenant com infraestrutura multi-tenant implementada.
Produto em Fase 3 (Sprint D concluída, Sprint E pendente). C.A.O.S em Fase 5 — v5.0 completo.

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

ITENS CONCLUÍDOS (verificados empiricamente):
- fn_handle_new_user com tenant_id — v2 deployada ✓
- fn_provision_tenant — deployada e funcional ✓
- slug routing /{slug} — implementado + vercel.json ✓
- guard admin cross-tenant (isAdminForCurrentTenant) ✓
- addFornada com tenant_id — resolvido ✓
- botão confirmar pedido — JÁ EXISTIA (HOTFIX anterior) ✓
- editar perfil oculto em tenant alheio ✓
- guest orders (pedido manual admin) + Meus Pedidos (cliente logado) ✓ Sprint D
- fix display nome_cliente/telefone_cliente + telefone obrigatório no pedido manual ✓ fix Sprint D
- constraint produtos_nome_categoria_unique — não existe, sem risco ✓ verificado 2026-06-03
- vagas_fornada view — SECURITY INVOKER, seguro ✓ verificado 2026-06-03

PENDENTES (Fase 3):
- signUp de clientes deve passar tenant_id — depende de SMTP configurado
- onboarding completo de novos tenants — depende de SMTP + slug routing
- confirmação do fluxo completo com clientes reais

VERIFICAR ANTES DE MULTI-TENANT COM CLIENTES REAIS:
- signUp de clientes: tenant_id passado corretamente — verificar em produção com SMTP real
- fornadas_select_anon + produtos_select_anon: expõem dados de todos os tenants para anon
  sem filtro de tenant_id (ver H3 — auditado 2026-06-03; aceitável no piloto single-tenant)
- submitPedido não existe — função real é handleCheckout (L1257 App.jsx) ✓ já documentado

NOTA: infraestrutura banco/auth/JWT/RLS correta para multi-tenant.
Frontend: contexto operacional autenticado é tenant-bound (princípio implementado).

---

## C.A.O.S — ESTADO ATUAL

Versão: 5.0 completo (Sprint 5A/5B + hardening-legado-caos-core 2026-05-31)

| Fase C.A.O.S | Status |
|---|---|
| v3.0 — continuidade entre agentes | concluído |
| v3.5 — persistência verificável Git | concluído |
| v3.9 — hardening institucional | concluído |
| v4.0 — replicabilidade institucional | concluído |
| v5.0 — continuidade cognitiva (5A/5B) | concluído |
| v5.0 — hardening-legado caos-core | **concluído (2026-05-31)** |
| v5.0 — Sprint 5C (Registry v2.0) | pendente — após 30+ ciclos reais |
| v5.1 — limpeza institucional | **concluído (2026-05-31)** |
| v5.3 — Bootstrap Institucional Verificável | **concluído (2026-05-31)** |
| v5.4 — Camada de Navegação Mínima (resumption-index v2.0) | **concluído (2026-06-03)** |
| T5.2 — retomada real via resumption-index | **homologado (2026-06-03)** |
| v6.0 — Indexação Relacional | proposta formalizada |
| v5.5 — memória semântica SBERT | planejado |

Cobertura de snapshots: 10 domínios (9 banco + 1 frontend)
Nível de continuidade: Pleno
Sprint 5C: 15/30 ciclos reais acumulados
caos-core: working tree limpo — v5.0 integralmente commitado

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
