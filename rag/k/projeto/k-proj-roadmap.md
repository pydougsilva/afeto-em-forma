# k-proj-roadmap
versao: 5.3

## OBJETIVO

Descrever a evolução planejada do Afeto em Forma.

---

## PRINCÍPIO

Cada fase:
deve manter:
- compatibilidade operacional
- estabilidade do piloto
- evolução incremental

Evitar:
reescritas completas.

---

# FASES

---

## FASE 0 — Fundação da Plataforma

### Status
Concluída.

### Entregas
- estrutura Supabase
- Auth
- tabelas principais
- App.jsx inicial
- checkout WhatsApp

### Objetivo
Validar operação real.

---

## FASE 1 — Tenantização

### Status
Concluída.

### Entregas
- tenant_id
- backfill
- adaptação estrutural

### Objetivo
Preparar isolamento multi-tenant.

---

## FASE 2 — RLS Multi-Tenant

### Status
Concluída.

### Entregas
- get_tenant_id()
- is_tenant_admin()
- is_platform_admin()
- policies RLS tenant-aware

### Objetivo
Garantir isolamento real entre clientes.

---

## FASE 3 — Fundação Operacional Multi-Tenant

### Status
Em andamento.

### Entregas previstas
- onboarding de tenants
- fn_provision_tenant
- fn_handle_new_user tenant-aware
- confirmar pedido admin
- ajustes finais de RLS

### Objetivo
Permitir múltiplos negócios operando simultaneamente.

---

## FASE 4 — Plataforma SaaS

### Status
Planejada.

### Entregas previstas
- billing
- subscriptions
- limites por plano
- métricas da plataforma
- painel master admin

### Objetivo
Transformar o sistema em SaaS comercial.

---

## FASE 5 — White Label

### Status
Planejada.

### Entregas previstas
- temas por tenant
- logos por tenant
- fontes dinâmicas
- domínio customizado
- identidade visual isolada

### Objetivo
Permitir personalização completa por cliente.

---

# HOTFIXES PENDENTES

## N1
Constraints compostas tenant-aware.

## N2
Refatoração completa de joins antigos.

## N3
Auditoria final de policies anon.

## N4
Validação dupla completa de vagas.

## N5
Separação futura do App.jsx.

---

# VISÃO FUTURA

O Afeto em Forma:
não é apenas uma padaria digital.

O sistema é:
uma plataforma operacional
para negócios baseados em capacidade limitada.

---

# PRINCÍPIO DE EVOLUÇÃO

Toda nova fase:
deve preservar:

- simplicidade operacional
- compatibilidade
- segurança multi-tenant
- economia cognitiva
- velocidade de manutenção