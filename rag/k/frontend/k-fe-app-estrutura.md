# k-fe-app-estrutura
versao: 1.2

## OBJETIVO

Mapa estrutural do App.jsx para orientar hotfixes e novas features
sem necessidade de leitura completa do arquivo.

Responde à pergunta:
"onde fica o quê no App.jsx?"

App.jsx — versão 5.5 — 2.368 linhas
Última atualização deste mapa: 2026-06-03

---

## ESTRUTURA GERAL

```
src/App.jsx
│
├── [L1-65]     CONSTANTS + HELPERS
├── [L67-131]   AUTH CONTEXT
├── [L133-465]  AUTH PROVIDER (implementação)
├── [L466-487]  SLOT DOTS (componente UI)
├── [L488-604]  AUTH SCREEN (modal login/cadastro)
├── [L605-805]  CADASTRO NEGÓCIO SCREEN (onboarding Fase 3)
├── [L806-~2358] AFETO EM FORMA APP (componente principal)
└── [L~2359-2368] ROOT / APP (export default)
```

---

## SEÇÃO 1 — CONSTANTS + HELPERS (L1–L65)

```javascript
WA_NUM              // número WhatsApp do negócio
CAT_TO_TIPO         // mapeamento: categoria → tipo interno
CAT_ORDER           // ordem de exibição das categorias
CAT_META            // ícone + label + subtítulo por categoria

vagasPao(f)         // vagas disponíveis de pão numa fornada
vagasBiscoito(f)    // vagas disponíveis de biscoito
pctPao(f)           // % de ocupação de pão
pctBiscoito(f)      // % de ocupação de biscoito
statusLabel(pct)    // cor + texto de status baseado em percentual
formatarFornada(row)// normaliza row do banco → objeto fornada
extrairPreco(val)   // extrai número de string de preço
formatPreco(val)    // formata número → "R$ X,XX"
```

---

## SEÇÃO 2 — AUTH CONTEXT (L67–L131)

```javascript
DEFAULT_TENANT_SLUG = "afeto-em-forma"
RESERVED_PATHS      // paths que não são slugs de tenant
getRouteTenantSlug()// lê o slug do tenant da URL atual
AuthContext         // React context
useAuth()           // hook para acessar contexto de auth
```

---

## SEÇÃO 3 — AUTH PROVIDER (L133–L465)

Componente que envolve toda a aplicação.
Gerencia sessão Supabase, perfil do usuário e tenant ativo.

**State:**
```
session       — sessão Supabase atual (undefined = carregando)
profile       — perfil do usuário (null = não logado)
```

**Valores expostos via context:**
```
session, profile
isLoggedIn    — !!session
isAdmin       — role === "admin" || isPlatformAdmin
isPlatformAdmin — role === "platform_admin"
signUp({ email, password, nome, telefone, endereco, tenant_id })
signIn({ email, password })
signOut()
updateProfile(patch)
```

**Tabela usada:** `profiles` (select: id, nome, telefone, endereco, role, tenant_id)

**IMPORTANTE para hotfix:** Toda lógica de auth passa por aqui.
Não duplicar signIn/signOut em outros componentes.

---

## SEÇÃO 4 — SLOT DOTS (L466–L487)

Componente visual de pontos de ocupação de vagas.
```javascript
SlotDots({ used, cap, urgentAt = 2 })
// Exibe pontos preenchidos/vazios para visualizar vagas
```

---

## SEÇÃO 5 — AUTH SCREEN (L488–L604)

Modal de login/cadastro/reset de senha.
```javascript
AuthScreen({ onClose, tenantId })
```

**Modos:** `login` | `cadastro` | `reset`

**States internos:**
```
mode, loading, errMsg, okMsg, resetSent
fields: { email, password, nome, telefone, endereco }
```

**Fluxo de login:** signIn → AuthContext
**Fluxo de cadastro:** signUp → AuthContext → profile populado
**Fluxo de reset:** supabase.auth.resetPasswordForEmail

---

## SEÇÃO 6 — CADASTRO NEGÓCIO SCREEN (L605–L805)

Formulário de onboarding de novo tenant (Fase 3).
```javascript
CadastroNegocioScreen({ onClose })
```

