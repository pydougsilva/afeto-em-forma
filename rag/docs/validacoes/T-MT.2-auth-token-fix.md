---
id: T-MT.2-auth-token-fix
tipo: produto
estado: homologado
data: 2026-05-15
hipotese: "O 500 em signInWithPassword do segundo tenant é causado por auth.users.confirmation_token = NULL, incompatível com o scanner Go do Supabase Auth — não por bug no hook ou nas policies"
resultado: validado
---

## DESCOBERTA

T-MT.2a diagnosticou via get_logs:
  "Scan error on column index 3, name confirmation_token: converting NULL to string is unsupported"

A fn_custom_access_token_hook executou sem erro para ambos os usuários (Q1 e Q3 ok).
O 500 ocorria ANTES do hook, no scanner interno Go do Supabase Auth, ao ler auth.users.

O código Go do Supabase Auth usa `string` (não `*string`) para confirmation_token.
NULL não pode ser scaneado como string em database/sql → panic → 500.

Assimetria: piloto tem confirmation_token = '' (string vazia, compatível).
Segundo tenant tem confirmation_token = NULL (incompatível com runtime atual).

Causa: versões diferentes do Supabase Auth ao confirmar email:
- Versão antiga: zera confirmation_token para ''
- Versão atual em produção: deixa NULL após confirmação

T-MT.2b fix:
  UPDATE auth.users SET confirmation_token = ''
  WHERE confirmation_token IS NULL AND email_confirmed_at IS NOT NULL;
  → 1 linha atualizada, 0 restando com NULL.

## IMPACTO ARQUITETURAL

Padrão crítico identificado: ao provisionar usuários via fn_provision_tenant ou
qualquer mecanismo externo, garantir confirmation_token = '' para usuários confirmados.
Se deixado NULL, signInWithPassword retorna 500 — diagnóstico difícil (erro interno Go).

Contagem Sprint 5C: 5/30 ciclos reais.

## REFERÊNCIAS

telemetria: telemetria-20260515-T-MT.2-auth-fix.md
commit: a registrar neste ciclo
modulos_afetados: r-recuperacao-contextual (tenants-004), k-sys-registry-dominios
snapshot_ref: tenants-004

## CAOS-CORE

Padrão promotável: SIM — "Supabase Auth 500 por confirmation_token NULL".
Enunciado: "Se signInWithPassword retorna 500 (não 401/403) e as credenciais são válidas,
verificar auth.users.confirmation_token. NULL neste campo causa Scan error no Go runtime
do Supabase Auth. Fix: SET confirmation_token = '' WHERE confirmation_token IS NULL AND
email_confirmed_at IS NOT NULL."
Condição: promover imediatamente — é um padrão não-óbvio com fix trivial e alto valor diagnóstico.
