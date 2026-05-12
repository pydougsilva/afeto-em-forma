# k-proj-decisoes
versao: 5.3

## OBJETIVO

Registrar decisões arquiteturais importantes do Afeto em Forma.

---

## REGRA

Este módulo:
não registra opiniões temporárias.

Registrar apenas:
- decisões estruturais
- decisões difíceis de reverter
- decisões de alto impacto

---

# DECISÕES

---

## React + componente único

### Escolha
App.jsx centralizado.

### Alternativa descartada
Arquitetura fragmentada prematura.

### Motivo
Velocidade de iteração no piloto.
Redução de complexidade inicial.

---

## Supabase como backend

### Escolha
Supabase com PostgreSQL + Auth + RLS.

### Alternativa descartada
Backend próprio Node.js inicial.

### Motivo
Reduzir tempo operacional.
Aproveitar RLS nativo.
Acelerar MVP.

---

## PostgreSQL + RLS

### Escolha
Isolamento via RLS multi-tenant.

### Alternativa descartada
Controle de tenant apenas no frontend.

### Motivo
Segurança real no banco.
Prevenção de vazamento entre tenants.

---

## app_metadata no JWT

### Escolha
tenant_id em app_metadata.

### Alternativa descartada
user_metadata.

### Motivo
user_metadata pode ser alterado pelo usuário.

---

## WhatsApp como fechamento operacional

### Escolha
Checkout finalizado via WhatsApp.

### Alternativa descartada
Fluxo totalmente automatizado.

### Motivo
Negócios artesanais dependem de comunicação humana.

---

## RAG modular

### Escolha
Múltiplos módulos pequenos.

### Alternativa descartada
DOCUMENTACAO_FINAL.md monolítica.

### Motivo
Redução drástica de tokens.
Maior precisão contextual.

---

## Separação /k e /r

### Escolha
Separar:
- conhecimento
- comportamento operacional

### Alternativa descartada
Misturar documentação com instruções.

### Motivo
Evitar poluição semântica.
Melhorar orquestração do Codex.

---

## C.A.O.S

### Escolha
Sistema operacional cognitivo modular.

### Alternativa descartada
Chats isolados sem memória operacional.

### Motivo
Escalabilidade operacional.
Reuso entre projetos.
Persistência de contexto.

---

## Mobile-first

### Escolha
Prioridade para experiência mobile.

### Alternativa descartada
Desktop-first.

### Motivo
Público operacional usa celular.

---

## Sem Tailwind

### Escolha
CSS próprio com variáveis.

### Alternativa descartada
Framework visual externo.

### Motivo
Controle total.
White label futuro.
Redução de dependências.

---

## White label multi-tenant

### Escolha
Arquitetura preparada para múltiplos negócios.

### Alternativa descartada
Sistema fechado apenas para padaria.

### Motivo
Escalabilidade comercial.

---

## PRINCÍPIO FINAL

Toda decisão:
deve favorecer:

- simplicidade operacional
- escalabilidade futura
- economia cognitiva
- segurança
- velocidade de evolução