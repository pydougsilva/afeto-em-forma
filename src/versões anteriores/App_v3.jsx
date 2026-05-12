// DosAnjos_v3.jsx — Integração completa com Supabase
// Mantém 100% do design visual da v2. Substitui todos os mocks por chamadas reais.
//
// Dependências (já instaladas em qualquer projeto Vite+React+Supabase):
//   npm install @supabase/supabase-js recharts
//
// Pré-requisito: criar o arquivo src/lib/supabaseClient.js com:
//   import { createClient } from '@supabase/supabase-js'
//   export const supabase = createClient(
//     import.meta.env.VITE_SUPABASE_URL,
//     import.meta.env.VITE_SUPABASE_ANON_KEY
//   )

import react, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./lib/supabaseClient";

/* ═══════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════ */
const WA_NUM    = "5512991370007";
const ADMIN_PIN = "2407";

/* ═══════════════════════════════════════════════════════════════════
   CATÁLOGO DE PRODUTOS (estático — gerenciado no código)
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
   HELPERS PUROS (sem side-effects)
═══════════════════════════════════════════════════════════════════ */
const vagasPao      = f => Math.max(0, f.capacidade_pao      - f.pao_ocupado);
const vagasBiscoito = f => Math.max(0, f.capacidade_biscoito - f.biscoito_ocupado);
const pctPao        = f => f.capacidade_pao      ? (f.pao_ocupado      / f.capacidade_pao)      * 100 : 0;
const pctBiscoito   = f => f.capacidade_biscoito ? (f.biscoito_ocupado / f.capacidade_biscoito)  * 100 : 0;

function statusLabel(pct) {
  if (pct >= 100) return { txt:"Lotado",    cor:"#C03030", bg:"#FFF0F0" };
  if (pct >= 75)  return { txt:"Quase",     cor:"#C07030", bg:"#FFF6E8" };
  return               { txt:"Disponível",  cor:"#3A7A3A", bg:"#F0FBF0" };
}

// Converte row da view vagas_fornada → shape usado pelo componente
function formatarFornada(row) {
  return {
    id:                   row.fornada_id,
    data:                 row.data,
    label:                new Date(row.data + "T12:00:00")
                            .toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit" })
                            .replace(/^\w/, c => c.toUpperCase()),
    capacidade_pao:       row.capacidade_pao,
    capacidade_biscoito:  row.capacidade_biscoito,
    pao_ocupado:          row.pao_ocupado,
    biscoito_ocupado:     row.biscoito_ocupado,
    ativa:                row.ativa,
    observacao:           row.observacao,
  };
}

