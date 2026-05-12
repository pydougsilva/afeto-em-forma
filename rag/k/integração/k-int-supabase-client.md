# k-int-supabase-client
versao: 5.3

## OBJETIVO

Descrever como o Supabase é configurado e utilizado no Afeto em Forma.

---

## CLIENTE

Arquivo padrão:

src/lib/supabaseClient.js

Responsabilidade:
centralizar criação do client Supabase.

---

## VARIÁVEIS DE AMBIENTE

Variáveis utilizadas:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Importante:
nunca expor service_role no frontend.

---

## AUTH

Autenticação:
utiliza Supabase Auth.

Sessão:
gerenciada pelo AuthContext.

---

## JWT

O JWT deve carregar:
- tenant_id
- role

Origem:
app_metadata.

---

## RLS

Toda query:
deve respeitar:
- tenant_id
- permissões
- policies RLS

Frontend:
não deve assumir permissões.

---

## JOINS

Join obrigatório para profiles:

profiles!user_id(nome,telefone)

Nunca utilizar:

profiles(nome,telefone)

Motivo:
FK aponta para auth.users.

---

## MULTI-TENANT

Toda operação:
deve carregar tenant_id implicitamente via JWT.

Objetivo:
isolamento de dados por tenant.

---

## PROMOÇÃO DE ADMIN

Operações administrativas:
devem ocorrer:
- via SQL seguro
- ou painel controlado

Nunca:
via frontend anon.

---

## SEGURANÇA

Nunca:
- armazenar secrets no App.jsx
- expor service_role
- confiar apenas em validação frontend

---

## DEPENDÊNCIAS

Relaciona-se com:
- k-fe-auth-context
- r-rls-padrao
- k-db-funcoes

---

## OBSERVAÇÕES

Este módulo:
- não descreve regras RLS completas
- não descreve checkout
- não descreve migrations SQL