**Valida slug disponível em tempo real.**
**Tabela:** `tenants` (insert)
**Planos disponíveis:** free | pro (exibidos na UI, sem integração de pagamento ainda)

**FASE 3 STATUS:** implementado, funcional para cadastro manual.
fn_provision_tenant (Edge Function) existe em supabase/functions/ mas integração completa pendente.

---

## SEÇÃO 7 — AFETO EM FORMA APP (L806–L2167)

Componente principal. Todo o estado operacional vive aqui.

### 7.1 — States de navegação (L811–L819)
```
showAuth          — modal de login/cadastro
showCadastro      — modal de cadastro de negócio
adminOpen         — painel admin aberto/fechado
showEditPerfil    — modal de edição de perfil
perfilForm        — { nome, telefone, endereco }
perfilSaving/Err/Ok — estado da edição de perfil
```

### 7.2 — State público (L821–L833)
```
fornadas          — lista de fornadas ativas
loading           — carregando fornadas
produtos          — catálogo de produtos
loadProd          — carregando produtos
qtys              — { [produtoId]: quantidade } selecionado no carrinho
modal             — produto em foco no modal de detalhe
selFornada        — fornada selecionada para o pedido
err / succ        — erro/sucesso do submit de pedido
submitting        — pedido sendo enviado
activeTenant      — dados do tenant resolvido pela URL
tenantLoading/Err — estado do carregamento do tenant
```

### 7.3 — State admin (L836–L860 aprox.)
```
adminTab          — aba ativa: "fornadas" | "pedidos" | "catalogo" | "relatorios" | "plataforma"
pedidosReais      — lista de pedidos (admin)
loadPedidos       — carregando pedidos
platformTenants   — lista de tenants (só platform_admin)
loadPlatform      — carregando tenants
confirmandoId     — ID do pedido sendo confirmado (previne duplo-clique)
newFornada        — form de nova fornada: { data, obs, cap_pao, cap_biscoito }
prodModal         — produto em edição no painel admin (null = fechado)
prodSaving        — salvando produto
novoGuestPedido   — form "+ Pedido Manual" visível/oculto (Sprint D)
guestForm         — { nome, telefone, produtoId, fornada_id, quantidade }
guestErr          — erro no form de pedido manual
guestSaving       — salvando pedido manual
```

### 7.3b — State cliente logado (Sprint D)
```
meusPedidos       — lista de pedidos do cliente logado
loadMeusPedidos   — carregando histórico do cliente
```

### 7.4 — State relatórios (L852–L860)
```
period            — 7 | 30 | { start, end }
customRange       — { start, end } para período personalizado
relKPIs           — { totalPedidos, faturamento, ticketMedio, novosCli, pedidosMes }
relDaily          — array de { data, pedidos, faturamento }
relTopProds       — array de { nome, qtd, faturamento }
relFornadas       — array de { data, pedidos, faturamento }
relLoading        — carregando relatório
```

### 7.5 — Fetches principais (L890–L1110 aprox.)
```
resolveTenant()      — resolve tenant pelo slug da URL (tabela: tenant_public view)
fetchFornadas()      — busca fornadas ativas com ocupação — já filtra por activeTenant.id ✓
fetchProdutos()      — busca catálogo — já filtra por activeTenant.id ✓
fetchPedidos()       — busca pedidos do tenant (admin only)
fetchPlatformTenants() — busca todos tenants (platform_admin only)
fetchRelatorios()    — agrega KPIs, vendas diárias, top produtos, por fornada
criarPedidoManual()  — cria pedido guest (admin): user_id=null, nome_cliente, telefone_cliente (Sprint D)
fetchMeusPedidos()   — busca pedidos do cliente logado: .eq("user_id", session.user.id) (Sprint D)
```

**FASE 3 CONCLUÍDO (T-MT.1b, 2026-05-15):**
- fetchFornadas: já tem `.eq("tenant_id", activeTenant.id)` — IMPLEMENTADO
- fetchProdutos: já tem `.eq("tenant_id", activeTenant.id)` — IMPLEMENTADO
- vercel.json: SPA rewrite ativa slug routing em produção ✓
- useEffect CSS vars: cores de marca dinâmicas por tenant ✓

