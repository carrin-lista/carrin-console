import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY') ?? '';

    // 1. Validar autenticação do administrador
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado.');
    }

    const { home_id } = await req.json();
    if (!home_id) throw new Error('O ID da Casa é obrigatório.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Buscar a assinatura ativa vinculada à Casa
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('home_id', home_id)
      .eq('is_current', true)
      .single();

    if (subError || !sub || !sub.gateway_sub_id) {
      throw new Error('Nenhuma assinatura ativa encontrada para sincronizar.');
    }

    // 3. Consultar a API do Asaas para verificar o status real
    const asaasResponse = await fetch(`https://sandbox.asaas.com/api/v3/subscriptions/${sub.gateway_sub_id}`, {
      method: 'GET',
      headers: {
        'access_token': asaasApiKey
      }
    });

    const asaasData = await asaasResponse.json();
    if (!asaasResponse.ok) {
      throw new Error(`Erro ao consultar Asaas: ${JSON.stringify(asaasData)}`);
    }

    const asaasStatus = asaasData.status; // Ex: ACTIVE, EXPIRED, etc.
    let targetCommercialStatus = 'ACTIVE';

    if (asaasStatus === 'EXPIRED' || asaasStatus === 'INACTIVE') {
      targetCommercialStatus = 'CANCELLED';
    } else if (asaasStatus === 'ACTIVE') {
      targetCommercialStatus = 'ACTIVE';
    }

    // 4. Reconciliar o estado local no banco
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from('house_commercial_states')
      .update({
        status: targetCommercialStatus,
        updated_at: nowIso
      })
      .eq('home_id', home_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sincronização concluída com sucesso.',
      asaas_status: asaasStatus,
      updated_commercial_status: targetCommercialStatus
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});