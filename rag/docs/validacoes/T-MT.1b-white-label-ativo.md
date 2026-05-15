---
id: T-MT.1b-white-label-ativo
tipo: produto
estado: homologado
data: 2026-05-15
hipotese: "O white-label multi-tenant pode ser ativado com mudanças cirúrgicas no frontend. O blocker real não era a lógica de routing (já implementada) mas a configuração de SPA hosting ausente"
resultado: validado
---

## DESCOBERTA

T-MT.1a diagnosticou o banco como correto. T-MT.1b descobriu que o slug routing
estava COMPLETAMENTE implementado no App.jsx:
- getRouteTenantSlug() ✓, resolveTenant() ✓, activeTenant ✓
- fetchFornadas/Produtos com .eq("tenant_id", activeTenant.id) ✓
- AuthScreen com tenantId={activeTenant?.id} ✓
- signUp passando tenant_id no raw_user_meta_data ✓

O único blocker era a ausência de vercel.json com SPA rewrite.
Sem ele, /{slug} retornava 404 do CDN antes do React carregar.

4 mudanças aplicadas:
1. vercel.json: SPA rewrite (DESBLOQUEADOR principal)
2. Header: cidade/estado dinâmicos (white-label geográfico)
3. CSS vars: cor_primaria/cor_acento do tenant (white-label visual)
4. Encoding: strings de UX corrigidas (🔥, negócio, não encontrado)

Build passed. Diff validado. Ciclo VERIFICADO → CONCLUÍDO.

## IMPACTO ARQUITETURAL

White-label multi-tenant operacional:
- Cada tenant tem URL própria, nome, localização e cores independentes
- Banco/auth/RLS já estavam corretos (T-MT.1a)
- Frontend agora completa a cadeia de isolamento
Contagem Sprint 5C: 4/30 ciclos reais.

7 validações por código (pré-deploy):
✓ raiz / → DEFAULT_TENANT_SLUG preservado
✓ /{slug} → resolveTenant() intacto
✓ branding dinâmico → useEffect CSS vars
✓ login → signIn inalterado
✓ signUp → tenant_id passado via activeTenant?.id
✓ /admin não vira slug → RESERVED_PATHS preservado
✓ reload em /{slug} → vercel.json SPA rewrite

## REFERÊNCIAS

telemetria: telemetria-20260515-T-MT.1b-frontend.md
commit: a4ecefb (produto) + registros institucionais
modulos_afetados: k-fe-app-estrutura (v1.1), k-proj-identidade, k-sys-registry-dominios
snapshot_ref: frontend/App.jsx-001

## CAOS-CORE

Padrão promotável: SIM — "diagnóstico de blocker em SPA multi-tenant".
Enunciado: "Em SPAs com routing client-side, o hosting deve ter SPA rewrite configurado.
Sem isso, qualquer path além da raiz retorna 404 do CDN antes do framework carregar.
Este é o primeiro lugar a verificar quando 'routing não funciona' em produção."
Condição: aguardar ocorrência em segundo projeto SPA multi-tenant.
