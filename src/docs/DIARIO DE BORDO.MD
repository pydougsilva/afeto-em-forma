# 📓 DIÁRIO DE BORDO — PROJETO AFETO EM FORMA

Missão Construir uma plataforma SaaS white label de micro-pedidos com janela de produção, evoluindo de um MVP single-tenant para uma arquitetura multi-tenant escalável.

Início da Jornada 11 de Abril de 2026  
Última Atualização 30 de Abril de 2026 — 22h07  
Status Atual 🌐 Fase 0+1 (Fundação Multi-Tenant) parcialmente concluída

---

## 🪪 FICHA TÉCNICA

 Campo  Valor 
------
 Nome do produto  Afeto em Forma 
 Nome original  DosAnjos (rebrandado na Sprint de identidade) 
 Versão atual  v5.1 — Merge Catálogo Dinâmico + Relatórios 
 Stack  React 18 + Vite + Supabase (PostgreSQL 17.6, Auth, RLS) + Recharts 
 Cliente piloto  Jéssica — Padaria artesanal, São SebastiãoSP 
 Supabase Project ID  `jekzznblpekavanxcfbu` 
 Arquitetura atual  Single-tenant → Migrando para multi-tenant 
 Próxima fase  Conclusão da Fase 1 + Início da Fase 2 (Isolamento RLS) 

---

## 🗓️ LINHA DO TEMPO DAS SPRINTS

 Sprint  Versão  Data  Funcionalidade Central  Status 
---------------
 S0  —  1104  Análise de Mercado e Concorrência  ✅ 
 S1  v1.0  1204  Cardápio com Fila de Produção Inteligente  ✅ 
 S2  v2.0  1304  Fila por fornada + Capacidade variável  ✅ 
 S3  v2.1  1304  Validação de quantidade vs. vagas  ✅ 
 S4  Schema  1604  Schema SQL completo (tabelas, view, RLS)  ✅ 
 S5  v3.0  1604  Integração Supabase real  ✅ 
 S6  —  2004  Auditoria RLS ao vivo (MCP)  ✅ 
 S7  v4.0  2204  Autenticação completa (Auth, profiles, JWT)  ✅ 
 S8  v4.2  2304  Rebranding + Sprint 1 (Catálogo Dinâmico)  ✅ 
 S9  v5.0  2504  Sprint 2 (Relatórios de Vendas)  ✅ 
 S10  v5.1  2704  Merge Catálogo Dinâmico + Relatórios  ✅ 
 S11  —  2804  Modelagem SaaS White Label (4 novas tabelas)  ✅ 
 S12  —  3004  Hotfix N1 (nome do cliente) + Hotfix N2 (24h bolos)  ✅ 
 S13  —  3004  Fase 0+1 — Fundação Multi-Tenant  ⏳ Parcial 

---

## 📁 VERSÕES DO ARTEFATO

 Versão  Arquivo  Linhas  Descrição 
------------
 v1.0  `dosanjos.jsx`  ~600  Cardápio + Fila mockada 
 v2.0  `dosanjos-v2.jsx`  ~960  Fila por fornada 
 v3.0  `DosAnjos_v3.jsx`  ~1.160  Integração Supabase 
 v4.0  `DosAnjos_v4.jsx`  ~1.241  Autenticação completa 
 v4.2  `App_v4.2.jsx`  ~1.225  Catálogo Dinâmico 
 v5.0  `App.jsx` (Sprint 2)  ~1.628  Relatórios de Vendas 
 v5.1  `App_v5.1.jsx`  1.615  Merge final (versão corrente) 

---

## 🔑 DECISÕES TÉCNICAS REGISTRADAS

 Decisão  Alternativa Descartada  Motivo 
