# k-db-funcoes
versao: 5.3

## OBJETIVO

Descrever funções SQL estratégicas utilizadas pelo sistema Afeto em Forma.

---

# get_tenant_id()

Finalidade:
obter tenant_id atual a partir do JWT.

Uso:
- policies RLS
- queries protegidas
- isolamento multi-tenant

Origem:
JWT app_metadata

Retorno:
uuid

Importância:
função central do isolamento multi-tenant.

---

# is_tenant_admin()

Finalidade:
verificar se o usuário possui permissão administrativa dentro do tenant atual.

Uso:
- policies administrativas
- operações do painel admin

Retorno:
boolean

Importância:
substitui modelo admin global.

---

# is_platform_admin()

Finalidade:
verificar administradores da plataforma SaaS.

Uso:
- métricas globais
- gestão da plataforma
- suporte interno

Retorno:
boolean

Importância:
separa administração da plataforma da administração do tenant.

---

# is_admin()

Status:
LEGADO

Finalidade original:
administração global binária.

Problema:
não possui contexto multi-tenant.

Risco:
vazamento entre tenants.

Regra:
não utilizar em novas policies.

---

# fn_provision_tenant()

Status:
planejada

Finalidade:
automatizar onboarding de novos tenants.

Responsabilidades:
- criar tenant
- configurar dados iniciais
- criar admin inicial
- aplicar configurações padrão

Uso futuro:
Edge Functions + onboarding SaaS.

---

## OBSERVAÇÕES

Este módulo:
- não descreve triggers
- não descreve SQL interno completo
- não descreve frontend

---

## DEPENDÊNCIAS

As funções dependem:
- JWT válido
- app_metadata
- RLS habilitado
- tenant_id consistente

---

## RESULTADO ESPERADO

As funções devem:
- centralizar regras
- evitar duplicação
- sustentar isolamento multi-tenant
- simplificar policies