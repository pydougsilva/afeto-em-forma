// ============================================================
//  AFETO EM FORMA - Edge Function: fn-provision-tenant
//  Fase 3: Onboarding Multi-Tenant
//
//  Recebe o formulario publico, usa service_role apenas no backend,
//  chama a RPC fn_provision_tenant e retorna os dados do novo tenant.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Metodo nao permitido." }, 405);
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalido: esperado JSON." }, 400);
  }

  const { slug, nome, email, password, whatsapp, cidade, estado, plano } = body;

  if (!slug || slug.length < 3) {
    return json({ error: "Slug invalido: minimo 3 caracteres." }, 422);
  }
  if (!nome?.trim()) {
    return json({ error: "Nome do negocio e obrigatorio." }, 422);
  }
  if (!email?.includes("@")) {
    return json({ error: "E-mail invalido." }, 422);
  }
  if (!password || password.length < 6) {
    return json({ error: "Senha invalida: minimo 6 caracteres." }, 422);
  }
  if (plano && !["free", "pro", "enterprise"].includes(plano)) {
    return json({ error: "Plano invalido." }, 422);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSlug = slug.trim().toLowerCase();
  let adminUserId: string | null = null;

  const { data: adminUser, error: userErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      nome: nome.trim(),
      telefone: whatsapp?.replace(/\D/g, "") || "",
      tenant_slug: normalizedSlug,
    },
  });

  if (userErr || !adminUser.user) {
    const msg = userErr?.message ?? "Erro ao criar usuario administrador.";
    const statusCode =
      msg.includes("already") || msg.includes("registered") || msg.includes("User exists") ? 409 :
      msg.includes("Password") || msg.includes("password") ? 422 :
      500;
    return json({ error: msg }, statusCode);
  }

  adminUserId = adminUser.user.id;

  const { data: tenantId, error } = await supabase.rpc("fn_provision_tenant", {
    p_slug: normalizedSlug,
    p_nome: nome.trim(),
    p_email_admin: normalizedEmail,
    p_whatsapp_num: whatsapp?.replace(/\D/g, "") || null,
    p_cidade: cidade?.trim() || null,
    p_estado: estado?.trim().toUpperCase() || "SP",
    p_plano: plano || "free",
  });

  if (error) {
    if (adminUserId) {
      await supabase.auth.admin.deleteUser(adminUserId);
    }
    const msg = error.message ?? "";
    const statusCode =
      msg.includes("Slug ja esta em uso") || msg.includes("E-mail ja cadastrado") ? 409 :
      msg.includes("Slug muito curto") || msg.includes("Nome do negocio") ? 422 :
      500;

    return json({ error: msg || "Erro interno ao criar tenant." }, statusCode);
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({
      id: adminUserId,
      nome: nome.trim(),
      telefone: whatsapp?.replace(/\D/g, "") || "",
      endereco: "",
      role: "admin",
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (profileErr) {
    console.error("[fn-provision-tenant] profile admin:", profileErr.message);
  }

  return json({
    success: true,
    tenant_id: tenantId,
    slug: normalizedSlug,
    admin_email: normalizedEmail,
    admin_user_id: adminUserId,
    plano: plano || "free",
    trial_ends: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    message: `Negocio "${nome}" criado com sucesso. URL: afetoemforma.com/${normalizedSlug}`,
  }, 201);
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