---------
 Fila por fornada (não global)  Contador único  Bug crítico lotar uma data bloqueava todas as outras 
 Recharts em vez de Chart.js  Chart.js (v1)  Compatibilidade nativa com React 
 CSS inline (`const CSS`)  Tailwind  Requisito do projeto zero frameworks externos 
 `GREATEST(0,...)` na VIEW  Subtração direta  Evita vagas negativas 
 `ON DELETE SET NULL` em `pedidos.fornada_id`  CASCADE  Preserva histórico de pedidos 
 `ON DELETE CASCADE` em `pedidos.user_id`  SET NULL  LGPD — direito ao esquecimento 
 Tabelas compartilhadas + `tenant_id`  Schema por tenant  Menor custo operacional; ideal para estágio inicial 
 `app_metadata` para `tenant_id` no JWT  `user_metadata`  Segurança `user_metadata` pode ser alterado pelo usuário 
 Agrupamento client-side nos relatórios  GROUP BY via RPC  Compatível com RLS existente 

---

## 📊 MÉTRICAS DO PROJETO

### Código
- App.jsx (v5.1) 1.615 linhas
- Estados (`useState`) 34 declarações
- Funções assíncronas 16
- Arquivos SQL ~1.000 linhas

### Banco de Dados (Pré-Fase 0+1)
- Tabelas 5 tabelas + 1 VIEW
- Políticas RLS 12 policies ativas
- Registros ~36 (dados de teste)
- Tamanho ~400 kB

### Banco de Dados (Pós-Fase 0+1)
- Novas tabelas 4 (tenants, subscriptions, audit_logs, platform_metrics)
- Nova coluna `tenant_id` em 5 tabelas
- Tenant piloto `7b5217d1-81ef-464e-83ae-8c8bb3b714f8`
- Backfill Zero NULLs

### Consumo de Tokens (Sessão Atual)
- Weekly 37% (era 33% antes da Fase 0+1)
- Contexto 253.149 tokens
- Eficiência +4% weekly para toda a Fase 0+1 parcial

---

## 🏗️ ARQUITETURA DE TRABALHO (DEFINITIVA)

 Camada  Ferramenta  Finalidade  Custo 
------------
 1. Orquestração  DeepSeek (aqui)  Planejamento, auditoria, Diário de Bordo  Grátis 
 2. Centro de Comando  Claude (conversa principal)  Fases pesadas, migrações, MCP  Plano Free 
 3. RAG (Tarefas Leves)  Claude (novas janelas no Projeto)  Hotfixes, correções pontuais  Plano Free 
 4. Assistente Local  Continue.dev + Groq  Documentação, Git, tarefas triviais  Grátis 

---

## 🗺️ PRÓXIMOS PASSOS (ROADMAP)

 ID  Tarefa  Status 
---------
 Fase 0  Criação das tabelas de plataforma  ✅ Concluído 
 Fase 1  Adição de `tenant_id` + backfill + índices  ✅ Concluído 
 Fase 1  Script SQL consolidado  ⏳ Pós 0300 
 Fase 1  Correção constraints UNIQUE  ⏳ Pendente 
 Fase 1  Atualização VIEW `vagas_fornada`  ⏳ Pendente 
 Fase 1  Novas políticas RLS  ⏳ Pendente 
 Fase 2  Isolamento de dados (RLS granular)  ⏳ Futuro 
 Fase 3  Onboarding de novos tenants  ⏳ Futuro 
 Fase 4  Monetização (AsaasStripe)  ⏳ Futuro 
 Fase 5  White Label completo  ⏳ Futuro 

---

## 📝 NOTAS DA SESSÃO DE 30042026

- Hotfix N1 (nome do cliente) resolvido com correção de FK no banco — problema era estrutural, não de front-end.
- Hotfix N2 (validação 24h para bolos) implementado via RAG em nova janela do Projeto.
- Teste do RAG concluído funciona tecnicamente, mas não economiza tokens como esperado. A conversa principal (247k tokens) continua sendo o ambiente mais eficiente.
- Continue.dev instalado e configurado com GitHub. Teste de uso como assistente de documentação e Git pendente.
- Fase 0+1 iniciada às 22h07. Claude inspecionou banco via MCP, criou tabelas de plataforma, tenant piloto, adicionou `tenant_id` em 5 tabelas, backfill validado (zero NULLs), NOT NULL aplicado, índices criados. Bloqueio da sessão antes da geração do script consolidado.
- Retomada programada para 0300 (comando continuar).

---

Diário de Bordo atualizado em 30 de Abril de 2026 — 22h07  
Afeto em Forma — Cuidado em cada pedaço.  
🫡🔥🍞🌐