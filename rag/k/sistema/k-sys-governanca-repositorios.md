# k-sys-governanca-repositorios
versao: 1.0

## OBJETIVO

Definir a separação institucional entre repositório do produto (afetoeforma)
e repositório do sistema C.A.O.S (caos-core).

Responde à pergunta:
"o que pertence a cada repositório e como os dois se relacionam sem acoplamento?"

---

## PRINCÍPIO CENTRAL

Produto CONSOME C.A.O.S.
Produto NÃO carrega histórico arquitetural institucional.

O C.A.O.S é infraestrutura cognitiva reutilizável.
O produto é um domínio de aplicação específico.
A separação é estrutural e não negociável.

---

## RESPONSABILIDADE_REPO_CAOS (caos-core)

Repositório público. Contém tudo que é reutilizável entre projetos.

| Artefato | Localização | Critério |
|---|---|---|
| Protocolo institucional | AGENTS.md | Define papéis e fluxo C.A.O.S genérico |
| Bootstrap do executor | AGENTE-EXECUTOR-BOOTSTRAP.md | Inicialização do papel agente_executor |
| Índice RAG | rag/index.md | Mapa de módulos + ordem de carregamento |
| Regras operacionais | rag/r/*.md | Todos os módulos /r — regras reutilizáveis |
| Conhecimento de sistema | rag/k/sistema/*.md | Exceto registry de domínios (produto-específico) |
| Templates institucionais | rag/templates/*.md | Snapshot, telemetria, AGENTS |
| Manual operacional | rag/docs/MANUAL-OPERACIONAL.md | Documentação para humanos e agentes |
| Validações de protocolo | rag/docs/validacoes/T0.x, T2.x | Descobertas verificáveis do protocolo C.A.O.S |
| Política de distribuição | rag/docs/DISTRIBUICAO-GITHUB.md | Regras de publicação do core |

Regra de classificação:
Um artefato pertence ao core se pode ser usado por qualquer projeto C.A.O.S,
sem depender de dados, schema ou contexto específico de um produto.

---

## RESPONSABILIDADE_REPO_PRODUTO (afetoeforma)

Repositório privado. Contém código e conhecimento específico do produto.

| Artefato | Localização | Critério |
|---|---|---|
| Código produto | src/ | Aplicação React |
| Assets | public/ | Recursos estáticos |
| Schema banco | supabase/ | Migrations, funções, policies |
| Identidade do produto | rag/k/projeto/ | Nome, fase, roadmap, decisões |
| Banco de dados (conhecimento) | rag/k/banco/ | Tabelas, funções, RLS específicos |
| Frontend (conhecimento) | rag/k/frontend/ | App.jsx, checkout, auth |
| Integração | rag/k/integração/ | Supabase client do produto |
| Registry de domínios | rag/k/sistema/k-sys-registry-dominios.md | Os domínios do produto |
| Conteúdo de snapshots | rag/r/r-recuperacao-contextual.md | Histórico real de ciclos do produto |
| Telemetria operacional | rag/docs/ciclos/telemetria/ | Registro de sessões do produto |
| Validações de produto | rag/docs/validacoes/MT-*, T-MT.*, T4.x, T6.x | Ciclos reais do produto |
| Cópias de módulos core | rag/r/*.md | Cópias locais — podem divergir intencionalmente |
| Âncora de origem | CAOS-ORIGIN.md | Vínculo histórico com caos-core |
| Workspace operacional | CAOS_OPERACIONAL.code-workspace | Ambiente dual-repo |

Regra de classificação:
Um artefato pertence ao produto se contém dados operacionais reais, referencia
entidades do produto (tabelas, componentes, clientes) ou é específico do
contexto do Afeto em Forma.

---

## ZONA CINZA — CLASSIFICAÇÕES ESPECIAIS

### rag/r/r-recuperacao-contextual.md

O MÓDULO é institucional (core).
O CONTEÚDO (snapshots com histórico de pedidos, tenants, etc.) é produto.

Regra: o módulo genérico vive no core. O arquivo populado com histórico
real permanece no produto. Na sincronização, copiar apenas a estrutura
do módulo — nunca o conteúdo de snapshots.

### rag/k/sistema/k-sys-registry-dominios.md

O FORMATO é institucional (core).
O CONTEÚDO (9 domínios do Afeto em Forma) é produto.

Regra: o template do registry vive no core. O arquivo populado permanece
no produto. Novos projetos criam seu próprio registry a partir do template.

### Validações arquiteturais (rag/docs/validacoes/)

T0.x, T2.x → protocolo C.A.O.S → core
T-MT.x, MT-x, T4.x, T6.x → ciclos reais do produto → produto

---

## FLUXO_CONSUMO_CORE_PARA_PRODUTO

Quando o core atualiza um módulo genérico:

```
1. Verificar rag/index.md do caos-core (changelog de módulos)
2. Diff manual: módulo local vs módulo do core
3. Decidir: a atualização resolve um problema real no produto?
4. Se sim: copiar e adaptar — preservar divergências intencionais
5. Registrar na telemetria: "sincroniza [módulo] com caos-core [versão]"
6. Commit: [rag](sistema): sincroniza [modulo] com caos-core [versao]
```

Sem obrigação de manter sincronizado.
Sincronização é decisão humana, nunca automática.
Módulos locais podem divergir intencionalmente do core.

---

## FLUXO_PROMOCAO_PRODUTO_PARA_CORE

Quando uma descoberta no produto deve virar padrão do core:

```
1. Verificar: a descoberta é generalizável? (sem dados do produto)
2. Extrair: criar versão genérica do módulo
3. Validar: a versão genérica faz sentido sem o contexto do produto?
4. Promover: commit no caos-core
5. Referenciar: atualizar CAOS-ORIGIN.md no produto
6. Sincronizar: atualizar cópia local via fluxo_consumo
```

Exemplos de promoção válida:
- Novo protocolo operacional sem dados do produto → promover
- Nova regra de governança Git → promover
- Novo template institucional → promover
- r-restauracao-orquestrador.md → CANDIDATO A PROMOVER

Exemplos de não-promoção:
- Registry com domínios do produto → produto-específico
- Snapshot com histórico de pedidos → produto-específico
- Telemetria de operação do produto → produto-específico

---

## REGRA_HISTORICO_GIT

### Histórico pré-separação (até 2026-05-25)

O histórico de commits institucionais em `afetoeforma` representa a ORIGEM
do C.A.O.S. Este histórico:

- É preservado integralmente em afetoeforma — não é removido
- NÃO é reescrito retroativamente
- NÃO é apagado nem movido com destrutividade
- É documentado como "origem institucional" em CAOS-ORIGIN.md
- O caos-core pode ser bootstrapado com estado atual — sem reescrever afetoeforma

Contexto: o C.A.O.S nasceu dentro do Afeto em Forma. O histórico misturado
é a evidência legítima dessa origem. Afetoeforma é o "projeto de origem do core"
conforme declarado em CAOS-ORIGIN.md (commit 5c92cb7, 2026-05-12).

### Histórico pós-separação (a partir de 2026-05-26)

| Tipo de commit | Repositório destino |
|---|---|
| Evolução arquitetural C.A.O.S | caos-core |
| Novo módulo /r ou /k/sistema genérico | caos-core |
| Hardening, telemetria institucional pura | caos-core |
| Operação de produto (feat, fix, migration) | afetoeforma |
| Snapshot operacional de produto | afetoeforma |
| Sincronização produto←core | afetoeforma (com referência ao core) |
| Promoção produto→core | caos-core (commit de promoção) |

### Commits híbridos (inevitáveis)

Alguns ciclos atualizam RAG motivados por operação de produto
(ex: registry update após sprint de produto). Nesses casos:

- Se o módulo atualizado é genérico → commit no core, depois sincronizar
- Se o módulo atualizado é produto-específico → commit no produto
- Registrar na telemetria quando a decisão for ambígua

---

## REGRA_WORKSPACE

O workspace operacional CAOS_OPERACIONAL.code-workspace representa
o ambiente de trabalho com os dois repositórios ativos:

```json
{
  "folders": [
    {"path": "."},           // afetoeforma — produto
    {"path": "../caos-core"} // caos-core — sistema institucional
  ],
  "settings": {
    "claudeCode.useTerminal": true
  }
}
```

Regras:
- O workspace é ambiente operacional — não é artefato institucional do core
- O workspace NÃO substitui a separação Git
- Ter os dois repos no workspace não cria dependência entre eles
- Cada commit deve ir ao repositório correto para o tipo de mudança
- O workspace é estável — não alterar sem necessidade operacional clara
- O workspace file pertence ao repositório do produto (afetoeforma)

Localização: `CAOS_OPERACIONAL.code-workspace` (raiz de afetoeforma)

---

## RISCOS_OPERACIONAIS

| Risco | Severidade | Mitigação |
|---|---|---|
| Commits institucionais no repo errado | Média | Verificar REGRA_HISTORICO_GIT antes de cada commit |
| Módulos locais divergem do core sem registro | Média | Registrar divergências intencionais na telemetria |
| caos-core não clonado localmente | Baixa | Clonar em `../caos-core` antes de sessão institucional |
| Sincronização automática acidental | Alta | Nunca criar submodule, symlink ou CI que copie automaticamente |
| Descoberta relevante não promovida | Baixa | Verificar r-atualizacao-rag após ciclos de evolução C.A.O.S |
| Histórico afetoeforma confundido com canônico do core | Baixa | CAOS-ORIGIN.md documenta a origem — ler antes de decisões |
| caos-core vazio enquanto produto evolui | Média | Executar bootstrap do core assim que possível (plano ativo) |

---

## ANTI_ACOPLAMENTO

Proibido:
- `git submodule` entre produto e core
- Symlinks entre os diretórios dos dois repos
- CI/CD que sincroniza automaticamente entre repos
- Scripts que copiam arquivos entre repos sem decisão humana
- Dependências de package.json ou requirements.txt no core
- Referenciar caminhos absolutos do produto em módulos do core
- Importar módulos do core no código React ou SQL do produto
- Criar commits que tocam arquivos nos dois repos simultaneamente

Permitido:
- Workspace com os dois repos lado a lado (CAOS_OPERACIONAL.code-workspace)
- Cópia manual de módulos (com decisão humana explícita)
- Promoção manual com gate humano
- Referências documentais entre repos (CAOS-ORIGIN.md, telemetria)
- Commits de sincronização no produto referenciando versão do core

---

## ESTADO ATUAL (2026-05-25)

```yaml
afetoeforma:
  status: ativo
  remote: git@github.com:pydougsilva/afeto-em-forma.git
  commits_total: 68
  commits_institucionais: ~22 (histórico de origem — preservados)
  commits_produto: ~34
  commits_mistos: ~12
  contem_modulos_core: sim (cópias locais em rag/r/ e rag/k/sistema/)
  separacao_aplicada: parcial (forward-going a partir deste ciclo)

caos-core:
  status: existente no GitHub, não clonado localmente
  remote: github.com/pydougsilva/caos-core (inferido)
  local_path_esperado: ../caos-core
  workspace_configurado: sim (CAOS_OPERACIONAL.code-workspace)
  bootstrap_institucional: PENDENTE
  conteudo_atual: desconhecido (não verificado nesta sessão)
```

Bootstrap do caos-core é o próximo ciclo institucional após este.

---

## PLANO DE BOOTSTRAP DO caos-core

Quando caos-core for clonado localmente (`../caos-core`):

### Artefatos a copiar do produto para o core

```
AGENTS.md
AGENTE-EXECUTOR-BOOTSTRAP.md
rag/index.md
rag/r/*.md                            (todos exceto r-recuperacao-contextual.md populado)
rag/k/sistema/k-sys-governanca-git.md
rag/k/sistema/k-sys-handoff-format.md
rag/k/sistema/k-sys-handoff-institucional.md
rag/k/sistema/k-sys-nucleo-minimo.md
rag/k/sistema/k-sys-persistencia-operacional.md
rag/k/sistema/k-sys-governanca-repositorios.md   (este arquivo)
rag/templates/AGENTS-template.md
rag/templates/snapshot-template.md
rag/templates/telemetria-template.md
rag/docs/MANUAL-OPERACIONAL.md
rag/docs/DISTRIBUICAO-GITHUB.md
rag/docs/validacoes/CONVENCOES.md
rag/docs/validacoes/T0.1-retomada-fria.md
rag/docs/validacoes/T0.1B-retomada-pos-ajustes.md
rag/docs/validacoes/T2.1-rejeicao-handoff-invalido.md
rag/docs/validacoes/T2.2-aceitacao-handoff-valido.md
rag/docs/validacoes/dependencia-nominal-residual.md
rag/docs/validacoes/index-validacoes.md
```

### Artefatos que ficam APENAS no produto

```
rag/k/projeto/*
rag/k/banco/*
rag/k/frontend/*
rag/k/integração/*
rag/k/sistema/k-sys-registry-dominios.md      (conteúdo produto-específico)
rag/r/r-recuperacao-contextual.md             (conteúdo de snapshots)
rag/docs/ciclos/                              (telemetria operacional)
rag/docs/validacoes/MT-*, T-MT.*, T4.x, T6.x (validações de produto)
CAOS-ORIGIN.md                               (âncora de origem)
CAOS_OPERACIONAL.code-workspace               (ambiente de trabalho)
src/, public/, supabase/                      (código produto)
```

### Commit de bootstrap no caos-core

```
[docs](sistema): bootstrap caos-core — estado institucional 2026-05-25

Origem: pydougsilva/afeto-em-forma (projeto de origem histórica)
Versao: C.A.O.S v5.0 + hardening nominal
Separacao: pós-ciclo-hardening-nominal-20260525

Este commit representa o estado canônico do C.A.O.S extraído do
projeto de origem. Histórico completo preservado em afeto-em-forma.
```