**Novo useEffect após resolveTenant (~L888-893):**
```javascript
useEffect(() => {
  const r = document.documentElement.style;
  r.setProperty("--pr", activeTenant?.cor_primaria ?? "#6B3E2E");
  r.setProperty("--ac", activeTenant?.cor_acento   ?? "#C68A4D");
}, [activeTenant]);
```

### 7.6 — Actions (L1121–L1290 aprox.)
```
handleConfirmar(pedidoId)  — confirma pedido (admin): pedidos.update(status: "confirmado")
handleSaveFornada(id,campos) — salva/cria fornada: fornadas.update | fornadas.insert
handleSaveProduto()        — salva/cria produto (admin): produtos.update | produtos.insert
handleCheckout()           — submete pedido público: pedidos.insert + itens_pedido.insert (L1257)
                             ATENÇÃO: função real é handleCheckout, não submitPedido (não existe)
                             tenant_id: profile?.tenant_id (não de activeTenant) — L1274
```

**Join obrigatório em queries de pedido:**
```javascript
.select("*, profiles!user_id(nome, telefone)")
```

### 7.7 — Admin tabs e suas telas (a partir de L~1280)

| Tab | Exibe | Tabelas |
|---|---|---|
| fornadas | grid de fornadas + form de nova fornada | fornadas |
| pedidos | lista de pedidos + botão "+ Pedido Manual" (Sprint D) + form guest inline | pedidos + profiles |
| catalogo | grid de produtos + modal de edição | produtos |
| relatorios | KPIs + gráficos (Recharts) | pedidos + itens_pedido |
| plataforma | lista de tenants (só platform_admin) | tenants |

---

## SEÇÃO 8 — ROOT / APP (L~2359–2368)

```javascript
export default function App() {
  return (
    <AuthProvider>
      <style>{CSS}</style>
      <AfetoEmFormaApp />
    </AuthProvider>
  );
}
```

`CSS` é uma string de estilos inline definida antes de L~2359.
A paleta usa variáveis CSS: `--pr` (cor primária), `--ac` (acento), `--mu` (muted).

**Sprint D adicionou antes do footer (cliente logado não-admin):**
Seção "📦 Meus Pedidos" — lista histórico de pedidos do usuário logado.

---

## REGRAS PARA HOTFIX

**Nunca:**
- Gerar App.jsx completo para correção pontual
- Duplicar lógica de auth fora do AuthProvider
- Adicionar nova query Supabase sem verificar tenant_id e RLS
- Modificar fetchPedidos sem incluir join `profiles!user_id(nome, telefone)`

**Sempre:**
- Localizar a função/componente pelo mapa antes de propor patch
- Verificar se a correção afeta estado público OU estado admin (são separados)
- Confirmar que a Fase 3 TODO não conflita com a correção

**Para qualquer feature nova:**
- Avaliar se deve ser state em AfetoEmFormaApp ou componente separado
- Verificar se há estado relacionado já existente (antes de criar novo useState)
- Considerar se ativa por tab admin ou é fluxo público

---

## PENDÊNCIAS CONHECIDAS (atualizado 2026-06-03)

| Item | Localização | Status |
|---|---|---|
| Routing por slug para acesso público | fetchFornadas/Produtos + vercel.json | **CONCLUÍDO** T-MT.1b |
| Branding white-label por tenant (cores) | useEffect CSS vars | **CONCLUÍDO** T-MT.1b |
| Header localização dinâmica | activeTenant.cidade/estado | **CONCLUÍDO** T-MT.1b |
| Guest orders — pedido manual admin | criarPedidoManual + tab pedidos | **CONCLUÍDO** Sprint D |
| Meus Pedidos — histórico cliente logado | fetchMeusPedidos + seção UI | **CONCLUÍDO** Sprint D |
| Display nome_cliente/telefone_cliente no card admin | porder-nm div | **CONCLUÍDO** fix Sprint D |
| Integração fn_provision_tenant | CadastroNegocioScreen L~750 | Edge Function existe, fluxo UI parcial |
| signUp de clientes com tenant_id via slug | AuthScreen + AuthProvider | IMPLEMENTADO — aguarda SMTP real |
| Constraint produtos (nome, categoria) sem tenant_id | banco | **VERIFICADO 2026-06-03** — constraint não existe, sem risco |
| vagas_fornada view — security_invoker | banco | **VERIFICADO 2026-06-03** — SECURITY INVOKER por padrão, seguro |
