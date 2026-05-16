# Índice de Validações — C.A.O.S
versao: 1.0

| ID | Tipo | Estado | Data | Hipótese (resumo) |
|---|---|---|---|---|
| T0.1-retomada-fria | protocolo | homologado | 2026-05-12 | 3 artefatos suficientes para retomada < 15 min — 4 gaps estruturais identificados |
| T0.1B-retomada-pos-ajustes | protocolo | homologado | 2026-05-13 | 4 ajustes convertem INFERIDA→DIRETA; regressão P1 revela risco de DIRETA-com-erro |
| T2.1-rejeicao-handoff-invalido | protocolo | homologado | 2026-05-13 | Checklist rejeita 3/3 inválidos; condicionalidade v3.0/v3.5 compreendida |
| T2.2-aceitacao-handoff-valido | protocolo | homologado | 2026-05-13 | 10/10 PASSA; zero falsos positivos; canal Claude→Codex validado empiricamente |
| T4.1-primeiro-ciclo-real | protocolo | homologado | 2026-05-15 | End-to-end real validado; sem drift; snapshot-002 criado; 1/30 para Sprint 5C |
| T6.1-verificacao-preveniu-deploy | protocolo | homologado | 2026-05-15 | Auditoria-verificacao cancelou deploy desnecessário; risco já resolvido; 2/30 |
| T-MT.1-banco-correto-multitenant | produto | homologado | 2026-05-15 | Banco multi-tenant ready confirmado; falha é de produto (slug routing); 3/30 |
| T-MT.1b-white-label-ativo | produto | homologado | 2026-05-15 | vercel.json desbloqueia white-label; slug routing já estava completo no App.jsx; 4/30 |
| T-MT.2-auth-token-fix | produto | homologado | 2026-05-15 | 500 em signIn: confirmation_token=NULL no Go scanner; fix: SET ''  WHERE confirmed; 5/30 |
| MT-fix-admin-guard | produto | homologado | 2026-05-15 | isAdminForCurrentTenant fecha cross-tenant; auditoria: 75% core no banco; 6/30 |

---

Limite: 20 entradas.
Adicionar aqui toda nova validação criada em rag/docs/validacoes/.
Remover entradas `deprecated` quando substituídas por versão mais recente.
