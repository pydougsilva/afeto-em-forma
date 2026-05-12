# Afeto em Forma — Projeto de Origem do C.A.O.S

status: primeiro campo operacional homologado
data_adocao: 2026-05-09 (data do primeiro ciclo real)
versao_core: 4.0
repositorio_core: c:\caos-core (local) | github.com/[usuario]/caos-core (remoto futuro)

---

## Papel deste projeto na história do C.A.O.S

O **Afeto em Forma** é o projeto onde o C.A.O.S nasceu.

Não foi planejado assim. O sistema emergiu organicamente:
- cada problema operacional real gerava um protocolo
- cada protocolo virava um módulo RAG
- cada ciclo validado virava um snapshot
- a acumulação de ciclos revelou o padrão

O primeiro ciclo operacional real foi o hotfix de RLS em `public.audit_logs` (2026-05-09).
A partir dele, o sistema começou a se estruturar conscientemente.

---

## O que este projeto tem de específico (não está no caos-core)

| Artefato | Localização | Descrição |
|---|---|---|
| Identidade do produto | rag/k/projeto/k-proj-identidade.md | nome, fase, stack, clientes |
| Roadmap | rag/k/projeto/k-proj-roadmap.md | fases 0-5 do Afeto em Forma |
| Decisões | rag/k/projeto/k-proj-decisoes.md | decisões arquiteturais do produto |
| Schema banco | rag/k/banco/ | tabelas, funções, RLS específicos |
| Frontend | rag/k/frontend/ | App.jsx, checkout, auth |
| Integração | rag/k/integração/ | Supabase client específico |
| Snapshots | rag/r/r-recuperacao-contextual.md | history real do produto |
| Domínios | k-sys-registry-dominios.md | os 9 domínios do Afeto em Forma |

---

## Relação com o caos-core

| Aspecto | Como funciona |
|---|---|
| Módulos /r | Cópias locais dos módulos do caos-core (podem divergir) |
| Módulos /k/sistema | Cópias locais com registry preenchido para os 9 domínios |
| Módulos de produto | Exclusivos deste projeto, não existem no core |
| Sincronização | Manual e por decisão humana — sem sync automático |

---

## Como manter atualizado com o caos-core

Quando o caos-core receber uma atualização relevante:

1. Verificar o CHANGELOG do core
2. Comparar módulo local vs módulo do core (diff)
3. Aplicar a atualização se relevante para o contexto do Afeto em Forma
4. Registrar no snapshot ou telemetria que a atualização foi aplicada

Não há obrigação de manter sincronizado — apenas se a atualização resolver um problema real.
