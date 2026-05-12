// VERSÃO 5 - Sprint 2 (Relatórios de Vendas)
// App.jsx — Afeto em Forma · Cardápio com Fila de Produção Inteligente
// Sobre o v3: substitui checkout anônimo por sessão autenticada,
// adiciona AuthContext, telas de Login/Cadastro, e protege o
// painel admin via JWT claim `user_role`.
//
// Estrutura de arquivos esperada:
//   src/
//     lib/supabaseClient.js   ← createClient(URL, ANON_KEY)
//     DosAnjos_v4.jsx         ← este arquivo
//
// Dependências: @supabase/supabase-js recharts

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "../lib/supabaseClient";

/* ═══════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════ */
const WA_NUM = "5512991370007";

/* ═══════════════════════════════════════════════════════════════════
   CATÁLOGO
═══════════════════════════════════════════════════════════════════ */
const CATALOG = [
  { id:"b1", cat:"Bolos",     tipo:"bolo",     e:"🍯", n:"Bolo de Mel de Engenho",           d:"Especiarias mineiras, canela e cravo. Assado lentamente por 2h.", p:"R$ 65" },
  { id:"b2", cat:"Bolos",     tipo:"bolo",     e:"🌽", n:"Bolo de Fubá Cremoso",              d:"Receita da vovó. Cremoso por dentro, casca dourada.", p:"R$ 55" },
  { id:"b3", cat:"Bolos",     tipo:"bolo",     e:"🍌", n:"Bolo de Banana com Rapadura",       d:"Bananas da terra com rapadura artesanal do interior mineiro.", p:"R$ 60" },
  { id:"p1", cat:"Pães",      tipo:"pao",      e:"🍞", n:"Pão Rústico de Forno a Lenha",      d:"Fermentação natural 24h. Casca espessa, miolo alveolado.", p:"R$ 28" },
  { id:"p2", cat:"Pães",      tipo:"pao",      e:"🌽", n:"Pão de Milho Verde",                d:"Milho verde moído na pedra. Textura densa e sabor adocicado.", p:"R$ 32" },
  { id:"c1", cat:"Biscoitos", tipo:"biscoito", e:"⭕", n:"Biscoito de Polvilho Tradicional",  d:"Polvilho azedo no forno a lenha. Leve, crocante, zero conservantes.", p:"R$ 22/pct" },
  { id:"c2", cat:"Biscoitos", tipo:"biscoito", e:"🧀", n:"Biscoito de Polvilho Parmesão",     d:"Parmesão envelhecido na massa. Levemente salgado, irresistível.", p:"R$ 26/pct" },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS PUROS
═══════════════════════════════════════════════════════════════════ */
const vagasPao      = f => Math.max(0, f.capacidade_pao      - f.pao_ocupado);
const vagasBiscoito = f => Math.max(0, f.capacidade_biscoito - f.biscoito_ocupado);
const pctPao        = f => f.capacidade_pao      ? (f.pao_ocupado      / f.capacidade_pao)      * 100 : 0;
const pctBiscoito   = f => f.capacidade_biscoito ? (f.biscoito_ocupado / f.capacidade_biscoito)  * 100 : 0;

function statusLabel(pct) {
  if (pct >= 100) return { txt:"Lotado",   cor:"#C03030", bg:"#FFF0F0" };
  if (pct >= 75)  return { txt:"Quase",    cor:"#C07030", bg:"#FFF6E8" };
  return               { txt:"Disponível", cor:"#3A7A3A", bg:"#F0FBF0" };
}

function formatarFornada(row) {
  return {
    id:                  row.fornada_id,
    data:                row.data,
    label:               new Date(row.data + "T12:00:00")
                           .toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit" })
                           .replace(/^\w/, c => c.toUpperCase()),
    capacidade_pao:      row.capacidade_pao,
    capacidade_biscoito: row.capacidade_biscoito,
    pao_ocupado:         row.pao_ocupado,
    biscoito_ocupado:    row.biscoito_ocupado,
    ativa:               row.ativa,
    observacao:          row.observacao,
  };
}

function extrairPreco(str) {
  const n = parseFloat(str.replace(/[^\d,]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH CONTEXT
   Centraliza sessão, perfil e helpers de autenticação.
   Consumido por qualquer componente via useAuth().
═══════════════════════════════════════════════════════════════════ */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = carregando
  const [profile, setProfile]   = useState(null);

  // Carrega perfil do banco após sessão estabelecida
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, telefone, endereco, role")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    // Sessão inicial (página carregada com cookie existente)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      fetchProfile(s?.user?.id);
    });

    // Listener: login, logout, refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      fetchProfile(s?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Role lida do JWT claim (sem roundtrip ao banco)
  const userRole = session?.user
    ? (session.user.user_metadata?.user_role              // fallback metadata
      ?? session.access_token                             // parse do JWT se necessário
      ?? profile?.role                                    // fallback ao banco
      ?? "customer")
    : null;

  // Forma correta de ler o claim do JWT decodificado
  // O Supabase JS client expõe session.user.app_metadata e user_metadata,
  // mas custom claims ficam diretamente em session.user após refresh.
  // Usamos profile.role como fonte de verdade definitiva (já carregado do banco).
  const isAdmin    = profile?.role === "admin";
  const isLoggedIn = !!session;

  async function signUp({ email, password, nome, telefone, endereco }) {
    return supabase.auth.signUp({
      email, password,
      options: {
        data: { nome, telefone: telefone.replace(/\D/g, ""), endereco },
      },
    });
  }

  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Atualiza o perfil do usuário logado e sincroniza o estado local
  async function updateProfile(patch) {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", session.user.id)
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { data, error };
  }

  return (
    <AuthContext.Provider value={{ session, profile, isAdmin, isLoggedIn, signUp, signIn, signOut, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook conveniente
const useAuth = () => useContext(AuthContext);

/* ═══════════════════════════════════════════════════════════════════
   CSS — v3 intacto + estilos de auth adicionados ao final
═══════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Poppins:wght@300;400;500;600;700&family=Dancing+Script:wght@400;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5EBDD;--srf:#FFF8F2;--srf2:#FAF0E4;
  --pr:#6B3E2E;--prl:#8B5E4E;--prd:#4E2A1A;
  --sc:#C68A4D;--scl:#E3B778;
  --ac:#C68A4D;--acl:#E3B778;
  --tx:#4A2C22;--mu:#8A6A5A;--mum:#A08070;
  --bd:#D9C4A8;--bdl:#EAD8C0;
  --sh:rgba(107,62,46,.12);--shd:rgba(107,62,46,.2);
  --rad:14px;--radd:20px;
  --green:#7A8B5B
}
html{scroll-behavior:smooth}
body{font-family:'Poppins',sans-serif;background:var(--bg);color:var(--tx);-webkit-font-smoothing:antialiased}
.handwrite{font-family:'Dancing Script',cursive}
.hdr{background:linear-gradient(160deg,#2A1208 0%,#4E2A1A 45%,#6B3E2E 100%);padding:28px 18px 36px;text-align:center;position:relative;overflow:hidden}
.hdr-fg{position:absolute;inset:0;pointer-events:none}
.hdr-fg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(198,138,77,.22) 0%,transparent 70%)}
.hdr-fg::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hdr-in{position:relative;z-index:1}
.logo{font-family:'Playfair Display',serif;font-size:clamp(3rem,10vw,4.8rem);font-weight:900;color:#F5EAD8;letter-spacing:.02em;line-height:1;text-shadow:0 2px 20px rgba(0,0,0,.4)}
.logo em{color:#E3B778;font-style:normal}
.tagline{font-family:'Dancing Script',cursive;font-size:clamp(1rem,3vw,1.25rem);color:#E3B778;margin-top:6px;letter-spacing:.06em}
.hdr-orn{display:flex;align-items:center;justify-content:center;gap:12px;margin:10px 0 7px}
.hdr-orn::before,.hdr-orn::after{content:'';flex:1;max-width:50px;height:1px;background:rgba(227,183,120,.3)}
.hdr-orn span{font-size:.65rem;color:#E3B778;letter-spacing:.2em;opacity:.8}
.hdr-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(227,183,120,.25);border-radius:20px;padding:5px 16px;font-size:.73rem;color:#EAD8C0;letter-spacing:.04em}
.hdr-right{position:absolute;top:12px;right:12px;display:flex;gap:7px;z-index:2}
.hdr-rbtn{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);font-size:.7rem;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .2s}
.hdr-rbtn:hover{background:rgba(255,255,255,.2);color:#fff}
.hdr-rbtn.danger{border-color:rgba(198,138,77,.4);color:rgba(198,138,77,.85)}
.hdr-rbtn.danger:hover{background:rgba(198,138,77,.18);color:#C68A4D}
.hdr-user{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(227,183,120,.3);border-radius:20px;padding:5px 13px;font-size:.71rem;color:#EAD8C0}
.sec{padding:22px 16px 6px}
.sec-t{font-family:'Playfair Display',serif;font-size:1.45rem;font-weight:700;color:var(--pr)}
.sec-s{font-size:.8rem;color:var(--mu);margin-top:3px;margin-bottom:14px;line-height:1.5}
.fscroll{display:flex;gap:11px;overflow-x:auto;padding:2px 16px 10px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.fscroll::-webkit-scrollbar{display:none}
.fcard{flex-shrink:0;width:140px;background:var(--srf);border:2px solid var(--bdl);border-radius:var(--radd);padding:14px 13px;transition:all .22s;position:relative;overflow:hidden}
.fcard::after{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.fcard:hover{border-color:var(--sc);transform:translateY(-2px)}
.fc-flame{font-size:1.4rem}
.fc-label{font-family:'Playfair Display',serif;font-size:.95rem;font-weight:700;color:var(--pr);margin-top:5px;line-height:1.2}
.fc-obs{font-size:.68rem;color:var(--mu);margin-top:4px;line-height:1.4}
.fc-vagas{margin-top:9px;display:flex;flex-direction:column;gap:5px}
.fc-vrow{display:flex;align-items:center;gap:5px}
.fc-vico{font-size:.78rem}
.fc-vbar-bg{flex:1;height:5px;background:var(--bdl);border-radius:3px;overflow:hidden}
.fc-vbar-fill{height:100%;border-radius:3px;transition:width .4s}
.fc-vnum{font-size:.64rem;color:var(--mum);white-space:nowrap;min-width:28px;text-align:right}
.fc-badge{position:absolute;top:9px;right:9px;font-size:.6rem;border-radius:8px;padding:2px 7px;font-weight:600}
.cat-hdr{display:flex;align-items:center;gap:11px;padding:22px 16px 10px}
.cat-ico{font-size:1.55rem}
.cat-nm{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--pr)}
.cat-rule{flex:1;height:1px;background:var(--bdl)}
.cat-pill{font-size:.68rem;background:var(--srf2);border:1px solid var(--bdl);color:var(--mu);border-radius:9px;padding:3px 10px;white-space:nowrap}
.pgrid{display:grid;gap:12px;padding:0 16px;grid-template-columns:1fr}
@media(min-width:480px){.pgrid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:780px){.pgrid{grid-template-columns:repeat(3,1fr)}}
.pcard{background:var(--srf);border:1px solid var(--bdl);border-radius:var(--radd);padding:16px;display:flex;flex-direction:column;gap:11px;box-shadow:0 2px 14px var(--sh);transition:transform .2s,box-shadow .2s;animation:fd .3s}
.pcard:hover{transform:translateY(-3px);box-shadow:0 6px 22px var(--shd)}
@keyframes fd{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.pc-top{display:flex;gap:10px;align-items:flex-start}
.pc-e{font-size:2.1rem;line-height:1;flex-shrink:0}
.pc-nm{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:var(--pr);line-height:1.25}
.pc-desc{font-size:.77rem;color:var(--mu);line-height:1.55;margin-top:3px}
.pc-foot{border-top:1px solid var(--bdl);padding-top:11px;display:flex;flex-direction:column;gap:9px}
.pc-price{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--ac)}
.pc-tag{font-size:.67rem;background:#FFF6EC;border:1px solid #ECC090;color:#9A5020;border-radius:7px;padding:2px 9px;display:inline-block}
.fstock{background:var(--srf2);border:1px solid var(--bdl);border-radius:11px;padding:10px 12px}
.fstock-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.fstock-title{font-size:.72rem;font-weight:600;color:var(--mu)}
.fstock-sel{font-size:.7rem;color:var(--ac);font-weight:600}
.fstock-fornadas{display:flex;flex-direction:column;gap:5px;max-height:200px;overflow-y:auto;scrollbar-width:thin}
.fstock-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;border:1.5px solid transparent;transition:all .18s;background:var(--srf)}
.fstock-row.esgotado{opacity:.5}
.fstock-dt{font-size:.75rem;font-weight:600;color:var(--pr);min-width:60px}
.fstock-bar-wrap{flex:1;height:6px;background:var(--bdl);border-radius:3px;overflow:hidden}
.fstock-bar{height:100%;border-radius:3px;transition:width .4s}
.fstock-count{font-size:.68rem;color:var(--mum);white-space:nowrap;min-width:52px;text-align:right}
.fstock-badge{font-size:.6rem;border-radius:7px;padding:2px 7px;font-weight:600;white-space:nowrap}
.qty-row{display:flex;align-items:center;gap:9px}
.qty-lbl{font-size:.76rem;color:var(--mu)}
.qty-ctrl{display:flex;align-items:center;border:1.5px solid var(--bdl);border-radius:10px;overflow:hidden}
.qty-btn{background:none;border:none;width:32px;height:32px;cursor:pointer;font-size:1.1rem;color:var(--pr);display:flex;align-items:center;justify-content:center;transition:background .15s;font-family:'Poppins',sans-serif}
.qty-btn:hover{background:var(--srf2)}
.qty-num{width:36px;text-align:center;border:none;border-left:1.5px solid var(--bdl);border-right:1.5px solid var(--bdl);outline:none;font-size:.9rem;font-weight:700;background:transparent;color:var(--tx);font-family:'Poppins',sans-serif}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
.cta{width:100%;padding:12px 14px;border:none;border-radius:12px;font-family:'Poppins',sans-serif;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.01em;line-height:1.3;text-align:center}
.cta-primary{background:linear-gradient(135deg,var(--pr),#8B5E2E);color:#fff;box-shadow:0 3px 13px rgba(107,62,46,.3)}
.cta-primary:hover{background:linear-gradient(135deg,var(--prd),#7A4E1A);transform:translateY(-1px)}
.cta-urgent{background:linear-gradient(135deg,#A06828,var(--ac));color:#fff;animation:glow 2.2s infinite}
@keyframes glow{0%,100%{box-shadow:0 3px 12px rgba(198,138,77,.35)}50%{box-shadow:0 3px 24px rgba(198,138,77,.65)}}
.cta-off{background:#EDE0D8;color:#B09080;border:1px dashed var(--bdl);cursor:pointer}
.cta-lock{background:linear-gradient(135deg,#4A3060,#6A4090);color:#fff}
.cta-lock:hover{background:linear-gradient(135deg,#3A2050,#5A3080);transform:translateY(-1px)}
.cta:active:not(.cta-off){transform:scale(.98)}
.mbg{position:fixed;inset:0;background:rgba(14,4,2,.65);z-index:300;display:flex;align-items:flex-end;justify-content:center;animation:fi .18s}
@keyframes fi{from{opacity:0}to{opacity:1}}
.mbox{background:var(--bg);border-radius:24px 24px 0 0;padding:22px 20px 40px;width:100%;max-width:520px;animation:su .25s;max-height:90vh;overflow-y:auto;position:relative}
@keyframes su{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
.mhandle{width:42px;height:4px;background:var(--bdl);border-radius:2px;margin:0 auto 18px}
.mclose{position:absolute;top:15px;right:17px;background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--mum);line-height:1;padding:4px}
.mtitle{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:700;color:var(--pr);margin-bottom:14px}
.mprod{display:flex;align-items:center;gap:11px;background:var(--srf2);border:1px solid var(--bdl);border-radius:14px;padding:12px 15px;margin-bottom:17px}
.mprod-e{font-size:1.7rem}
.mprod-nm{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--pr)}
.mprod-p{font-size:.8rem;color:var(--ac);font-weight:600;margin-top:2px}
.mfield{margin-bottom:13px}
.mlbl{display:block;font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:5px;letter-spacing:.03em}
.minput{width:100%;border:1.5px solid var(--bdl);border-radius:11px;padding:10px 13px;font-size:.87rem;font-family:'Poppins',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s;appearance:none}
.minput:focus{border-color:var(--pr)}
.minput::placeholder{color:#C0A898}
.fornada-opt{display:flex;flex-direction:column;gap:7px}
.f-opt{display:flex;align-items:center;gap:10px;padding:10px 13px;border:2px solid var(--bdl);border-radius:12px;cursor:pointer;transition:all .18s;background:var(--srf)}
.f-opt.on{border-color:var(--pr);background:#FDF0E8}
.f-opt:hover:not(.on){border-color:var(--sc)}
.f-opt-dt{font-weight:600;font-size:.86rem;color:var(--pr);min-width:70px}
.f-opt-obs{font-size:.74rem;color:var(--mu);flex:1}
.f-opt-tag{font-size:.65rem;border-radius:8px;padding:2px 8px;font-weight:600;white-space:nowrap}
.merr{font-size:.76rem;color:#C03030;margin-top:-9px;margin-bottom:10px;display:flex;align-items:center;gap:5px;background:#FFF0F0;border:1px solid #F0C0C0;padding:7px 11px;border-radius:9px}
.msub{width:100%;padding:13px;background:linear-gradient(135deg,var(--pr),#8B5E2E);color:#fff;border:none;border-radius:13px;font-family:'Poppins',sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:5px;box-shadow:0 4px 16px rgba(107,62,46,.3);transition:all .2s}
.msub:hover:not(:disabled){background:linear-gradient(135deg,var(--prd),#7A4E1A);transform:translateY(-1px)}
.msub:disabled{opacity:.55;cursor:not-allowed}
.succ{text-align:center;padding:10px 0;animation:fi .3s}
.succ-ico{font-size:2.6rem}
.succ-t{font-family:'Playfair Display',serif;font-size:1.2rem;color:#3A6A3A;font-weight:700;margin-top:10px}
.succ-s{font-size:.8rem;color:#5A8A5A;margin-top:6px;line-height:1.6}
.adm-ov{position:fixed;inset:0;background:var(--bg);z-index:200;overflow-y:auto}
.adm-hdr{background:linear-gradient(135deg,#2A1208,#5A3020);padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.adm-back{background:rgba(255,255,255,.13);border:none;color:#fff;padding:7px 15px;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:.81rem}
.adm-htitle{font-family:'Playfair Display',serif;font-size:1.25rem;color:#F5E8D0}
.adm-body{padding:18px 16px 40px;max-width:900px;margin:0 auto}
.atabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.atab{padding:8px 18px;border-radius:10px;border:1.5px solid var(--bdl);background:var(--srf);font-family:'Poppins',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;color:var(--mu);transition:all .2s}
.atab.on{background:var(--pr);color:#fff;border-color:var(--pr)}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px;margin-bottom:22px}
@media(min-width:480px){.kpi-grid{grid-template-columns:repeat(4,1fr)}}
.kpi{background:var(--srf);border:1px solid var(--bdl);border-radius:var(--rad);padding:14px 13px;text-align:center}
.kpi-val{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:var(--pr);line-height:1}
.kpi-lbl{font-size:.69rem;color:var(--mu);margin-top:5px;line-height:1.4}
.afcard{background:var(--srf);border:1px solid var(--bdl);border-radius:var(--radd);padding:18px;margin-bottom:14px}
.afcard-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:10px}
.afcard-title{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--pr)}
.afcard-obs{font-size:.76rem;color:var(--mu);margin-top:3px}
.afcard-toggle{background:none;border:1.5px solid var(--bdl);border-radius:9px;padding:5px 12px;font-family:'Poppins',sans-serif;font-size:.74rem;cursor:pointer;color:var(--mu);transition:all .2s;white-space:nowrap}
.afcard-toggle.on{background:#F0FBF0;border-color:#80C880;color:#3A6A3A}
.afcard-toggle.off{background:#FFF0F0;border-color:#F0A0A0;color:#8A3030}
.cap-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.capbox{background:var(--srf2);border:1px solid var(--bdl);border-radius:12px;padding:12px}
.capbox-lbl{font-size:.7rem;font-weight:600;color:var(--mu);margin-bottom:7px}
.capbox-ctrl{display:flex;align-items:center;gap:8px;justify-content:space-between}
.capbox-num{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:var(--pr);min-width:36px;text-align:center}
.capbox-sub{font-size:.65rem;color:var(--mum);margin-top:4px;text-align:center}
.cadj{background:var(--bg);border:1.5px solid var(--bdl);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--pr);display:flex;align-items:center;justify-content:center;font-size:1rem;transition:all .15s;font-family:'Poppins',sans-serif}
.cadj:hover{background:var(--pr);color:#fff;border-color:var(--pr)}
.occ-row{display:flex;align-items:center;gap:9px}
.occ-lbl{font-size:.72rem;color:var(--mu);min-width:72px}
.occ-bar-bg{flex:1;height:7px;background:var(--bdl);border-radius:4px;overflow:hidden}
.occ-bar-fill{height:100%;border-radius:4px;transition:width .4s}
.occ-frac{font-size:.73rem;font-weight:600;color:var(--mu);min-width:50px;text-align:right}
.add-form{background:var(--srf2);border:2px dashed var(--bdl);border-radius:var(--radd);padding:18px;margin-top:10px}
.add-form-t{font-family:'Playfair Display',serif;font-size:1rem;color:var(--pr);margin-bottom:14px}
.add-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.add-lbl{font-size:.72rem;font-weight:600;color:var(--mu);margin-bottom:5px;display:block}
.add-inp{width:100%;border:1.5px solid var(--bdl);border-radius:9px;padding:8px 11px;font-size:.85rem;font-family:'Poppins',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s}
.add-inp:focus{border-color:var(--pr)}
.add-btn{width:100%;padding:11px;background:linear-gradient(135deg,var(--pr),#8B5E2E);color:#fff;border:none;border-radius:11px;font-family:'Poppins',sans-serif;font-size:.87rem;font-weight:600;cursor:pointer;transition:all .2s}
.add-btn:hover{background:linear-gradient(135deg,var(--prd),#7A4E1A)}
.porder{display:flex;align-items:flex-start;gap:11px;background:var(--srf);border:1px solid var(--bdl);border-radius:12px;padding:12px;margin-bottom:9px}
.porder-e{font-size:1.4rem;flex-shrink:0;padding-top:2px}
.porder-info{flex:1;min-width:0}
.porder-nm{font-size:.87rem;font-weight:600;color:var(--tx)}
.porder-meta{font-size:.72rem;color:var(--mu);margin-top:3px;line-height:1.5}
.badge{font-size:.64rem;border-radius:9px;padding:3px 9px;font-weight:600;white-space:nowrap;flex-shrink:0}
.bp{background:#FFF3E0;color:#B06010;border:1px solid #FFB84D}
.bc{background:#E8F5E8;color:#2E6A2E;border:1px solid #72C072}
.rchart{height:220px;margin-top:4px}
footer{background:linear-gradient(135deg,#2A1208,#4E2A1A);padding:26px 16px;text-align:center;margin-top:40px}
.ft-logo{font-family:'Playfair Display',serif;font-size:1.55rem;font-weight:700;color:#C68A4D}
.ft-txt{font-size:.73rem;color:rgba(255,255,255,.38);margin-top:9px;line-height:1.8}
.adm-refresh{background:var(--srf2);border:1.5px solid var(--bdl);color:var(--pr);border-radius:9px;padding:6px 14px;font-family:'Poppins',sans-serif;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
.adm-refresh:hover{background:var(--pr);color:#fff;border-color:var(--pr)}
.spin{display:inline-block;animation:spin .8s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

/* ── AUTH SCREENS ── */
.auth-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg)}
.auth-card{width:100%;max-width:400px;background:var(--srf);border:1px solid var(--bdl);border-radius:var(--radd);padding:32px 28px;box-shadow:0 8px 32px var(--sh)}
.auth-logo{font-family:'Playfair Display',serif;font-size:2.2rem;font-weight:900;color:var(--pr);text-align:center;margin-bottom:4px}
.auth-logo em{color:var(--ac);font-style:normal}
.auth-sub{font-family:'Dancing Script',cursive;font-size:1.05rem;color:var(--mu);text-align:center;margin-bottom:24px}
.auth-title{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:var(--pr);margin-bottom:18px;text-align:center}
.auth-field{margin-bottom:13px}
.auth-lbl{display:block;font-size:.74rem;font-weight:600;color:var(--mu);margin-bottom:5px;letter-spacing:.03em}
.auth-inp{width:100%;border:1.5px solid var(--bdl);border-radius:11px;padding:10px 13px;font-size:.87rem;font-family:'Poppins',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s}
.auth-inp:focus{border-color:var(--pr)}
.auth-inp::placeholder{color:#C0A898}
.auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--pr),#8B5E2E);color:#fff;border:none;border-radius:12px;font-family:'Poppins',sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;margin-top:5px;box-shadow:0 4px 16px rgba(107,62,46,.3);transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.auth-btn:hover:not(:disabled){background:linear-gradient(135deg,var(--prd),#7A4E1A);transform:translateY(-1px)}
.auth-btn:disabled{opacity:.55;cursor:not-allowed}
.auth-switch{text-align:center;margin-top:18px;font-size:.8rem;color:var(--mu)}
.auth-link{color:var(--pr);font-weight:600;cursor:pointer;background:none;border:none;font-family:'Poppins',sans-serif;font-size:inherit;text-decoration:underline}
.auth-err{background:#FFF0F0;border:1px solid #F0C0C0;color:#C03030;font-size:.78rem;padding:8px 12px;border-radius:9px;margin-bottom:12px}
.auth-ok{background:#F0FBF0;border:1px solid #90C890;color:#3A7A3A;font-size:.78rem;padding:8px 12px;border-radius:9px;margin-bottom:12px}
.auth-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:var(--mum);font-size:.75rem}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--bdl)}

/* Bannner de login requerido dentro do modal de checkout */
.auth-gate{background:var(--srf2);border:2px solid var(--bdl);border-radius:16px;padding:20px;text-align:center}
.auth-gate-ico{font-size:2rem;margin-bottom:8px}
.auth-gate-t{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:var(--pr);margin-bottom:6px}
.auth-gate-s{font-size:.8rem;color:var(--mu);line-height:1.6;margin-bottom:14px}

/* ── RELATÓRIOS ── */
.rel-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}
.rel-title{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--pr)}
.rel-period{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.rel-pbtn{padding:6px 13px;border-radius:9px;border:1.5px solid var(--bdl);background:var(--srf);font-family:'Poppins',sans-serif;font-size:.74rem;font-weight:600;cursor:pointer;color:var(--mu);transition:all .2s;white-space:nowrap}
.rel-pbtn.on{background:var(--pr);color:#fff;border-color:var(--pr)}
.rel-pbtn:hover:not(.on){border-color:var(--sc);color:var(--pr)}
.rel-date-range{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.rel-date-inp{border:1.5px solid var(--bdl);border-radius:9px;padding:5px 10px;font-size:.75rem;font-family:'Poppins',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s}
.rel-date-inp:focus{border-color:var(--pr)}
.rel-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:20px}
@media(max-width:480px){.rel-kpi-grid{grid-template-columns:1fr}}
.rel-kpi{background:var(--srf);border:1px solid var(--bdl);border-radius:var(--rad);padding:14px 16px;position:relative;overflow:hidden}
.rel-kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--pr),var(--sc))}
.rel-kpi-val{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:var(--pr);line-height:1;margin-top:4px}
.rel-kpi-lbl{font-size:.69rem;color:var(--mu);margin-top:5px}
.rel-kpi-sub{font-size:.68rem;color:var(--mum);margin-top:3px}
.rel-section{background:var(--srf);border:1px solid var(--bdl);border-radius:var(--radd);padding:16px;margin-bottom:16px}
.rel-section-title{font-family:'Playfair Display',serif;font-size:.95rem;font-weight:700;color:var(--pr);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.rel-section-title span{font-size:.7rem;color:var(--mum);font-family:'Poppins',sans-serif;font-weight:400}
.rel-chart{height:200px}
.rel-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.rel-bar-label{font-size:.75rem;color:var(--tx);min-width:140px;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rel-bar-wrap{flex:1;height:10px;background:var(--bdl);border-radius:5px;overflow:hidden}
.rel-bar-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,var(--pr),var(--sc));transition:width .5s}
.rel-bar-val{font-size:.73rem;font-weight:600;color:var(--pr);min-width:30px;text-align:right}
.rel-bar-badge{font-size:.62rem;background:#FFF8F0;border:1px solid var(--bdl);color:var(--mu);border-radius:7px;padding:1px 6px;white-space:nowrap}
.rel-table{width:100%;border-collapse:collapse;font-size:.78rem}
.rel-table th{text-align:left;padding:7px 10px;color:var(--mu);font-weight:600;font-size:.7rem;border-bottom:1.5px solid var(--bdl);white-space:nowrap}
.rel-table td{padding:8px 10px;border-bottom:1px solid var(--bdl);color:var(--tx);vertical-align:middle}
.rel-table tr:last-child td{border-bottom:none}
.rel-table tr:hover td{background:var(--srf2)}
.rel-empty{text-align:center;padding:32px;color:var(--mu);font-size:.82rem}
.rel-export-btn{background:var(--srf2);border:1.5px solid var(--bdl);color:var(--pr);border-radius:9px;padding:6px 14px;font-family:'Poppins',sans-serif;font-size:.76rem;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
.rel-export-btn:hover{background:var(--green);color:#fff;border-color:var(--green)}
.rel-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:40px;color:var(--mu);font-size:.82rem}
.top-badge{font-size:.62rem;background:linear-gradient(135deg,#C68A4D,#E3B778);color:#fff;border-radius:10px;padding:2px 7px;font-weight:700;margin-left:5px}
`;

/* ═══════════════════════════════════════════════════════════════════
   SLOT DOTS
═══════════════════════════════════════════════════════════════════ */
function SlotDots({ used, cap, urgentAt = 2 }) {
  const free = cap - used;
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      {Array.from({ length: cap }).map((_, i) => {
        const filled = i < used;
        const urgent = !filled && free <= urgentAt;
        return (
          <div key={i} style={{
            width:9, height:9, borderRadius:"50%", transition:"all .3s",
            background: filled ? "var(--pr)" : urgent ? "rgba(212,98,58,.3)" : "transparent",
            border: `2px solid ${filled ? "var(--pr)" : urgent ? "var(--ac)" : "var(--bdl)"}`,
          }} />
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH SCREEN — Login e Cadastro
   Renderizado quando não há sessão ativa E o usuário tentou
   fazer checkout. Pode ser acessado diretamente pelo header.
═══════════════════════════════════════════════════════════════════ */
function AuthScreen({ onClose }) {
  const { signIn, signUp } = useAuth();
  const [mode,       setMode]       = useState("login"); // "login" | "register"
  const [loading,    setLoading]    = useState(false);
  const [errMsg,     setErrMsg]     = useState("");
  const [okMsg,      setOkMsg]      = useState("");
  const [fields,     setFields]     = useState({
    email:"", password:"", nome:"", telefone:"", endereco:""
  });

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setErrMsg(""); setOkMsg("");
    if (!fields.email || !fields.password) { setErrMsg("E-mail e senha são obrigatórios."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn({ email: fields.email, password: fields.password });
        if (error) throw error;
        onClose?.();
      } else {
        if (!fields.nome.trim())     { setErrMsg("Informe seu nome.");          return; }
        if (!fields.telefone.trim()) { setErrMsg("Informe seu WhatsApp.");       return; }
        if (!fields.endereco.trim()) { setErrMsg("Informe seu endereço."); return; }
        const { error } = await signUp({
          email: fields.email, password: fields.password,
          nome: fields.nome, telefone: fields.telefone, endereco: fields.endereco,
        });
        if (error) throw error;
        setOkMsg("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        setMode("login");
      }
    } catch (e) {
      const msgs = {
        "Invalid login credentials":          "E-mail ou senha incorretos.",
        "User already registered":            "Este e-mail já está cadastrado.",
        "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
        "Email not confirmed":                "Confirme seu e-mail antes de entrar.",
      };
      setErrMsg(msgs[e.message] ?? e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Afeto em <em>Forma</em></div>
        <div className="auth-sub">Cuidado em cada pedaço.</div>

        <div className="auth-title">
          {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
        </div>

        {errMsg && <div className="auth-err">⚠️ {errMsg}</div>}
        {okMsg  && <div className="auth-ok">✅ {okMsg}</div>}

        {mode === "register" && (
          <>
            <div className="auth-field">
              <label className="auth-lbl">Seu nome *</label>
              <input className="auth-inp" placeholder="Maria Silva"
                value={fields.nome} onChange={e => set("nome", e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-lbl">WhatsApp (com DDD) *</label>
              <input className="auth-inp" placeholder="(12) 99999-9999"
                value={fields.telefone} onChange={e => set("telefone", e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-lbl">Endereço completo *</label>
              <input className="auth-inp" placeholder="Rua, número, bairro"
                value={fields.endereco} onChange={e => set("endereco", e.target.value)} />
            </div>
            <div className="auth-divider">dados da conta</div>
          </>
        )}

        <div className="auth-field">
          <label className="auth-lbl">E-mail *</label>
          <input className="auth-inp" type="email" placeholder="seu@email.com"
            value={fields.email} onChange={e => set("email", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div className="auth-field">
          <label className="auth-lbl">Senha *</label>
          <input className="auth-inp" type="password" placeholder="Mínimo 6 caracteres"
            value={fields.password} onChange={e => set("password", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><span className="spin">⏳</span> Aguarde...</>
            : mode === "login" ? "🔑 Entrar" : "✅ Criar Conta"}
        </button>

        <div className="auth-switch">
          {mode === "login"
            ? <>Novo por aqui? <button className="auth-link" onClick={() => { setMode("register"); setErrMsg(""); }}>Criar conta grátis</button></>
            : <>Já tem conta? <button className="auth-link" onClick={() => { setMode("login"); setErrMsg(""); }}>Entrar</button></>}
        </div>

        {onClose && (
          <div className="auth-switch" style={{ marginTop:8 }}>
            <button className="auth-link" onClick={onClose}>← Voltar ao cardápio</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — DosAnjos v4
═══════════════════════════════════════════════════════════════════ */
function DosAnjosApp() {
  const { session, profile, isAdmin, isLoggedIn, signOut } = useAuth();

  /* ─── estado de navegação ─── */
  const [showAuth,  setShowAuth]  = useState(false);  // tela de login/cadastro
  const [adminOpen, setAdminOpen] = useState(false);

  /* ─── estado público ─── */
  const [fornadas,   setFornadas]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [qtys,       setQtys]       = useState({});
  const [modal,      setModal]      = useState(null);
  const [selFornada, setSelFornada] = useState(null);
  const [err,        setErr]        = useState("");
  const [succ,       setSucc]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ─── estado admin ─── */
  const [adminTab,    setAdminTab]    = useState("fornadas");
  const [pedidosReais,setPedidosReais]= useState([]);
  const [loadPedidos, setLoadPedidos] = useState(false);
  const [newFornada,  setNewFornada]  = useState({ data:"", obs:"", cap_pao:5, cap_biscoito:6 });
  
  /* ─── estado relatórios (Sprint 2) ─── */
  const [period,       setPeriod]       = useState(7);
  const [customRange,  setCustomRange]  = useState({ start:"", end:"" });
  const [relKPIs,      setRelKPIs]      = useState(null);
  const [relDaily,     setRelDaily]     = useState([]);
  const [relTopProds,  setRelTopProds]  = useState([]);
  const [relFornadas,  setRelFornadas]  = useState([]);
  const [relLoading,   setRelLoading]   = useState(false);
  const [debounceRef,  setDebounceRef]  = useState(null);

  /* ── Autopreenchimento do form a partir do profile logado ──
     Form começa vazio; profile preenche quando modal abre.   */
  const formFromProfile = useCallback(() => ({
    nome:     profile?.nome     ?? "",
    telefone: profile?.telefone ?? "",
    endereco: profile?.endereco ?? "",
  }), [profile]);

  /* ─── fetchFornadas ─── */
  const fetchFornadas = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("vagas_fornada")
      .select("*")
      .gte("data", hoje)
      .eq("ativa", true)
      .order("data", { ascending: true });
    if (!error && data) setFornadas(data.map(formatarFornada));
    else if (error) console.error("[DosAnjos] fetchFornadas:", error.message);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFornadas(); }, [fetchFornadas]);

  /* ─── fetchPedidos (admin) ─── */
  const fetchPedidos = useCallback(async () => {
    setLoadPedidos(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id, status, data_agendada, valor_total, created_at, user_id,
        fornadas ( data ),
        itens_pedido ( produto, nome_produto, quantidade, preco_unitario )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setPedidosReais(data);
    else if (error) console.error("[DosAnjos] fetchPedidos:", error.message);
    setLoadPedidos(false);
  }, []);

  useEffect(() => {
    if (isAdmin && adminTab === "pedidos") fetchPedidos();
  }, [isAdmin, adminTab, fetchPedidos]);

  /* ═══════════════════════════════════════════════════════════════
     RELATÓRIOS — Sprint 2
     Todas as queries filtram status = 'confirmado' e ignoram
     valor_total NULL. Período: 7, 30, ou objeto { start, end }.
  ═══════════════════════════════════════════════════════════════ */
  function periodoParaDate(p) {
    const end = new Date();
    const start = new Date();
    if (typeof p === "number") {
      start.setDate(end.getDate() - p);
    } else {
      return { start: p.start, end: p.end };
    }
    return {
      start: start.toISOString().split("T")[0],
      end:   end.toISOString().split("T")[0],
    };
  }

  const fetchRelatorios = useCallback(async (p) => {
    if (!isAdmin) return;
    setRelLoading(true);
    const { start, end } = periodoParaDate(p);
    const endInclusive = end + "T23:59:59";

    try {
      // ── KPIs ──────────────────────────────────────────────────
      const { data: kpiData } = await supabase
        .from("pedidos")
        .select("valor_total")
        .eq("status", "confirmado")
        .gte("created_at", start)
        .lte("created_at", endInclusive)
        .not("valor_total", "is", null);

      const totalPedidos = kpiData?.length ?? 0;
      const faturamento  = kpiData?.reduce((a, r) => a + Number(r.valor_total || 0), 0) ?? 0;
      const ticketMedio  = totalPedidos > 0 ? faturamento / totalPedidos : 0;
      setRelKPIs({ faturamento, ticketMedio, totalPedidos });

      // ── Evolução diária ────────────────────────────────────────
      // Supabase não suporta GROUP BY nativo via JS client;
      // agrupamos client-side após trazer created_at + valor_total.
      const { data: dailyRaw } = await supabase
        .from("pedidos")
        .select("created_at, valor_total")
        .eq("status", "confirmado")
        .gte("created_at", start)
        .lte("created_at", endInclusive)
        .not("valor_total", "is", null);

      const dailyMap = {};
      (dailyRaw ?? []).forEach(r => {
        const dia = r.created_at.split("T")[0];
        dailyMap[dia] = (dailyMap[dia] ?? 0) + Number(r.valor_total || 0);
      });
      // Preenche todos os dias do período (sem lacunas no gráfico)
      const dailyArr = [];
      const cur = new Date(start + "T12:00:00");
      const endD = new Date(end + "T12:00:00");
      while (cur <= endD) {
        const k = cur.toISOString().split("T")[0];
        const [, mm, dd] = k.split("-");
        dailyArr.push({ data: `${dd}/${mm}`, valor: dailyMap[k] ?? 0 });
        cur.setDate(cur.getDate() + 1);
      }
      setRelDaily(dailyArr);

      // ── Top 5 produtos ─────────────────────────────────────────
      const { data: topRaw } = await supabase
        .from("itens_pedido")
        .select("nome_produto, quantidade, pedidos!inner(status, created_at)")
        .eq("pedidos.status", "confirmado")
        .gte("pedidos.created_at", start)
        .lte("pedidos.created_at", endInclusive);

      const topMap = {};
      (topRaw ?? []).forEach(r => {
        topMap[r.nome_produto] = (topMap[r.nome_produto] ?? 0) + Number(r.quantidade || 0);
      });
      const topArr = Object.entries(topMap)
        .map(([nome, qty]) => ({ nome, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
      setRelTopProds(topArr);

      // ── Vendas por fornada ─────────────────────────────────────
      const { data: fornRaw } = await supabase
        .from("pedidos")
        .select("valor_total, fornadas(data)")
        .eq("status", "confirmado")
        .gte("created_at", start)
        .lte("created_at", endInclusive)
        .not("valor_total", "is", null)
        .not("fornada_id", "is", null);

      const fornMap = {};
      (fornRaw ?? []).forEach(r => {
        const dt = r.fornadas?.data ?? "—";
        if (!fornMap[dt]) fornMap[dt] = { pedidos: 0, faturamento: 0 };
        fornMap[dt].pedidos    += 1;
        fornMap[dt].faturamento += Number(r.valor_total || 0);
      });
      const fornArr = Object.entries(fornMap)
        .map(([data, v]) => ({ data, ...v }))
        .sort((a, b) => b.faturamento - a.faturamento);
      setRelFornadas(fornArr);

    } catch (e) {
      console.error("[AeF] fetchRelatorios:", e);
    }
    setRelLoading(false);
  }, [isAdmin]);

  // Dispara fetch quando aba relatórios é aberta ou período muda
  useEffect(() => {
    if (isAdmin && adminTab === "relatorios") fetchRelatorios(period);
  }, [isAdmin, adminTab, period, fetchRelatorios]);

  /* ─── helpers ─── */
  const getQty = id => qtys[id] ?? 1;
  const setQty = (id, v) => setQtys(q => ({ ...q, [id]: Math.max(1, v) }));

  const fornadasAtivas          = fornadas.filter(f => f.ativa);
  const fornadasComVagaPao      = fornadasAtivas.filter(f => vagasPao(f)      > 0);
  const fornadasComVagaBiscoito = fornadasAtivas.filter(f => vagasBiscoito(f) > 0);

  function ctaCfg(prod) {
    if (prod.tipo === "bolo") return { txt:"🎂 Encomendar Meu Bolo", cls:"cta-primary", can:true };
    const fornsFree = prod.tipo === "pao" ? fornadasComVagaPao : fornadasComVagaBiscoito;
    if (fornsFree.length === 0)
      return { txt:"⛔ Lista de Espera (Todas Fornadas Lotadas)", cls:"cta-off", can:false, waitlist:true };
    const totalFree = fornsFree.reduce((a, f) => a + (prod.tipo === "pao" ? vagasPao(f) : vagasBiscoito(f)), 0);
    if (totalFree === 1) return { txt:"⚡ Última Vaga em Todas as Fornadas!", cls:"cta-urgent", can:true };
    return prod.tipo === "pao"
      ? { txt:"🔥 Garantir Minha Vaga na Fornada", cls:"cta-primary", can:true }
      : { txt:"🍪 Reservar Pacote — Próxima Fornada",  cls:"cta-primary", can:true };
  }

  /* ─── abrir modal ─── */
  function openModal(prod) {
    if (!isLoggedIn) { setShowAuth(true); return; } // redireciona para login
    const forns = prod.tipo === "bolo" ? fornadasAtivas
                : prod.tipo === "pao"  ? fornadasComVagaPao
                : fornadasComVagaBiscoito;
    setModal({ prod, forns });
    setSelFornada(forns[0] ?? null);
    setErr(""); setSucc(false);
  }
  const closeModal = () => { setModal(null); setSucc(false); };

  function handleWaitlist(prod) {
    const nome = profile?.nome || "Cliente";
    const msg  = `Olá, Afeto em Forma! 👋 Vi que todas as fornadas de *${prod.n}* estão lotadas. Gostaria de entrar na *Lista de Espera*. Meu nome é *${nome}*.`;
    window.open(`https://api.whatsapp.com/send?phone=${WA_NUM}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  /* ═══════════════════════════════════════════════════════════════
     HANDLE CHECKOUT v4
     Usa session.user.id em vez de upsert em clientes.
     Garante que user_id = auth.uid() (validado pelo RLS).
  ═══════════════════════════════════════════════════════════════ */
  async function handleCheckout() {
    if (!isLoggedIn || !session?.user?.id) {
      setShowAuth(true); return;
    }

    const { prod } = modal;
    const qty      = getQty(prod.id);

    /* Validação de vagas */
    if (prod.tipo !== "bolo" && selFornada && typeof selFornada === "object") {
      const vagasDisponiveis = prod.tipo === "pao" ? vagasPao(selFornada) : vagasBiscoito(selFornada);
      if (qty > vagasDisponiveis) {
        setErr(
          vagasDisponiveis === 0
            ? `Esta fornada (${selFornada.label}) não tem mais vagas. Escolha outra data.`
            : `Há apenas ${vagasDisponiveis} vaga(s) para ${selFornada.label}. Reduza a quantidade ou escolha outra data.`
        );
        return;
      }
    }
    if (modal.prod.tipo !== "bolo" && !selFornada) {
      setErr("Selecione uma data de fornada."); return;
    }

    setErr(""); setSubmitting(true);

    try {
      const userId = session.user.id;

      /* ── a. Atualizar profile com dados mais recentes ──
         Se o perfil já tem nome/telefone/endereço, não sobrescreve.
         Útil para primeiro pedido após cadastro.              */
      if (profile && (!profile.nome || !profile.telefone || !profile.endereco)) {
        await supabase.from("profiles").update({
          nome:     profile.nome     || "",
          telefone: profile.telefone || "",
          endereco: profile.endereco || "",
        }).eq("id", userId);
      }

      /* ── b. Inserir pedido com user_id do auth ── */
      const precoUnitario = extrairPreco(prod.p);
      const { data: pedido, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          user_id:       userId,                                            // auth.uid() — validado pelo RLS
          fornada_id:    prod.tipo !== "bolo" ? selFornada.id   : null,
          data_agendada: prod.tipo !== "bolo" ? selFornada.data : selFornada,
          status:        "pendente",
          valor_total:   qty * precoUnitario || null,
        })
        .select("id")
        .single();
      if (pedidoErr) throw pedidoErr;

      /* ── c. Inserir item ── */
      const produtoCategoria =
        prod.tipo === "pao" ? "Pão" : prod.tipo === "biscoito" ? "Biscoito" : "Bolo";
      const { error: itemErr } = await supabase
        .from("itens_pedido")
        .insert({
          pedido_id:      pedido.id,
          produto:        produtoCategoria,
          nome_produto:   prod.n,
          quantidade:     qty,
          preco_unitario: precoUnitario || null,
        });
      if (itemErr) throw itemErr;

      /* ── d. WhatsApp com dados do perfil ── */
      const dtLabel = prod.tipo === "bolo"
        ? (typeof selFornada === "string" ? selFornada : "a confirmar")
        : selFornada.label;

      const nome     = profile?.nome     || session.user.email;
      const telefone = profile?.telefone || "";
      const endereco = profile?.endereco || "";

      const msg = prod.tipo === "bolo"
        ? `Olá, Afeto em Forma! 🎂 Encomendar *${qty}x ${prod.n}* para *${dtLabel}*.\n\nNome: *${nome}*\nWhatsApp: *${telefone}*\nEndereço: *${endereco}*`
        : prod.tipo === "pao"
        ? `Olá, Afeto em Forma! 🍞 Garantir vaga para *${qty}x ${prod.n}* — fornada de *${dtLabel}*.\n\nNome: *${nome}*\nWhatsApp: *${telefone}*\nEndereço: *${endereco}*`
        : `Olá, Afeto em Forma! 🍪 Reservar *${qty} pacote(s) de ${prod.n}* — fornada de *${dtLabel}*.\n\nNome: *${nome}*\nWhatsApp: *${telefone}*\nEndereço: *${endereco}*`;

      window.open(`https://api.whatsapp.com/send?phone=${WA_NUM}&text=${encodeURIComponent(msg)}`, "_blank");

      await fetchFornadas();
      setSucc(true);

    } catch (e) {
      console.error("[DosAnjos] checkout:", e);
      setErr("Erro ao registrar pedido. Tente novamente ou fale diretamente pelo WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── admin: updateFornada ─── */
  async function updateFornada(id, patch) {
    setFornadas(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
    const campos = {};
    if ("ativa"               in patch) campos.ativa               = patch.ativa;
    if ("capacidade_pao"      in patch) campos.capacidade_pao      = patch.capacidade_pao;
    if ("capacidade_biscoito" in patch) campos.capacidade_biscoito = patch.capacidade_biscoito;
    if (Object.keys(campos).length > 0) {
      const { error } = await supabase.from("fornadas").update(campos).eq("id", id);
      if (error) { console.error("[DosAnjos] updateFornada:", error.message); fetchFornadas(); }
    }
  }

  /* ─── admin: addFornada ─── */
  async function addFornada() {
    if (!newFornada.data) return;
    const { error } = await supabase.from("fornadas").insert({
      data:                newFornada.data,
      capacidade_pao:      newFornada.cap_pao,
      capacidade_biscoito: newFornada.cap_biscoito,
      observacao:          newFornada.obs || "Forno a lenha tradicional",
      ativa:               true,
    });
    if (!error) {
      setNewFornada({ data:"", obs:"", cap_pao:5, cap_biscoito:6 });
      await fetchFornadas();
    } else {
      alert(error.code === "23505" ? "Já existe uma fornada nesta data." : "Erro ao criar fornada.");
    }
  }

  /* ─── exportação CSV ─── */
  function exportarCSV() {
    const { start, end } = periodoParaDate(period);
    const linhas = [
      ["Tipo","Data","Produto / Métrica","Quantidade","Valor (R$)"],
      // KPIs summary
      ["KPI", start+" a "+end, "Faturamento Total",   "", relKPIs?.faturamento?.toFixed(2) ?? ""],
      ["KPI", start+" a "+end, "Ticket Médio",        "", relKPIs?.ticketMedio?.toFixed(2)  ?? ""],
      ["KPI", start+" a "+end, "Total de Pedidos",    relKPIs?.totalPedidos ?? "", ""],
      // Evolução diária
      ...relDaily.map(d  => ["Vendas Diárias", d.data, "", "", d.valor.toFixed(2)]),
      // Top produtos
      ...relTopProds.map((p, i) => ["Top Produto", `#${i+1}`, p.nome, p.qty, ""]),
      // Vendas por fornada
      ...relFornadas.map(f => ["Por Fornada", f.data, "", f.pedidos, f.faturamento.toFixed(2)]),
    ];
    const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `relatorio-afeto-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartData = fornadasAtivas.map(f => ({
    name: f.label, pao_ocupado:f.pao_ocupado, pao_livre:vagasPao(f),
    bisc_ocupado:f.biscoito_ocupado, bisc_livre:vagasBiscoito(f),
  }));

  const CATS = ["Bolos","Pães","Biscoitos"];
  const catMeta = {
    Bolos:     { ico:"🎂", sub:"Encomenda mínima com 24h" },
    Pães:      { ico:"🍞", sub:`${fornadasComVagaPao.length} fornada(s) com vaga` },
    Biscoitos: { ico:"⭕", sub:`${fornadasComVagaBiscoito.length} fornada(s) com vaga` },
  };

  /* ── Tela de auth ── */
  if (showAuth) return <AuthScreen onClose={() => setShowAuth(false)} />;

  /* ══════════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ══════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight:"100vh" }}>

        {/* HEADER */}
        <header className="hdr">
          <div className="hdr-fg" />
          <div className="hdr-in">
            <div className="logo">Afeto em <em>Forma</em></div>
            <div className="tagline">Cuidado em cada pedaço.</div>
            <div className="hdr-orn"><span>✦ SÃO SEBASTIÃO · SP ✦</span></div>
            <div className="hdr-pill">📍 São Sebastião, SP</div>
          </div>

          {/* Controles de auth no header */}
          <div className="hdr-right">
            {isLoggedIn ? (
              <>
                {/* Ícone do usuário logado */}
                <div className="hdr-user">
                  👤 {profile?.nome?.split(" ")[0] || session.user.email.split("@")[0]}
                </div>
                {/* Botão admin — visível apenas para admins */}
                {isAdmin && (
                  <button className="hdr-rbtn" onClick={() => setAdminOpen(true)}>⚙ Artesã</button>
                )}
                <button className="hdr-rbtn danger" onClick={signOut}>Sair</button>
              </>
            ) : (
              <button className="hdr-rbtn" onClick={() => setShowAuth(true)}>🔑 Entrar</button>
            )}
          </div>
        </header>

        {/* FORNADAS */}
        <div className="sec">
          <div className="sec-t">🔥 Próximas Fornadas</div>
          <div className="sec-s">Cada data tem capacidade própria — a vaga do dia 18 não interfere no dia 22!</div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"28px 0", color:"var(--mu)", fontSize:".85rem" }}>
            <span className="spin">🔥</span> Carregando fornadas...
          </div>
        ) : (
          <>
            <div className="fscroll">
              {fornadasAtivas.map(f => {
                const pPao  = pctPao(f);
                const pBisc = pctBiscoito(f);
                return (
                  <div key={f.id} className="fcard">
                    <div className="fc-flame">🔥</div>
                    <div className="fc-label">{f.label}</div>
                    <div className="fc-obs">{f.observacao}</div>
                    <div className="fc-vagas">
                      <div className="fc-vrow">
                        <span className="fc-vico">🍞</span>
                        <div className="fc-vbar-bg">
                          <div className="fc-vbar-fill" style={{ width:`${pPao}%`, background:pPao>=100?"#C03030":pPao>=75?"#D07030":"var(--pr)" }} />
                        </div>
                        <span className="fc-vnum">{vagasPao(f)}/{f.capacidade_pao}</span>
                      </div>
                      <div className="fc-vrow">
                        <span className="fc-vico">⭕</span>
                        <div className="fc-vbar-bg">
                          <div className="fc-vbar-fill" style={{ width:`${pBisc}%`, background:pBisc>=100?"#C03030":pBisc>=75?"#D07030":"var(--sc)" }} />
                        </div>
                        <span className="fc-vnum">{vagasBiscoito(f)}/{f.capacidade_biscoito}</span>
                      </div>
                    </div>
                    {pPao>=100 && pBisc>=100 && (
                      <div className="fc-badge" style={{ background:"#FFF0F0", color:"#C03030" }}>Lotada</div>
                    )}
                  </div>
                );
              })}
              {fornadasAtivas.length === 0 && (
                <div style={{ padding:"16px", color:"var(--mu)", fontSize:".82rem" }}>
                  Nenhuma fornada agendada. Volte em breve!
                </div>
              )}
            </div>

            {/* CATÁLOGO */}
            {CATS.map(cat => {
              const prods = CATALOG.filter(p => p.cat === cat);
              const meta  = catMeta[cat];
              return (
                <div key={cat}>
                  <div className="cat-hdr">
                    <span className="cat-ico">{meta.ico}</span>
                    <span className="cat-nm">{cat}</span>
                    <div className="cat-rule" />
                    <span className="cat-pill">{meta.sub}</span>
                  </div>
                  <div className="pgrid">
                    {prods.map(prod => {
                      const { txt, cls, can, waitlist } = ctaCfg(prod);
                      const fornsFree = prod.tipo==="pao" ? fornadasComVagaPao : prod.tipo==="biscoito" ? fornadasComVagaBiscoito : [];
                      // Se não logado, mostra botão de "entrar para encomendar"
                      const ctaTxt  = !isLoggedIn && !waitlist ? "🔑 Entre para Encomendar" : txt;
                      const ctaCls  = !isLoggedIn && !waitlist ? "cta-lock" : cls;
                      return (
                        <div key={prod.id} className="pcard">
                          <div className="pc-top">
                            <span className="pc-e">{prod.e}</span>
                            <div>
                              <div className="pc-nm">{prod.n}</div>
                              <div className="pc-desc">{prod.d}</div>
                            </div>
                          </div>
                          <div className="pc-foot">
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                              <span className="pc-price">{prod.p}</span>
                              <span className="pc-tag">{prod.tipo==="bolo"?"⏰ 24h mínimo":"🗓 Por fornada"}</span>
                            </div>

                            {prod.tipo !== "bolo" && (
                              <div className="fstock">
                                <div className="fstock-hdr">
                                  <span className="fstock-title">Vagas por fornada</span>
                                  <span className="fstock-sel">
                                    {fornsFree.length > 0 ? `${fornsFree.length} disponível(is)` : "Todas lotadas"}
                                  </span>
                                </div>
                                <div className="fstock-fornadas">
                                  {fornadasAtivas.map(f => {
                                    const vagas = prod.tipo==="pao" ? vagasPao(f) : vagasBiscoito(f);
                                    const cap   = prod.tipo==="pao" ? f.capacidade_pao : f.capacidade_biscoito;
                                    const occ   = prod.tipo==="pao" ? f.pao_ocupado : f.biscoito_ocupado;
                                    const pct   = cap ? (occ/cap)*100 : 100;
                                    const st    = statusLabel(pct);
                                    return (
                                      <div key={f.id} className={`fstock-row${vagas===0?" esgotado":""}`}>
                                        <span className="fstock-dt">{f.label}</span>
                                        <div className="fstock-bar-wrap">
                                          <div className="fstock-bar" style={{ width:`${pct}%`, background:pct>=100?"#C03030":pct>=75?"#D07030":"var(--pr)" }} />
                                        </div>
                                        <span className="fstock-count">{vagas}/{cap} livres</span>
                                        <span className="fstock-badge" style={{ background:st.bg, color:st.cor, border:`1px solid ${st.cor}40` }}>
                                          {vagas===0?"Lotado":vagas===1?"1 vaga":`${vagas} vagas`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="qty-row">
                              <span className="qty-lbl">Quantidade:</span>
                              <div className="qty-ctrl">
                                <button className="qty-btn" onClick={() => setQty(prod.id, getQty(prod.id)-1)}>−</button>
                                <input type="number" className="qty-num" min={1} value={getQty(prod.id)}
                                  onChange={e => setQty(prod.id, parseInt(e.target.value)||1)} />
                                <button className="qty-btn" onClick={() => setQty(prod.id, getQty(prod.id)+1)}>+</button>
                              </div>
                            </div>

                            <button className={`cta ${ctaCls}`}
                              onClick={() => waitlist ? handleWaitlist(prod) : can ? openModal(prod) : handleWaitlist(prod)}>
                              {ctaTxt}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        <footer>
          <div className="ft-logo">Afeto em Forma</div>
          <div className="ft-txt">São Sebastião, SP<br />Cuidado em cada pedaço.</div>
        </footer>
      </div>

      {/* ──────────────── MODAL DE CHECKOUT ──────────────── */}
      {modal && (
        <div className="mbg" onClick={e => e.target===e.currentTarget && closeModal()}>
          <div className="mbox">
            <button className="mclose" onClick={closeModal}>✕</button>
            <div className="mhandle" />

            {succ ? (
              <div className="succ">
                <div className="succ-ico">✅</div>
                <div className="succ-t">Pedido registrado!</div>
                <div className="succ-s">
                  Seu pedido foi salvo e o WhatsApp foi aberto.<br />
                  Confirme com a artesã para finalizar.
                </div>
                <button className="msub" style={{ marginTop:18 }} onClick={closeModal}>Fechar</button>
              </div>
            ) : !isLoggedIn ? (
              /* Gate de autenticação dentro do modal */
              <div className="auth-gate">
                <div className="auth-gate-ico">🔐</div>
                <div className="auth-gate-t">Entre para fazer seu pedido</div>
                <div className="auth-gate-s">
                  Para garantir sua vaga e salvar seus dados,<br />
                  faça login ou crie sua conta grátis.
                </div>
                <button className="msub" onClick={() => { closeModal(); setShowAuth(true); }}>
                  🔑 Entrar / Criar Conta
                </button>
              </div>
            ) : (
              <>
                <div className="mtitle">Confirmar Pedido</div>

                {/* Resumo do produto */}
                <div className="mprod">
                  <span className="mprod-e">{modal.prod.e}</span>
                  <div>
                    <div className="mprod-nm">{modal.prod.n}</div>
                    <div className="mprod-p">{modal.prod.p} · {getQty(modal.prod.id)} un.</div>
                  </div>
                </div>

                {/* Dados do perfil (somente leitura, já preenchidos) */}
                <div style={{
                  background:"var(--srf2)", border:"1px solid var(--bdl)",
                  borderRadius:12, padding:"11px 14px", marginBottom:14
                }}>
                  <div style={{ fontSize:".72rem", color:"var(--mu)", marginBottom:5, fontWeight:600 }}>
                    👤 Seus dados (do perfil)
                  </div>
                  <div style={{ fontSize:".84rem", color:"var(--tx)", lineHeight:1.7 }}>
                    <strong>{profile?.nome || session.user.email}</strong><br />
                    {profile?.telefone && <>{profile.telefone}<br /></>}
                    {profile?.endereco || <span style={{ color:"var(--mum)" }}>Endereço não cadastrado</span>}
                  </div>
                  {(!profile?.nome || !profile?.telefone || !profile?.endereco) && (
                    <div style={{ fontSize:".7rem", color:"#B07030", marginTop:6 }}>
                      ⚠️ Complete seu perfil para uma confirmação mais rápida.
                    </div>
                  )}
                </div>

                {/* Seletor de fornada */}
                {modal.prod.tipo !== "bolo" && (
                  <div className="mfield">
                    <label className="mlbl">Escolha a fornada *</label>
                    <div className="fornada-opt">
                      {modal.forns.map(f => {
                        const vagas = modal.prod.tipo==="pao" ? vagasPao(f) : vagasBiscoito(f);
                        const st    = statusLabel(modal.prod.tipo==="pao" ? pctPao(f) : pctBiscoito(f));
                        return (
                          <div key={f.id}
                            className={`f-opt ${selFornada?.id===f.id?"on":""}`}
                            onClick={() => setSelFornada(f)}>
                            <span className="f-opt-dt">{f.label}</span>
                            <span className="f-opt-obs">{f.observacao}</span>
                            <span className="f-opt-tag" style={{ background:st.bg, color:st.cor, border:`1px solid ${st.cor}40` }}>
                              {vagas} vaga{vagas!==1?"s":""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data para bolos */}
                {modal.prod.tipo === "bolo" && (
                  <div className="mfield">
                    <label className="mlbl">Data desejada *</label>
                    <input type="date" className="minput"
                      min={new Date(Date.now()+86400000).toISOString().split("T")[0]}
                      onChange={e => setSelFornada(e.target.value)} />
                  </div>
                )}

                {err && <div className="merr">⚠️ {err}</div>}

                <button className="msub" onClick={handleCheckout} disabled={submitting}>
                  {submitting ? <><span className="spin">⏳</span> Registrando...</> : "📲 Confirmar e Abrir WhatsApp"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── PAINEL ADMIN ──────────────── */}
      {adminOpen && isAdmin && (
        <div className="adm-ov">
          <div className="adm-hdr">
            <button className="adm-back" onClick={() => setAdminOpen(false)}>← Voltar</button>
            <span className="adm-htitle">⚙️ Painel da Artesã — Afeto em Forma</span>
          </div>

          <div className="adm-body">

            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi"><div className="kpi-val">{fornadasAtivas.length}</div><div className="kpi-lbl">Fornadas ativas</div></div>
              <div className="kpi"><div className="kpi-val">{fornadasAtivas.reduce((a,f)=>a+f.pao_ocupado,0)}</div><div className="kpi-lbl">Pães em fila</div></div>
              <div className="kpi"><div className="kpi-val">{fornadasAtivas.reduce((a,f)=>a+f.biscoito_ocupado,0)}</div><div className="kpi-lbl">Biscoitos em fila</div></div>
              <div className="kpi"><div className="kpi-val" style={{ color:"#3A7A3A" }}>{pedidosReais.filter(p=>p.status==="confirmado").length}</div><div className="kpi-lbl">Confirmados</div></div>
            </div>

            {/* Tabs */}
            <div className="atabs">
              {[["fornadas","🔥 Fornadas"],["pedidos","📋 Pedidos"],["grafico","📊 Gráfico"],["relatorios","📈 Relatórios"]].map(([k,l]) => (
                <button key={k} className={`atab ${adminTab===k?"on":""}`} onClick={() => setAdminTab(k)}>{l}</button>
              ))}
            </div>

            {/* TAB FORNADAS */}
            {adminTab === "fornadas" && (
              <>
                {fornadas.map(f => {
                  const ppao  = f.capacidade_pao      ? (f.pao_ocupado      / f.capacidade_pao)      * 100 : 0;
                  const pbisc = f.capacidade_biscoito ? (f.biscoito_ocupado / f.capacidade_biscoito)  * 100 : 0;
                  return (
                    <div key={f.id} className="afcard">
                      <div className="afcard-hdr">
                        <div>
                          <div className="afcard-title">🔥 {f.label}</div>
                          <div className="afcard-obs">{f.observacao}</div>
                        </div>
                        <button className={`afcard-toggle ${f.ativa?"on":"off"}`}
                          onClick={() => updateFornada(f.id, { ativa: !f.ativa })}>
                          {f.ativa ? "✓ Ativa" : "✗ Inativa"}
                        </button>
                      </div>
                      <div className="cap-grid">
                        {[
                          { lbl:"🍞 Cap. Pão",      field:"capacidade_pao",      occ:f.pao_ocupado      },
                          { lbl:"⭕ Cap. Biscoito", field:"capacidade_biscoito", occ:f.biscoito_ocupado },
                        ].map(({ lbl, field, occ }) => (
                          <div key={field} className="capbox">
                            <div className="capbox-lbl">{lbl}</div>
                            <div className="capbox-ctrl">
                              <button className="cadj" onClick={() => updateFornada(f.id, { [field]: Math.max(occ, f[field]-1) })}>−</button>
                              <span className="capbox-num">{f[field]}</span>
                              <button className="cadj" onClick={() => updateFornada(f.id, { [field]: f[field]+1 })}>+</button>
                            </div>
                            <div className="capbox-sub">{occ} ocupado(s)</div>
                          </div>
                        ))}
                      </div>
                      {[
                        { lbl:"Pão ocupado",      occ:"pao_ocupado",      cap:f.capacidade_pao,      pct:ppao  },
                        { lbl:"Biscoito ocupado", occ:"biscoito_ocupado", cap:f.capacidade_biscoito, pct:pbisc },
                      ].map(({ lbl, occ, cap, pct }) => (
                        <div key={occ} className="occ-row" style={{ marginBottom:8 }}>
                          <span className="occ-lbl">{lbl}</span>
                          <div className="occ-bar-bg">
                            <div className="occ-bar-fill" style={{ width:`${Math.min(100,pct)}%`, background:pct>=100?"#C03030":pct>=75?"#D07030":"var(--pr)" }} />
                          </div>
                          <span className="occ-frac">{f[occ]} / {cap}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="add-form">
                  <div className="add-form-t">➕ Adicionar Nova Fornada</div>
                  <div className="add-grid">
                    <div><label className="add-lbl">Data</label>
                      <input type="date" className="add-inp" value={newFornada.data}
                        onChange={e => setNewFornada(n => ({ ...n, data:e.target.value }))} /></div>
                    <div><label className="add-lbl">Observação</label>
                      <input className="add-inp" placeholder="Ex: Especial de Páscoa"
                        value={newFornada.obs} onChange={e => setNewFornada(n => ({ ...n, obs:e.target.value }))} /></div>
                    <div><label className="add-lbl">Cap. Pão</label>
                      <input type="number" className="add-inp" min={0} value={newFornada.cap_pao}
                        onChange={e => setNewFornada(n => ({ ...n, cap_pao:parseInt(e.target.value)||0 }))} /></div>
                    <div><label className="add-lbl">Cap. Biscoito</label>
                      <input type="number" className="add-inp" min={0} value={newFornada.cap_biscoito}
                        onChange={e => setNewFornada(n => ({ ...n, cap_biscoito:parseInt(e.target.value)||0 }))} /></div>
                  </div>
                  <button className="add-btn" onClick={addFornada}>🔥 Adicionar Fornada</button>
                </div>
              </>
            )}

            {/* TAB PEDIDOS */}
            {adminTab === "pedidos" && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ fontSize:".8rem", color:"var(--mu)" }}>{pedidosReais.length} pedido(s)</span>
                  <button className="adm-refresh" onClick={fetchPedidos} disabled={loadPedidos}>
                    {loadPedidos ? <><span className="spin">⏳</span> Carregando...</> : "↻ Atualizar"}
                  </button>
                </div>
                {loadPedidos && <div style={{ textAlign:"center", padding:"24px 0", color:"var(--mu)" }}><span className="spin">🔥</span> Buscando...</div>}
                {!loadPedidos && pedidosReais.length === 0 && <div style={{ textAlign:"center", color:"var(--mu)", padding:"32px 0" }}>Nenhum pedido.</div>}
                {pedidosReais.map(pedido => {
                  const itens    = pedido.itens_pedido ?? [];
                  const fornada  = pedido.fornadas;
                  const itemDesc = itens.map(i => `${i.quantidade}× ${i.nome_produto}`).join(", ");
                  const dtExib   = fornada?.data
                    ? new Date(fornada.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})
                    : pedido.data_agendada ?? "—";
                  const eCat = itens[0]?.produto==="Pão" ? "🍞" : itens[0]?.produto==="Biscoito" ? "⭕" : "🍯";
                  return (
                    <div key={pedido.id} className="porder">
                      <span className="porder-e">{eCat}</span>
                      <div className="porder-info">
                        <div className="porder-nm">{itemDesc || "sem itens"}</div>
                        <div className="porder-meta">📅 {dtExib} · {pedido.valor_total ? `R$ ${Number(pedido.valor_total).toFixed(2)}` : "—"}</div>
                      </div>
                      <span className={`badge ${pedido.status==="confirmado"?"bc":"bp"}`}>
                        {pedido.status==="confirmado" ? "✓ Confirmado" : "⏳ Pendente"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB GRÁFICO */}
            {adminTab === "grafico" && (
              <div style={{ background:"var(--srf)", border:"1px solid var(--bdl)", borderRadius:"var(--radd)", padding:18, marginBottom:20 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", color:"var(--pr)", marginBottom:14 }}>📊 Vagas por Fornada e Produto</div>
                <div className="rchart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5CDB8" />
                      <XAxis dataKey="name" tick={{ fontSize:11, fill:"#7A5440" }} />
                      <YAxis tick={{ fontSize:11, fill:"#7A5440" }} />
                      <Tooltip contentStyle={{ background:"#FFFCF8", border:"1px solid #E5CDB8", borderRadius:10, fontSize:12 }} labelStyle={{ color:"#6B2B2B", fontWeight:700 }} />
                      <Bar dataKey="pao_ocupado"  name="Pão Ocupado"      stackId="p" fill="#8B3A3A" radius={[0,0,0,0]} />
                      <Bar dataKey="pao_livre"    name="Pão Livre"        stackId="p" fill="#E5CDB8" radius={[5,5,0,0]} />
                      <Bar dataKey="bisc_ocupado" name="Biscoito Ocupado" stackId="b" fill="#C49A6C" radius={[0,0,0,0]} />
                      <Bar dataKey="bisc_livre"   name="Biscoito Livre"   stackId="b" fill="#F0DDD0" radius={[5,5,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── TAB RELATÓRIOS ── */}
            {adminTab === "relatorios" && (
              <div>
                {/* Cabeçalho com seletor de período */}
                <div className="rel-header">
                  <div className="rel-title">📈 Relatórios de Vendas</div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <div className="rel-period">
                      {[7, 30].map(d => (
                        <button key={d}
                          className={`rel-pbtn ${period === d ? "on" : ""}`}
                          onClick={() => setPeriod(d)}>
                          {d === 7 ? "7 dias" : "30 dias"}
                        </button>
                      ))}
                      <button
                        className={`rel-pbtn ${typeof period === "object" ? "on" : ""}`}
                        onClick={() => {
                          if (typeof period !== "object")
                            setPeriod({ start: customRange.start || "", end: customRange.end || "" });
                        }}>
                        Personalizado
                      </button>
                    </div>
                    {typeof period === "object" && (
                      <div className="rel-date-range">
                        <input type="date" className="rel-date-inp"
                          value={customRange.start}
                          onChange={e => {
                            const next = { ...customRange, start: e.target.value };
                            setCustomRange(next);
                            // debounce 500 ms
                            clearTimeout(debounceRef[0]);
                            debounceRef[0] = setTimeout(() => {
                              if (next.start && next.end) setPeriod({ ...next });
                            }, 500);
                          }} />
                        <span style={{ fontSize:".75rem", color:"var(--mu)" }}>até</span>
                        <input type="date" className="rel-date-inp"
                          value={customRange.end}
                          onChange={e => {
                            const next = { ...customRange, end: e.target.value };
                            setCustomRange(next);
                            clearTimeout(debounceRef[0]);
                            debounceRef[0] = setTimeout(() => {
                              if (next.start && next.end) setPeriod({ ...next });
                            }, 500);
                          }} />
                      </div>
                    )}
                    <button className="rel-export-btn" onClick={exportarCSV}
                      title="Exportar dados filtrados em CSV">
                      ⬇️ Exportar CSV
                    </button>
                    <button className="adm-refresh"
                      onClick={() => fetchRelatorios(period)}
                      disabled={relLoading}>
                      {relLoading ? <><span className="spin">⏳</span></> : "↻"}
                    </button>
                  </div>
                </div>

                {relLoading ? (
                  <div className="rel-loading">
                    <span className="spin">🔥</span> Calculando relatórios...
                  </div>
                ) : (
                  <>
                    {/* ── KPIs ── */}
                    <div className="rel-kpi-grid">
                      <div className="rel-kpi">
                        <div className="rel-kpi-lbl">💰 Faturamento Total</div>
                        <div className="rel-kpi-val">
                          {relKPIs ? `R$ ${relKPIs.faturamento.toFixed(2).replace(".", ",")}` : "—"}
                        </div>
                        <div className="rel-kpi-sub">pedidos confirmados</div>
                      </div>
                      <div className="rel-kpi">
                        <div className="rel-kpi-lbl">🎯 Ticket Médio</div>
                        <div className="rel-kpi-val">
                          {relKPIs ? `R$ ${relKPIs.ticketMedio.toFixed(2).replace(".", ",")}` : "—"}
                        </div>
                        <div className="rel-kpi-sub">por pedido confirmado</div>
                      </div>
                      <div className="rel-kpi">
                        <div className="rel-kpi-lbl">📦 Total de Pedidos</div>
                        <div className="rel-kpi-val">
                          {relKPIs ? relKPIs.totalPedidos : "—"}
                        </div>
                        <div className="rel-kpi-sub">confirmados no período</div>
                      </div>
                    </div>

                    {/* ── Gráfico de linha: evolução diária ── */}
                    <div className="rel-section">
                      <div className="rel-section-title">
                        📅 Evolução Diária de Vendas
                        <span>faturamento confirmado por dia</span>
                      </div>
                      {relDaily.length === 0 ? (
                        <div className="rel-empty">Sem dados no período selecionado.</div>
                      ) : (
                        <div className="rel-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={relDaily} margin={{ top:4, right:8, left:-10, bottom:4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--bdl)" />
                              <XAxis dataKey="data"
                                tick={{ fontSize:10, fill:"var(--mum)" }}
                                interval={relDaily.length > 14 ? Math.floor(relDaily.length / 7) : 0} />
                              <YAxis tick={{ fontSize:10, fill:"var(--mum)" }}
                                tickFormatter={v => v === 0 ? "0" : `R$${v.toFixed(0)}`} />
                              <Tooltip
                                contentStyle={{ background:"var(--srf)", border:"1px solid var(--bdl)", borderRadius:10, fontSize:12 }}
                                formatter={(v) => [`R$ ${v.toFixed(2)}`, "Vendas"]}
                                labelStyle={{ color:"var(--pr)", fontWeight:700 }} />
                              <Line type="monotone" dataKey="valor" name="Vendas (R$)"
                                stroke="var(--pr)" strokeWidth={2.5}
                                dot={{ r:3, fill:"var(--pr)", strokeWidth:0 }}
                                activeDot={{ r:5, fill:"var(--ac)" }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* ── Top 5 produtos (barras horizontais) ── */}
                    <div className="rel-section">
                      <div className="rel-section-title">
                        🏆 Top 5 Produtos Mais Vendidos
                        <span>por quantidade · pedidos confirmados</span>
                      </div>
                      {relTopProds.length === 0 ? (
                        <div className="rel-empty">Sem dados no período selecionado.</div>
                      ) : (() => {
                        const maxQty = Math.max(...relTopProds.map(p => p.qty), 1);
                        return relTopProds.map((prod, i) => (
                          <div key={prod.nome} className="rel-bar-row">
                            <div className="rel-bar-label" title={prod.nome}>
                              {i === 0 && <span className="top-badge">🏆</span>}
                              {prod.nome}
                            </div>
                            <div className="rel-bar-wrap">
                              <div className="rel-bar-fill"
                                style={{ width:`${(prod.qty / maxQty) * 100}%` }} />
                            </div>
                            <div className="rel-bar-val">{prod.qty}</div>
                            <div className="rel-bar-badge">un.</div>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* ── Tabela: vendas por fornada ── */}
                    <div className="rel-section">
                      <div className="rel-section-title">
                        🔥 Vendas por Fornada
                        <span>apenas pedidos com fornada vinculada</span>
                      </div>
                      {relFornadas.length === 0 ? (
                        <div className="rel-empty">Nenhuma venda por fornada no período.</div>
                      ) : (
                        <div style={{ overflowX:"auto" }}>
                          <table className="rel-table">
                            <thead>
                              <tr>
                                <th>Data da Fornada</th>
                                <th style={{ textAlign:"right" }}>Pedidos</th>
                                <th style={{ textAlign:"right" }}>Faturamento</th>
                                <th style={{ textAlign:"right" }}>Ticket Médio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {relFornadas.map(f => (
                                <tr key={f.data}>
                                  <td>
                                    <span style={{ fontWeight:600 }}>
                                      {new Date(f.data + "T12:00:00")
                                        .toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit" })
                                        .replace(/^\w/, c => c.toUpperCase())}
                                    </span>
                                  </td>
                                  <td style={{ textAlign:"right" }}>{f.pedidos}</td>
                                  <td style={{ textAlign:"right", fontWeight:600, color:"var(--pr)" }}>
                                    R$ {f.faturamento.toFixed(2).replace(".", ",")}
                                  </td>
                                  <td style={{ textAlign:"right", color:"var(--mu)" }}>
                                    R$ {f.pedidos > 0
                                      ? (f.faturamento / f.pedidos).toFixed(2).replace(".", ",")
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT EXPORT — envolve o app no AuthProvider
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <AuthProvider>
      <DosAnjosApp />
    </AuthProvider>
  );
}
