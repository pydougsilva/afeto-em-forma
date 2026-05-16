---
id: MT-fix-admin-guard
tipo: produto
estado: homologado
data: 2026-05-15
hipotese: "isAdminForCurrentTenant — admin só acessa painel no tenant ao qual seu profile pertence; RLS é a camada primária, frontend é defense-in-depth"
resultado: validado
---

## DESCOBERTA

Jéssica (admin do piloto) acessou /teste-padaria com painel admin completamente aberto.
RLS protegeu os dados — nenhuma escrita cross-tenant ocorreu.
Mas o guard de frontend estava incorreto: isAdmin era baseado apenas em profile.role,
sem verificar profile.tenant_id === activeTenant.id.

FIX: isAdminForCurrentTenant = isPlatformAdmin || (isAdmin && !!activeTenant && profile?.tenant_id === activeTenant?.id)
9 substituições em AfetoEmFormaApp. AuthProvider/AuthScreen inalterados.

## AUDITORIA ARQUITETURAL (Parte 2 do ciclo)

75% do core de segurança está no banco (RLS/WITH CHECK/constraints).
Hipótese "lógica estrutural deve residir no banco": PARCIALMENTE VALIDADA.

Classificações:
- submitPedido: CRÍTICO (coerência, não security) — usa JWT tenant, não activeTenant
- handleSaveFornada: SEGURO — sem tenant_id, RLS/NOT NULL rejeitam
- handleSaveProduto: SEGURO — usa profile.tenant_id, RLS valida
- confirmarPedido: SEGURO — update por id, RLS limita ao JWT tenant

Riscos residuais para ciclos futuros:
1. vagas_fornada view: security_invoker não verificado
2. submitPedido: pedido vai para JWT tenant, não rota tenant (incoerência)
3. Constraint produtos sem tenant_id (já documentado)

## IMPACTO ARQUITETURAL

Blocker de segurança cross-tenant removido.
Princípio dos Quatro Contextos validado empiricamente — documentado no MANUAL-OPERACIONAL.
Contagem Sprint 5C: 6/30 ciclos reais.

## CAOS-CORE

Padrão promotável: SIM — "isAdminForCurrentTenant guard pattern".
Qualquer SPA multi-tenant com auth JWT deve verificar três alinamentos:
  1. profile.role === "admin" (role check)
  2. profile.tenant_id === activeTenant.id (tenant alignment)
  3. isPlatformAdmin como exceção explícita
Sem os três, qualquer admin de qualquer tenant pode acessar UI administrativa de outros tenants.
