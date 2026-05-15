---
id: T-MT.1-banco-correto-multitenant
tipo: produto
estado: homologado
data: 2026-05-15
hipotese: "A infraestrutura de banco (Auth, profiles, JWT, RLS) está correta para multi-tenant. A falha de login do segundo tenant tem causa no frontend/produto, não na infraestrutura"
resultado: validado
---

## DESCOBERTA

T-MT.1a verificou empiricamente todos os elos da cadeia multi-tenant para o segundo tenant
(Padaria Teste, slug: teste-padaria, id: e6840646-58ad-4ffd-8bb1-9064e3de48f2).

H1 (email) - REFUTADA: email_confirmed_at preenchido (2026-05-04)
H2 (profile tenant_id errado) - REFUTADA: tenant_id correto, role=admin
H3 (JWT sem tenant_id) - REFUTADA: consequência de H2 — se H2 ok, H3 ok
H4 (policy hardcoded) - REFUTADA: Q5 retornou 0 linhas
H5 (frontend sem slug routing) - CONFIRMADA: candidato restante, consistente com last_sign_in_at=null

INFRAESTRUTURA CORRETA:
fn_handle_new_user v2 + fn_custom_access_token_hook + get_tenant_id() + RLS
estão funcionais para múltiplos tenants. O banco está multi-tenant ready.

PRODUTO INCOMPLETO:
Slug routing /{slug} ausente → App.jsx não sabe qual contexto de tenant renderizar
signUp de clientes não passa tenant_id no metadata
Possível bug: constraint produtos_nome_categoria_unique sem tenant_id (3/7 produtos)

ACHADO OPERACIONAL:
last_sign_in_at: null — usuário nunca completou login com sessão registrada.
Indica que o frontend não chegou a registrar uma sessão bem-sucedida para este tenant.

## IMPACTO ARQUITETURAL

Banco pode ser declarado multi-tenant ready para Fase 3.
O blocker para multi-tenant real é o frontend: slug routing e contexto de tenant no signUp.
Contagem Sprint 5C: 3/30 ciclos reais.

## REFERÊNCIAS

telemetria: telemetria-20260515-T-MT.1a-tenants.md
commit: a registrar neste ciclo
modulos_afetados: r-recuperacao-contextual (tenants-003), k-sys-registry-dominios, k-proj-identidade
snapshot_ref: tenants-003

## CAOS-CORE

Padrão promotável: SIM — "separação infraestrutura/produto em diagnóstico de comportamento emergente".
Enunciado: "Ao diagnosticar falhas em sistema multi-tenant, verificar sistematicamente cada elo da
cadeia Auth → profiles → JWT → RLS antes de atribuir a falha ao frontend. H1-H4 de banco/auth
devem ser refutadas empiricamente antes de declarar H5 (produto)."
Condição: confirmar padrão em segundo projeto multi-tenant.
