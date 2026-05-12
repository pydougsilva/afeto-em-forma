# r-hotfix-padrao (ARQUIVADO)
status: ARQUIVADO
data_arquivamento: 2026-05-12
motivo: duplicata de r-hotfix-padrao.md com conteúdo divergente — versão sem prefixo é legado
substituido_por: rag/r/r-hotfix-padrao.md
versao: 1.0

## OBJETIVO

Garantir patches cirúrgicos e econômicos no App.jsx sem gerar o arquivo completo.

---

## PRINCÍPIO

Correções pequenas:
devem gerar patches pequenos.

---

## REGRAS OBRIGATÓRIAS

Antes de gerar qualquer hotfix:

- localizar função afetada
- identificar linha aproximada
- entender impacto do state
- validar compatibilidade com schema atual

---

## FORMATO OBRIGATÓRIO

Todo patch deve conter:

- descrição do hotfix
- referência da função
- bloco ANTES
- bloco DEPOIS
- comentário inline FIX:

---

## LIMITES

Hotfix padrão:
- máximo recomendado: 50 linhas alteradas

Acima disso:
- avaliar entrega parcial
- evitar regenerar App.jsx completo

---

## COMPATIBILIDADE

Toda query Supabase deve respeitar:
- tenant_id
- RLS
- joins corretos

Join obrigatório:
profiles!user_id(nome,telefone)

Nunca:
profiles(nome,telefone)

---

## SEGURANÇA

Nunca:
- remover validações existentes sem justificativa
- quebrar isolamento multi-tenant
- ignorar tratamento de erro

---

## IMPACTO

Ao final do patch informar:

- linhas adicionadas
- linhas removidas
- impacto em states
- impacto em auth
- necessidade de SQL adicional

---

## PROIBIÇÕES

Nunca:
- gerar App.jsx completo para bug pequeno
- alterar CSS sem solicitação
- alterar AuthProvider sem necessidade
- modificar múltiplos fluxos ao mesmo tempo

---

## RESULTADO ESPERADO

Hotfixes devem ser:
- pequenos
- auditáveis
- seguros
- rápidos de aplicar
- econômicos em tokens