// Extrai preço numérico de strings como "R$ 65" ou "R$ 22/pct"
function extrairPreco(str) {
  const n = parseFloat(str.replace(/[^\d,]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// Validação de telefone: mínimo 10 dígitos após remover máscara
function validarTelefone(tel) {
  return tel.replace(/\D/g, "").length >= 10;
}

/* ═══════════════════════════════════════════════════════════════════
   CSS — IDÊNTICO À V2, sem nenhuma alteração
═══════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FDF8F3;--srf:#FFFCF8;--srf2:#FAF3EC;
  --pr:#6B2B2B;--prl:#8B3A3A;--prd:#4E1A1A;
  --sc:#C49A6C;--scl:#D4A373;
  --ac:#D4623A;--acl:#E76F51;
  --tx:#1E0E08;--mu:#7A5440;--mum:#A07060;
  --bd:#E5CDB8;--bdl:#F0DDD0;
  --sh:rgba(107,43,43,.12);--shd:rgba(107,43,43,.2);
  --rad:14px;--radd:20px
}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);-webkit-font-smoothing:antialiased}
.hdr{background:linear-gradient(160deg,#0E0404 0%,#2E0E0E 45%,#6B2B2B 100%);padding:28px 18px 36px;text-align:center;position:relative;overflow:hidden}
.hdr-fg{position:absolute;inset:0;pointer-events:none}
.hdr-fg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(212,98,58,.18) 0%,transparent 70%)}
.hdr-fg::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
.hdr-in{position:relative;z-index:1}
.logo{font-family:'Playfair Display',serif;font-size:clamp(3rem,10vw,4.8rem);font-weight:900;color:#F5EAD8;letter-spacing:.02em;line-height:1;text-shadow:0 2px 20px rgba(0,0,0,.4)}
.logo em{color:#E76F51;font-style:normal}
.tagline{font-family:'Playfair Display',serif;font-style:italic;font-size:clamp(.85rem,2.8vw,1.05rem);color:#C49A6C;margin-top:6px;letter-spacing:.12em}
.hdr-orn{display:flex;align-items:center;justify-content:center;gap:12px;margin:10px 0 7px}
.hdr-orn::before,.hdr-orn::after{content:'';flex:1;max-width:50px;height:1px;background:rgba(196,154,108,.3)}
.hdr-orn span{font-size:.65rem;color:#C49A6C;letter-spacing:.2em;opacity:.8}
.hdr-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(196,154,108,.25);border-radius:20px;padding:5px 16px;font-size:.73rem;color:#E8D5C0;letter-spacing:.04em}
.adm-btn{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);font-size:.7rem;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;z-index:2}
.adm-btn:hover{background:rgba(255,255,255,.18);color:#fff}
.sec{padding:22px 16px 6px}
.sec-t{font-family:'Playfair Display',serif;font-size:1.45rem;font-weight:700;color:var(--pr)}
.sec-s{font-size:.8rem;color:var(--mu);margin-top:3px;margin-bottom:14px;line-height:1.5}
.rule{height:1px;background:var(--bdl);margin:2px 16px 0}
.fscroll{display:flex;gap:11px;overflow-x:auto;padding:2px 16px 10px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.fscroll::-webkit-scrollbar{display:none}
.fcard{flex-shrink:0;width:140px;background:var(--srf);border:2px solid var(--bdl);border-radius:var(--radd);padding:14px 13px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden}
.fcard::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,transparent)}
.fcard.sel{border-color:var(--pr);background:var(--srf2)}
.fcard.sel::after{background:linear-gradient(90deg,var(--pr),var(--ac))}
.fcard:hover:not(.sel){border-color:var(--sc);transform:translateY(-2px)}
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
.fstock-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;cursor:pointer;border:1.5px solid transparent;transition:all .18s;background:var(--srf)}
.fstock-row.esgotado{opacity:.5;cursor:default}
.fstock-row:hover:not(.esgotado):not(.sel){border-color:var(--sc)}
.fstock-dt{font-size:.75rem;font-weight:600;color:var(--pr);min-width:60px}
.fstock-bar-wrap{flex:1;height:6px;background:var(--bdl);border-radius:3px;overflow:hidden}
.fstock-bar{height:100%;border-radius:3px;transition:width .4s}
.fstock-count{font-size:.68rem;color:var(--mum);white-space:nowrap;min-width:52px;text-align:right}
.fstock-badge{font-size:.6rem;border-radius:7px;padding:2px 7px;font-weight:600;white-space:nowrap}
.qty-row{display:flex;align-items:center;gap:9px}
.qty-lbl{font-size:.76rem;color:var(--mu)}
.qty-ctrl{display:flex;align-items:center;border:1.5px solid var(--bdl);border-radius:10px;overflow:hidden}
.qty-btn{background:none;border:none;width:32px;height:32px;cursor:pointer;font-size:1.1rem;color:var(--pr);display:flex;align-items:center;justify-content:center;transition:background .15s;font-family:'DM Sans',sans-serif}
.qty-btn:hover{background:var(--srf2)}
.qty-num{width:36px;text-align:center;border:none;border-left:1.5px solid var(--bdl);border-right:1.5px solid var(--bdl);outline:none;font-size:.9rem;font-weight:700;background:transparent;color:var(--tx);font-family:'DM Sans',sans-serif}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
.cta{width:100%;padding:12px 14px;border:none;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:7px;letter-spacing:.01em;line-height:1.3;text-align:center}
.cta-primary{background:linear-gradient(135deg,var(--pr),#A04040);color:#fff;box-shadow:0 3px 13px rgba(107,43,43,.3)}
.cta-primary:hover{background:linear-gradient(135deg,var(--prd),#8B3030);transform:translateY(-1px);box-shadow:0 5px 18px rgba(107,43,43,.4)}
.cta-urgent{background:linear-gradient(135deg,#B84020,var(--ac));color:#fff;animation:glow 2.2s infinite}
@keyframes glow{0%,100%{box-shadow:0 3px 12px rgba(212,98,58,.35)}50%{box-shadow:0 3px 24px rgba(212,98,58,.65)}}
.cta-off{background:#EDE0D8;color:#B09080;border:1px dashed var(--bdl);cursor:pointer}
.cta-off:hover{background:#E5D5CA}
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
.minput,.mselect{width:100%;border:1.5px solid var(--bdl);border-radius:11px;padding:10px 13px;font-size:.87rem;font-family:'DM Sans',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s;appearance:none}
.minput:focus,.mselect:focus{border-color:var(--pr)}
.minput::placeholder{color:#C0A898}
.fornada-opt{display:flex;flex-direction:column;gap:7px}
.f-opt{display:flex;align-items:center;gap:10px;padding:10px 13px;border:2px solid var(--bdl);border-radius:12px;cursor:pointer;transition:all .18s;background:var(--srf)}
.f-opt.on{border-color:var(--pr);background:#FDF0E8}
.f-opt.esg{opacity:.45;cursor:default;background:var(--srf2)}
.f-opt:hover:not(.esg):not(.on){border-color:var(--sc)}
.f-opt-dt{font-weight:600;font-size:.86rem;color:var(--pr);min-width:70px}
.f-opt-obs{font-size:.74rem;color:var(--mu);flex:1}
.f-opt-tag{font-size:.65rem;border-radius:8px;padding:2px 8px;font-weight:600;white-space:nowrap}
.merr{font-size:.76rem;color:#C03030;margin-top:-9px;margin-bottom:10px;display:flex;align-items:center;gap:5px;background:#FFF0F0;border:1px solid #F0C0C0;padding:7px 11px;border-radius:9px}
.msub{width:100%;padding:13px;background:linear-gradient(135deg,var(--pr),#A04040);color:#fff;border:none;border-radius:13px;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:5px;box-shadow:0 4px 16px rgba(107,43,43,.3);transition:all .2s}
.msub:hover:not(:disabled){background:linear-gradient(135deg,var(--prd),#8B3030);transform:translateY(-1px)}
.msub:disabled{opacity:.55;cursor:not-allowed}
.succ{text-align:center;padding:10px 0;animation:fi .3s}
.succ-ico{font-size:2.6rem}
.succ-t{font-family:'Playfair Display',serif;font-size:1.2rem;color:#3A6A3A;font-weight:700;margin-top:10px}
.succ-s{font-size:.8rem;color:#5A8A5A;margin-top:6px;line-height:1.6}
.adm-ov{position:fixed;inset:0;background:var(--bg);z-index:200;overflow-y:auto}
.adm-hdr{background:linear-gradient(135deg,#1E0A04,#5A2020);padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.adm-back{background:rgba(255,255,255,.13);border:none;color:#fff;padding:7px 15px;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.81rem}
.adm-htitle{font-family:'Playfair Display',serif;font-size:1.25rem;color:#F5E8D0}
.adm-body{padding:18px 16px 40px;max-width:900px;margin:0 auto}
.pin-wrap{max-width:320px;margin:60px auto;background:var(--srf);border:1px solid var(--bdl);border-radius:var(--radd);padding:32px 26px;text-align:center;box-shadow:0 8px 32px var(--sh)}
.pin-ico{font-size:2.4rem;margin-bottom:8px}
.pin-t{font-family:'Playfair Display',serif;font-size:1.55rem;color:var(--pr);margin-bottom:5px}
.pin-s{font-size:.79rem;color:var(--mu);margin-bottom:20px;line-height:1.6}
.pin-inp{width:100%;border:2px solid var(--bdl);border-radius:12px;padding:13px;text-align:center;font-size:1.9rem;letter-spacing:.6em;font-weight:700;color:var(--pr);outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s}
.pin-inp:focus{border-color:var(--pr)}
.pin-btn{margin-top:12px;width:100%;padding:13px;background:linear-gradient(135deg,var(--pr),#A04040);color:#fff;border:none;border-radius:12px;font-size:.92rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.pin-btn:hover{background:linear-gradient(135deg,var(--prd),#8B3030)}
.atabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.atab{padding:8px 18px;border-radius:10px;border:1.5px solid var(--bdl);background:var(--srf);font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;color:var(--mu);transition:all .2s}
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
.afcard-toggle{background:none;border:1.5px solid var(--bdl);border-radius:9px;padding:5px 12px;font-family:'DM Sans',sans-serif;font-size:.74rem;cursor:pointer;color:var(--mu);transition:all .2s;white-space:nowrap}
.afcard-toggle.on{background:#F0FBF0;border-color:#80C880;color:#3A6A3A}
.afcard-toggle.off{background:#FFF0F0;border-color:#F0A0A0;color:#8A3030}
.cap-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.capbox{background:var(--srf2);border:1px solid var(--bdl);border-radius:12px;padding:12px}
.capbox-lbl{font-size:.7rem;font-weight:600;color:var(--mu);margin-bottom:7px}
.capbox-ctrl{display:flex;align-items:center;gap:8px;justify-content:space-between}
.capbox-num{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:var(--pr);min-width:36px;text-align:center}
.capbox-sub{font-size:.65rem;color:var(--mum);margin-top:4px;text-align:center}
.cadj{background:var(--bg);border:1.5px solid var(--bdl);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--pr);display:flex;align-items:center;justify-content:center;font-size:1rem;transition:all .15s;font-family:'DM Sans',sans-serif}
.cadj:hover{background:var(--pr);color:#fff;border-color:var(--pr)}
.occ-row{display:flex;align-items:center;gap:9px}
.occ-lbl{font-size:.72rem;color:var(--mu);min-width:72px}
.occ-bar-bg{flex:1;height:7px;background:var(--bdl);border-radius:4px;overflow:hidden}
.occ-bar-fill{height:100%;border-radius:4px;transition:width .4s}
.occ-frac{font-size:.73rem;font-weight:600;color:var(--mu);min-width:50px;text-align:right}
.occ-adj{background:var(--srf2);border:1px solid var(--bdl);border-radius:7px;width:26px;height:26px;cursor:pointer;color:var(--pr);display:flex;align-items:center;justify-content:center;font-size:.85rem;transition:all .15s}
.occ-adj:hover{background:var(--pr);color:#fff;border-color:var(--pr)}
.add-form{background:var(--srf2);border:2px dashed var(--bdl);border-radius:var(--radd);padding:18px;margin-top:10px}
.add-form-t{font-family:'Playfair Display',serif;font-size:1rem;color:var(--pr);margin-bottom:14px}
.add-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.add-lbl{font-size:.72rem;font-weight:600;color:var(--mu);margin-bottom:5px;display:block}
.add-inp{width:100%;border:1.5px solid var(--bdl);border-radius:9px;padding:8px 11px;font-size:.85rem;font-family:'DM Sans',sans-serif;color:var(--tx);background:#fff;outline:none;transition:border-color .2s}
.add-inp:focus{border-color:var(--pr)}
.add-btn{width:100%;padding:11px;background:linear-gradient(135deg,var(--pr),#A04040);color:#fff;border:none;border-radius:11px;font-family:'DM Sans',sans-serif;font-size:.87rem;font-weight:600;cursor:pointer;transition:all .2s}
.add-btn:hover{background:linear-gradient(135deg,var(--prd),#8B3030)}
.porder{display:flex;align-items:flex-start;gap:11px;background:var(--srf);border:1px solid var(--bdl);border-radius:12px;padding:12px;margin-bottom:9px}
.porder-e{font-size:1.4rem;flex-shrink:0;padding-top:2px}
.porder-info{flex:1;min-width:0}
.porder-nm{font-size:.87rem;font-weight:600;color:var(--tx)}
.porder-meta{font-size:.72rem;color:var(--mu);margin-top:3px;line-height:1.5}
.badge{font-size:.64rem;border-radius:9px;padding:3px 9px;font-weight:600;white-space:nowrap;flex-shrink:0}
.bp{background:#FFF3E0;color:#B06010;border:1px solid #FFB84D}
.bc{background:#E8F5E8;color:#2E6A2E;border:1px solid #72C072}
.rchart{height:220px;margin-top:4px}
footer{background:linear-gradient(135deg,#0E0404,#3A1414);padding:26px 16px;text-align:center;margin-top:40px}
.ft-logo{font-family:'Playfair Display',serif;font-size:1.55rem;font-weight:700;color:#C49A6C}
.ft-txt{font-size:.73rem;color:rgba(255,255,255,.38);margin-top:9px;line-height:1.8}
.adm-refresh{background:var(--srf2);border:1.5px solid var(--bdl);color:var(--pr);border-radius:9px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
.adm-refresh:hover{background:var(--pr);color:#fff;border-color:var(--pr)}
.spin{display:inline-block;animation:spin .8s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

/* ═══════════════════════════════════════════════════════════════════
   SLOT DOTS (componente auxiliar — idêntico à v2)
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
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function DosAnjos() {

  /* ─── estado público ─── */
  const [fornadas,   setFornadas]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [qtys,       setQtys]       = useState({});
  const [modal,      setModal]      = useState(null);
  const [selFornada, setSelFornada] = useState(null);
  // v3: form agora inclui telefone e endereco (renomeado de end)
  const [form, setForm] = useState({ nome:"", telefone:"", endereco:"" });
  const [err,        setErr]        = useState("");
  const [succ,       setSucc]       = useState(false);
  const [submitting,     setSubmitting]     = useState(false); // bloqueia duplo-clique
  const [loadingCliente, setLoadingCliente] = useState(false); // autopreenchimento em curso

  /* ─── estado admin ─── */
  const [adminOpen,   setAdminOpen]   = useState(false);
  const [adminAuth,   setAdminAuth]   = useState(false);
  const [pinInput,    setPinInput]    = useState("");
  const [adminTab,    setAdminTab]    = useState("fornadas");
  const [pedidosReais,setPedidosReais]= useState([]);
  const [loadPedidos, setLoadPedidos] = useState(false);
  const [newFornada,  setNewFornada]  = useState({ data:"", obs:"", cap_pao:5, cap_biscoito:6 });

  /* ═══════════════════════════════════════════════════════════════
     FETCH FORNADAS — lê a view vagas_fornada (dados reais)
     Chamada no mount e após cada checkout bem-sucedido.
  ═══════════════════════════════════════════════════════════════ */
  const fetchFornadas = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("vagas_fornada")
      .select("*")
      .gte("data", hoje)
      .eq("ativa", true)
      .order("data", { ascending: true });

    if (!error && data) {
      setFornadas(data.map(formatarFornada));
    } else if (error) {
      console.error("[DosAnjos] fetchFornadas:", error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFornadas(); }, [fetchFornadas]);

  /* ═══════════════════════════════════════════════════════════════
     FETCH PEDIDOS — usado pelo painel admin (aba Pedidos)
     JOIN manual: pedidos + clientes + itens_pedido
  ═══════════════════════════════════════════════════════════════ */
  const fetchPedidos = useCallback(async () => {
    setLoadPedidos(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        status,
        data_agendada,
        valor_total,
        created_at,
        clientes ( nome, telefone ),
        fornadas ( data ),
        itens_pedido ( produto, nome_produto, quantidade, preco_unitario )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setPedidosReais(data);
    } else if (error) {
      console.error("[DosAnjos] fetchPedidos:", error.message);
    }
    setLoadPedidos(false);
  }, []);

  // Carrega pedidos quando admin abre a aba pedidos
  useEffect(() => {
    if (adminAuth && adminTab === "pedidos") fetchPedidos();
  }, [adminAuth, adminTab, fetchPedidos]);

  /* ═══════════════════════════════════════════════════════════════
     AUTOPREENCHIMENTO — busca nome/endereço pelo telefone digitado.
     Acionada no onBlur do campo WhatsApp no modal de checkout.
     Requer a policy RLS "clientes_select_por_telefone" no Supabase.
  ═══════════════════════════════════════════════════════════════ */
  async function buscarClientePorTelefone(telefoneDigitado) {
    const telLimpo = telefoneDigitado.replace(/\D/g, "");

    // Número incompleto → não consulta
    if (telLimpo.length < 10) return null;

    setLoadingCliente(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("nome, endereco")
        .eq("telefone", telLimpo)
        .maybeSingle(); // retorna null sem lançar erro se não encontrar

      if (error) {
        console.warn("[DosAnjos] buscarClientePorTelefone:", error.message);
        return null;
      }
      return data; // { nome, endereco } ou null
    } finally {
      setLoadingCliente(false);
    }
  }

  /* ─── helpers de qty ─── */
  const getQty = id => qtys[id] ?? 1;
  const setQty = (id, v) => setQtys(q => ({ ...q, [id]: Math.max(1, v) }));

  /* ─── derivados ─── */
  const fornadasAtivas         = fornadas.filter(f => f.ativa);
  const fornadasComVagaPao     = fornadasAtivas.filter(f => vagasPao(f)      > 0);
  const fornadasComVagaBiscoito= fornadasAtivas.filter(f => vagasBiscoito(f) > 0);

  /* ─── CTA config por produto ─── */
  function ctaCfg(prod) {
    if (prod.tipo === "bolo") return { txt:"🎂 Encomendar Meu Bolo", cls:"cta-primary", can:true };
    const fornsFree = prod.tipo === "pao" ? fornadasComVagaPao : fornadasComVagaBiscoito;
    if (fornsFree.length === 0)
      return { txt:"⛔ Lista de Espera (Todas Fornadas Lotadas)", cls:"cta-off", can:false, waitlist:true };
    const totalFree = fornsFree.reduce(
      (a, f) => a + (prod.tipo === "pao" ? vagasPao(f) : vagasBiscoito(f)), 0
    );
    if (totalFree === 1) return { txt:"⚡ Última Vaga em Todas as Fornadas!", cls:"cta-urgent", can:true };
    return prod.tipo === "pao"
      ? { txt:"🔥 Garantir Minha Vaga na Fornada", cls:"cta-primary", can:true }
      : { txt:"🍪 Reservar Pacote — Próxima Fornada",  cls:"cta-primary", can:true };
  }

  /* ─── abrir modal ─── */
  function openModal(prod) {
    const forns = prod.tipo === "bolo" ? fornadasAtivas
                : prod.tipo === "pao"  ? fornadasComVagaPao
                : fornadasComVagaBiscoito;
    setModal({ prod, forns });
    setSelFornada(forns[0] ?? null);
    setForm({ nome:"", telefone:"", endereco:"" }); // v3: reset inclui telefone
    setErr(""); setSucc(false);
  }
  const closeModal = () => { setModal(null); setSucc(false); };

  /* ─── waitlist ─── */
  function handleWaitlist(prod) {
    const msg = `Olá DosAnjos! 👋 Vi que todas as fornadas de *${prod.n}* estão lotadas. Gostaria de entrar na *Lista de Espera*. Meu nome é _____.`;
    window.open(`https://api.whatsapp.com/send?phone=${WA_NUM}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  /* ═══════════════════════════════════════════════════════════════
     HANDLE CHECKOUT — v3: async + persistência real no Supabase
  ═══════════════════════════════════════════════════════════════ */
  async function handleCheckout() {

    /* ── 1. Validações de campos obrigatórios ── */
    if (!form.nome.trim()) {
      setErr("Informe seu nome para continuar."); return;
    }
    if (!form.telefone.trim() || !validarTelefone(form.telefone)) {
      setErr("Informe um WhatsApp válido com DDD (mínimo 10 dígitos)."); return;
    }
    if (!form.endereco.trim()) {
      setErr("Informe seu endereço completo para a entrega."); return;
    }
    if (modal.prod.tipo !== "bolo" && !selFornada) {
      setErr("Selecione uma data de fornada."); return;
    }

    /* ── 2. Validação de quantidade vs vagas da fornada ── */
    const { prod } = modal;
    const qty      = getQty(prod.id);

    if (prod.tipo !== "bolo" && selFornada && typeof selFornada === "object") {
      const vagasDisponiveis = prod.tipo === "pao"
        ? vagasPao(selFornada)
        : vagasBiscoito(selFornada);
      if (qty > vagasDisponiveis) {
        setErr(
          vagasDisponiveis === 0
            ? `Esta fornada (${selFornada.label}) não tem mais vagas. Escolha outra data.`
            : `Há apenas ${vagasDisponiveis} vaga(s) para a fornada de ${selFornada.label}. Reduza a quantidade ou escolha outra data.`
        );
        return;
      }
    }

    setErr("");
    setSubmitting(true);

    try {
      /* ── 3a. Upsert cliente (telefone como chave de conflito) ── */
      const { data: cliente, error: clienteErr } = await supabase
        .from("clientes")
        .upsert({
          telefone:   form.telefone.replace(/\D/g, ""),
          nome:       form.nome.trim(),
          endereco:   form.endereco.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "telefone" })
        .select("id")
        .single();
      if (clienteErr) throw clienteErr;

      /* ── 3b. Inserir pedido ── */
      const precoUnitario = extrairPreco(prod.p);
      const valorTotal    = qty * precoUnitario;
      const { data: pedido, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          cliente_id:    cliente.id,
          fornada_id:    prod.tipo !== "bolo" ? selFornada.id   : null,
          data_agendada: prod.tipo !== "bolo" ? selFornada.data : selFornada, // selFornada é string de data para bolos
          status:        "pendente",
          valor_total:   valorTotal || null,
        })
        .select("id")
        .single();
      if (pedidoErr) throw pedidoErr;

      /* ── 3c. Inserir item do pedido ── */
      const produtoCategoria =
        prod.tipo === "pao"      ? "Pão"     :
        prod.tipo === "biscoito" ? "Biscoito" : "Bolo";

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

      /* ── 3d. Sucesso: WhatsApp + refresh fornadas ── */
      const dtLabel = prod.tipo === "bolo"
        ? (typeof selFornada === "string" ? selFornada : "a confirmar")
        : selFornada.label;

      const telFormatado = form.telefone.replace(/\D/g, "");
      const msg = prod.tipo === "bolo"
        ? `Olá DosAnjos! 🎂 Gostaria de encomendar *${qty}x ${prod.n}* para *${dtLabel}*.\n\nNome: *${form.nome}*\nWhatsApp: *${telFormatado}*\nEndereço: *${form.endereco}*`
        : prod.tipo === "pao"
        ? `Olá DosAnjos! 🍞 Gostaria de garantir vaga para *${qty}x ${prod.n}* — fornada de *${dtLabel}*.\n\nNome: *${form.nome}*\nWhatsApp: *${telFormatado}*\nEndereço: *${form.endereco}*`
        : `Olá DosAnjos! 🍪 Gostaria de reservar *${qty} pacote(s) de ${prod.n}* — fornada de *${dtLabel}*.\n\nNome: *${form.nome}*\nWhatsApp: *${telFormatado}*\nEndereço: *${form.endereco}*`;

      window.open(`https://api.whatsapp.com/send?phone=${WA_NUM}&text=${encodeURIComponent(msg)}`, "_blank");

      // Re-fetch da view para exibir ocupação atualizada para todos
      await fetchFornadas();
      setSucc(true);

    } catch (e) {
      console.error("[DosAnjos] checkout error:", e);
      setErr("Ocorreu um erro ao registrar seu pedido. Por favor, tente novamente ou fale diretamente pelo WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ADMIN — updateFornada (persiste no Supabase)
  ═══════════════════════════════════════════════════════════════ */
  async function updateFornada(id, patch) {
    // Atualização otimista local
    setFornadas(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
    // Persiste no banco — apenas campos da tabela fornadas (não da view)
    const camposTabela = {};
    if ("ativa"               in patch) camposTabela.ativa               = patch.ativa;
    if ("capacidade_pao"      in patch) camposTabela.capacidade_pao      = patch.capacidade_pao;
    if ("capacidade_biscoito" in patch) camposTabela.capacidade_biscoito = patch.capacidade_biscoito;
    if (Object.keys(camposTabela).length > 0) {
      const { error } = await supabase
        .from("fornadas")
        .update(camposTabela)
        .eq("id", id);
      if (error) {
        console.error("[DosAnjos] updateFornada:", error.message);
        // Rollback: re-fetch para sincronizar
        fetchFornadas();
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ADMIN — addFornada (insere no Supabase)
  ═══════════════════════════════════════════════════════════════ */
  async function addFornada() {
    if (!newFornada.data) return;
    const { error } = await supabase
      .from("fornadas")
      .insert({
        data:                 newFornada.data,
        capacidade_pao:       newFornada.cap_pao,
        capacidade_biscoito:  newFornada.cap_biscoito,
        observacao:           newFornada.obs || "Forno a lenha tradicional",
        ativa:                true,
      });
    if (!error) {
      setNewFornada({ data:"", obs:"", cap_pao:5, cap_biscoito:6 });
      await fetchFornadas(); // re-lê a view com a nova fornada
    } else {
      console.error("[DosAnjos] addFornada:", error.message);
      alert(error.code === "23505"
        ? "Já existe uma fornada nesta data."
        : "Erro ao criar fornada. Tente novamente.");
    }
  }

  /* ─── chart data (derivado das fornadas ativas) ─── */
  const chartData = fornadasAtivas.map(f => ({
    name:        f.label,
    pao_ocupado: f.pao_ocupado,
    pao_livre:   vagasPao(f),
    bisc_ocupado:f.biscoito_ocupado,
    bisc_livre:  vagasBiscoito(f),
  }));

  const CATS = ["Bolos","Pães","Biscoitos"];
  const catMeta = {
    Bolos:     { ico:"🎂", sub:"Encomenda mínima com 24h" },
    Pães:      { ico:"🍞", sub:`${fornadasComVagaPao.length} fornada(s) com vaga` },
    Biscoitos: { ico:"⭕", sub:`${fornadasComVagaBiscoito.length} fornada(s) com vaga` },
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>

      {/* ──────────────── VISTA PÚBLICA ──────────────── */}
      <div style={{ minHeight:"100vh" }}>

        <header className="hdr">
          <div className="hdr-fg" />
          <div className="hdr-in">
            <div className="logo">Dos<em>Anjos</em></div>
            <div className="tagline">Tradição Mineira · Forno a Lenha</div>
            <div className="hdr-orn"><span>✦ SÃO SEBASTIÃO · LITORAL NORTE · SP ✦</span></div>
            <div className="hdr-pill">📍 São Sebastião, SP</div>
          </div>
          <button className="adm-btn" onClick={() => setAdminOpen(true)}>⚙ Artesã</button>
        </header>

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
            {/* ── Carrossel de fornadas ── */}
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
                  Nenhuma fornada agendada no momento. Volte em breve!
                </div>
              )}
            </div>

            {/* ── Catálogo ── */}
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
                      const fornsFree = prod.tipo === "pao" ? fornadasComVagaPao
                                      : prod.tipo === "biscoito" ? fornadasComVagaBiscoito : [];
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

                            {/* Mini-tabela de vagas por fornada */}
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
                                    const occ   = prod.tipo==="pao" ? f.pao_ocupado    : f.biscoito_ocupado;
                                    const pct   = cap ? (occ/cap)*100 : 100;
                                    const esg   = vagas === 0;
                                    const st    = statusLabel(pct);
                                    return (
                                      <div key={f.id} className={`fstock-row${esg?" esgotado":""}`}>
                                        <span className="fstock-dt">{f.label}</span>
                                        <div className="fstock-bar-wrap">
                                          <div className="fstock-bar" style={{ width:`${pct}%`, background:pct>=100?"#C03030":pct>=75?"#D07030":"var(--pr)" }} />
                                        </div>
                                        <span className="fstock-count">{vagas}/{cap} livres</span>
                                        <span className="fstock-badge" style={{ background:st.bg, color:st.cor, border:`1px solid ${st.cor}40` }}>
                                          {esg?"Lotado":vagas===1?"1 vaga":`${vagas} vagas`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Qty */}
                            <div className="qty-row">
                              <span className="qty-lbl">Quantidade:</span>
                              <div className="qty-ctrl">
                                <button className="qty-btn" onClick={() => setQty(prod.id, getQty(prod.id)-1)}>−</button>
                                <input type="number" className="qty-num" min={1} value={getQty(prod.id)}
                                  onChange={e => setQty(prod.id, parseInt(e.target.value)||1)} />
                                <button className="qty-btn" onClick={() => setQty(prod.id, getQty(prod.id)+1)}>+</button>
                              </div>
                            </div>

                            <button className={`cta ${cls}`}
                              onClick={() => waitlist ? handleWaitlist(prod) : can ? openModal(prod) : handleWaitlist(prod)}>
                              {txt}
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
          <div className="ft-logo">🔥 DosAnjos</div>
          <div className="ft-txt">São Sebastião · Litoral Norte de São Paulo<br />Tradição Mineira · Forno a Lenha · Feito com Amor</div>
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
            ) : (
              <>
                <div className="mtitle">Confirmar Pedido</div>
                <div className="mprod">
                  <span className="mprod-e">{modal.prod.e}</span>
                  <div>
                    <div className="mprod-nm">{modal.prod.n}</div>
                    <div className="mprod-p">{modal.prod.p} · {getQty(modal.prod.id)} un.</div>
                  </div>
                </div>

                {/* Seletor de fornada (pão e biscoito) */}
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

                {/* Nome */}
                <div className="mfield">
                  <label className="mlbl">Seu nome *</label>
                  <input className="minput" placeholder="Ex: Maria Silva"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} />
                </div>

                {/* WhatsApp — com autopreenchimento no onBlur */}
                <div className="mfield">
                  <label className="mlbl">
                    WhatsApp (com DDD) *
                    {loadingCliente && (
                      <span className="spin" style={{ marginLeft:6, fontSize:".75rem" }}>⏳</span>
                    )}
                    {!loadingCliente && form.nome && form.endereco && (
                      <span style={{ marginLeft:6, fontSize:".72rem", color:"#3A7A3A", fontWeight:400 }}>
                        ✓ dados preenchidos automaticamente
                      </span>
                    )}
                  </label>
                  <input className="minput" placeholder="(12) 99999-9999"
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone:e.target.value }))}
                    onBlur={async e => {
                      const cliente = await buscarClientePorTelefone(e.target.value);
                      if (cliente) {
                        setForm(f => ({
                          ...f,
                          // Não sobrescreve se o usuário já digitou algo manualmente
                          nome:     f.nome.trim()     ? f.nome     : cliente.nome,
                          endereco: f.endereco.trim() ? f.endereco : cliente.endereco,
                        }));
                      }
                    }}
                  />
                </div>

                {/* Endereço — obrigatório na v3 */}
                <div className="mfield">
                  <label className="mlbl">Endereço completo para entrega *</label>
                  <input className="minput" placeholder="Rua, número, bairro"
                    value={form.endereco}
                    onChange={e => setForm(f => ({ ...f, endereco:e.target.value }))} />
                </div>

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
      {adminOpen && (
        <div className="adm-ov">
          <div className="adm-hdr">
            <button className="adm-back"
              onClick={() => { setAdminOpen(false); setAdminAuth(false); setPinInput(""); }}>
              ← Voltar
            </button>
            <span className="adm-htitle">⚙️ Painel da Artesã — DosAnjos</span>
          </div>

          {!adminAuth ? (
            <div className="adm-body">
              <div className="pin-wrap">
                <div className="pin-ico">🔐</div>
                <div className="pin-t">Acesso Restrito</div>
                <div className="pin-s">Gestão de fornadas e capacidade de produção.</div>
                <input className="pin-inp" type="password" maxLength={4} placeholder="••••"
                  value={pinInput} onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter") pinInput===ADMIN_PIN ? setAdminAuth(true) : alert("PIN incorreto."); }} />
                <button className="pin-btn"
                  onClick={() => pinInput===ADMIN_PIN ? setAdminAuth(true) : alert("PIN incorreto.")}>
                  Entrar →
                </button>
              </div>
            </div>
          ) : (
            <div className="adm-body">

              {/* KPIs */}
              <div className="kpi-grid">
                <div className="kpi">
                  <div className="kpi-val">{fornadasAtivas.length}</div>
                  <div className="kpi-lbl">Fornadas ativas</div>
                </div>
                <div className="kpi">
                  <div className="kpi-val">{fornadasAtivas.reduce((a,f)=>a+f.pao_ocupado,0)}</div>
                  <div className="kpi-lbl">Pães em fila</div>
                </div>
                <div className="kpi">
                  <div className="kpi-val">{fornadasAtivas.reduce((a,f)=>a+f.biscoito_ocupado,0)}</div>
                  <div className="kpi-lbl">Biscoitos em fila</div>
                </div>
                <div className="kpi">
                  <div className="kpi-val" style={{ color:"#3A7A3A" }}>
                    {pedidosReais.filter(p=>p.status==="confirmado").length}
                  </div>
                  <div className="kpi-lbl">Confirmados</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="atabs">
                {[["fornadas","🔥 Fornadas"],["pedidos","📋 Pedidos"],["grafico","📊 Gráfico"]].map(([k,l]) => (
                  <button key={k} className={`atab ${adminTab===k?"on":""}`} onClick={() => setAdminTab(k)}>{l}</button>
                ))}
              </div>

              {/* ── TAB: FORNADAS ── */}
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
                          <button
                            className={`afcard-toggle ${f.ativa?"on":"off"}`}
                            onClick={() => updateFornada(f.id, { ativa: !f.ativa })}>
                            {f.ativa ? "✓ Ativa" : "✗ Inativa"}
                          </button>
                        </div>

                        <div className="cap-grid">
                          {[
                            { lbl:"🍞 Capacidade Pão",      field:"capacidade_pao",      occ:f.pao_ocupado      },
                            { lbl:"⭕ Capacidade Biscoito", field:"capacidade_biscoito", occ:f.biscoito_ocupado },
                          ].map(({ lbl, field, occ }) => (
                            <div key={field} className="capbox">
                              <div className="capbox-lbl">{lbl}</div>
                              <div className="capbox-ctrl">
                                <button className="cadj"
                                  onClick={() => updateFornada(f.id, { [field]: Math.max(occ, f[field]-1) })}>−</button>
                                <span className="capbox-num">{f[field]}</span>
                                <button className="cadj"
                                  onClick={() => updateFornada(f.id, { [field]: f[field]+1 })}>+</button>
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
                            {/* Nota: ocupação calculada pela view — os botões são apenas visual */}
                            <button className="occ-adj" title="Ajuste manual na view do Supabase"
                              onClick={() => {}}>−</button>
                            <button className="occ-adj" title="Ajuste manual na view do Supabase"
                              onClick={() => {}}>+</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div className="add-form">
                    <div className="add-form-t">➕ Adicionar Nova Fornada</div>
                    <div className="add-grid">
                      <div>
                        <label className="add-lbl">Data</label>
                        <input type="date" className="add-inp" value={newFornada.data}
                          onChange={e => setNewFornada(n => ({ ...n, data:e.target.value }))} />
                      </div>
                      <div>
                        <label className="add-lbl">Observação</label>
                        <input className="add-inp" placeholder="Ex: Especial de Páscoa"
                          value={newFornada.obs}
                          onChange={e => setNewFornada(n => ({ ...n, obs:e.target.value }))} />
                      </div>
                      <div>
                        <label className="add-lbl">Cap. Pão</label>
                        <input type="number" className="add-inp" min={0} value={newFornada.cap_pao}
                          onChange={e => setNewFornada(n => ({ ...n, cap_pao:parseInt(e.target.value)||0 }))} />
                      </div>
                      <div>
                        <label className="add-lbl">Cap. Biscoito</label>
                        <input type="number" className="add-inp" min={0} value={newFornada.cap_biscoito}
                          onChange={e => setNewFornada(n => ({ ...n, cap_biscoito:parseInt(e.target.value)||0 }))} />
                      </div>
                    </div>
                    <button className="add-btn" onClick={addFornada}>🔥 Adicionar Fornada</button>
                  </div>
                </>
              )}

              {/* ── TAB: PEDIDOS ── */}
              {adminTab === "pedidos" && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <span style={{ fontSize:".8rem", color:"var(--mu)" }}>
                      {pedidosReais.length} pedido(s) carregado(s)
                    </span>
                    <button className="adm-refresh" onClick={fetchPedidos} disabled={loadPedidos}>
                      {loadPedidos ? <><span className="spin">⏳</span> Carregando...</> : "↻ Atualizar"}
                    </button>
                  </div>

                  {loadPedidos && (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"var(--mu)", fontSize:".82rem" }}>
                      <span className="spin">🔥</span> Buscando pedidos...
                    </div>
                  )}

                  {!loadPedidos && pedidosReais.length === 0 && (
                    <div style={{ textAlign:"center", color:"var(--mu)", padding:"32px 0" }}>
                      Nenhum pedido encontrado.
                    </div>
                  )}

                  {pedidosReais.map(pedido => {
                    const itens    = pedido.itens_pedido ?? [];
                    const cliente  = pedido.clientes;
                    const fornada  = pedido.fornadas;
                    const itemDesc = itens.map(i => `${i.quantidade}× ${i.nome_produto}`).join(", ");
                    const dtExib   = fornada?.data
                      ? new Date(fornada.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})
                      : pedido.data_agendada ?? "—";
                    const eCat = itens[0]?.produto === "Pão" ? "🍞"
                               : itens[0]?.produto === "Biscoito" ? "⭕" : "🍯";
                    return (
                      <div key={pedido.id} className="porder">
                        <span className="porder-e">{eCat}</span>
                        <div className="porder-info">
                          <div className="porder-nm">
                            {cliente?.nome ?? "—"} · {itemDesc || "sem itens"}
                          </div>
                          <div className="porder-meta">
                            📅 {dtExib}
                            {cliente?.telefone && ` · 📞 ${cliente.telefone}`}
                            {pedido.valor_total && ` · R$ ${Number(pedido.valor_total).toFixed(2)}`}
                          </div>
                        </div>
                        <span className={`badge ${pedido.status==="confirmado"?"bc":"bp"}`}>
                          {pedido.status==="confirmado" ? "✓ Confirmado" : "⏳ Pendente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── TAB: GRÁFICO ── */}
              {adminTab === "grafico" && (
                <div style={{ background:"var(--srf)", border:"1px solid var(--bdl)", borderRadius:"var(--radd)", padding:18, marginBottom:20 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", color:"var(--pr)", marginBottom:14 }}>
                    📊 Vagas por Fornada e Produto
                  </div>
                  <div className="rchart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5CDB8" />
                        <XAxis dataKey="name" tick={{ fontSize:11, fill:"#7A5440" }} />
                        <YAxis tick={{ fontSize:11, fill:"#7A5440" }} />
                        <Tooltip
                          contentStyle={{ background:"#FFFCF8", border:"1px solid #E5CDB8", borderRadius:10, fontSize:12 }}
                          labelStyle={{ color:"#6B2B2B", fontWeight:700 }}
                        />
                        <Bar dataKey="pao_ocupado"  name="Pão Ocupado"      stackId="p" fill="#8B3A3A" radius={[0,0,0,0]} />
                        <Bar dataKey="pao_livre"    name="Pão Livre"        stackId="p" fill="#E5CDB8" radius={[5,5,0,0]} />
                        <Bar dataKey="bisc_ocupado" name="Biscoito Ocupado" stackId="b" fill="#C49A6C" radius={[0,0,0,0]} />
                        <Bar dataKey="bisc_livre"   name="Biscoito Livre"   stackId="b" fill="#F0DDD0" radius={[5,5,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize:".73rem", color:"var(--mu)", textAlign:"center", marginTop:10 }}>
                    Dados em tempo real — atualizados ao abrir o painel.
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </>
  );
}
