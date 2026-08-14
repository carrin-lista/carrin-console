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

    // 1. Identificar o usuário que fez a requisição
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

    // 2. Trava de Segurança: Apenas o Dono pode assinar
    const { data: memberData } = await supabaseAdmin
      .from('home_members')
      .select('role')
      .eq('home_id', home_id)
      .eq('user_id', user.id)
      .single();

    if (!memberData || memberData.role !== 'owner') {
      throw new Error('Apenas o Dono da Casa pode gerenciar a assinatura.');
    }

    // 3. Verifica se já existe uma assinatura vigente
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('home_id', home_id)
      .eq('is_current', true)
      .single();

    if (existingSub) {
      throw new Error('Esta Casa já possui uma assinatura vigente.');
    }

    // 4. Integração Asaas: Criar Cliente (Customer)
    const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify({
        name: user.user_metadata?.full_name || 'Usuário Carrin',
        email: user.email,
        externalReference: user.id // Guarda o ID do Supabase no Asaas para auditoria
      })
    });
    
    const customerData = await customerResponse.json();
    if (!customerResponse.ok) throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(customerData)}`);

    // 5. Integração Asaas: Criar Assinatura (Subscription)
    const subscriptionResponse = await fetch('https://sandbox.asaas.com/api/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify({
        customer: customerData.id,
        billingType: 'UNDEFINED', // Permite Cartão, Pix ou Boleto no Sandbox
        value: 19.00, // Plano STANDARD padrão
        nextDueDate: new Date().toISOString().split('T')[0], // Vence hoje
        cycle: 'MONTHLY',
        description: 'Assinatura Plano Carrin'
      })
    });

    const subAsaasData = await subscriptionResponse.json();
    if (!subscriptionResponse.ok) throw new Error(`Erro ao criar assinatura no Asaas: ${JSON.stringify(subAsaasData)}`);

    // 6. Persistir no Banco de Dados (Grava a Assinatura localmente)
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        home_id: home_id,
        plan_type: 'standard',
        price: 19.00,
        status: 'PENDING',
        is_current: true,
        gateway_sub_id: subAsaasData.id,
        gateway_customer_id: customerData.id
      });

    if (insertError) throw new Error('Erro ao salvar assinatura no banco local.');

    // Sucesso! Retorna os dados para o frontend (incluindo o link de pagamento gerado pelo Asaas)
    return new Response(JSON.stringify({ 
      success: true, 
      subscription_id: subAsaasData.id,
      payment_url: subAsaasData.invoiceUrl || '' // Link para o usuário pagar o Pix/Cartão
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