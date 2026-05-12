# k-fe-auth-context
versao: 5.3

## OBJETIVO

Descrever como autenticação, sessão e perfil funcionam no frontend.

---

## RESPONSABILIDADE

O AuthContext centraliza:
- sessão autenticada
- perfil do usuário
- permissões
- estado de carregamento
- operações de auth

---

## DADOS EXPOSTOS

O contexto expõe:

- session
- profile
- loading
- isLoggedIn
- isAdmin

---

## OPERAÇÕES

Funções principais:

- signUp()
- signIn()
- signOut()
- fetchProfile()
- updateProfile()

---

## signUp()

Responsabilidade:
- criar usuário no Supabase Auth
- iniciar fluxo de onboarding

Importante:
profiles é criado via trigger.

---

## signIn()

Responsabilidade:
- autenticar usuário
- carregar sessão
- atualizar estado global

---

## signOut()

Responsabilidade:
- invalidar sessão atual
- limpar states locais
- redirecionar usuário

---

## fetchProfile()

Responsabilidade:
- carregar perfil do usuário autenticado

Tabela:
profiles

Importante:
sempre respeitar RLS.

---

## updateProfile()

Responsabilidade:
- atualizar dados do usuário

Campos comuns:
- nome
- telefone
- endereço

---

## PERFIL

Tabela:
profiles

Campos importantes:
- user_id
- tenant_id
- nome
- telefone
- role

---

## ADMIN

Permissões administrativas:
devem utilizar:
- is_tenant_admin()
- is_platform_admin()

Evitar:
- validações apenas no frontend

---

## JWT

tenant_id:
é obtido do JWT.

Origem:
app_metadata.

---

## MULTI-TENANT

Toda sessão:
deve carregar:
- tenant_id
- role

Objetivo:
garantir isolamento operacional.

---

## SEGURANÇA

Frontend:
não é fonte da verdade.

Toda validação crítica:
deve existir também no banco.

---

## DEPENDÊNCIAS

Relaciona-se com:
- k-db-funcoes
- r-rls-padrao
- k-int-supabase-client

---

## OBSERVAÇÕES

Este módulo:
- não descreve checkout
- não descreve CSS
- não descreve regras RLS detalhadas