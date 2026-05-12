# C.A.O.S — RAG Update Protocol
versao: 1.0

## OBJETIVO

Garantir que toda alteração relevante no sistema atualize a memória RAG correspondente.

---

# PRINCÍPIO

Código muda.
Memória também deve mudar.

Se não:
- o RAG envelhece
- contexto fica inconsistente
- IA começa a errar

---

# QUANDO ATUALIZAR O RAG

Atualizar módulos /k quando houver:

- nova feature
- alteração de fluxo
- alteração de schema
- mudança de comportamento
- nova integração
- mudança relevante de frontend
- mudança de autenticação
- mudança RLS

Atualizar módulos /r quando houver:

- nova regra operacional
- nova convenção
- nova restrição
- novo padrão obrigatório

---

# PROTOCOLO

## PASSO 1 — IDENTIFICAR IMPACTO

Após concluir tarefa:

identificar:
- quais módulos ficaram desatualizados
- quais novos módulos são necessários

---

## PASSO 2 — CLASSIFICAR

Tipo:
- conhecimento (/k)
- regra (/r)

Nunca misturar.

---

## PASSO 3 — ATUALIZAR

Atualizar apenas:
- módulos impactados
- sem duplicar conteúdo
- preservando responsabilidade única

---

## PASSO 4 — VERSIONAR

Todo módulo atualizado deve:
- atualizar versão
- atualizar data
- manter histórico coerente

---

# REGRAS

- evitar crescimento excessivo
- dividir módulos grandes
- nunca criar “mega documentos”
- nunca copiar App.jsx inteiro

---

# CHECKLIST FINAL

Antes de concluir uma tarefa:

- [ ] código atualizado
- [ ] RAG consistente
- [ ] index.md continua válido
- [ ] nenhum módulo duplicado
- [ ] regras preservadas

---

# GOVERNANÇA

Toda atualização estrutural:
- deve ser explicada
- validada
- executada

Nunca improvisar evolução do RAG.