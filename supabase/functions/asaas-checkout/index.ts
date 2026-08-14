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

    // 1. Identificar o usuário
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) throw new Error('Usuário não autenticado.');

    // 2. Coletar payload seguro
    const reqBody = await req.json();
    const { home_id, offer_id, creditCard, creditCardHolderInfo } = reqBody;

    if (!home_id) throw new Error('O ID da Casa é obrigatório.');
    if (!creditCard || !creditCardHolderInfo) throw new Error('Dados do cartão de crédito ausentes.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Trava de Segurança: Apenas o Dono pode assinar
    const { data: memberData } = await supabaseAdmin
      .from('home_members')
      .select('role')
      .eq('home_id', home_id)
      .eq('user_id', user.id)
      .single();

    if (!memberData || memberData.role !== 'owner') {
      throw new Error('Apenas o Dono da Casa pode gerenciar a assinatura.');
    }

    // 4. Trava de Duplicidade
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('home_id', home_id)
      .eq('is_current', true)
      .in('status', ['ACTIVE', 'PAYMENT_REVIEW'])
      .single();

    if (existingSub) throw new Error('Esta Casa já possui uma assinatura vigente ou em processamento.');

    // 5. Configurar Valores (Standard vs Custom)
    let planPrice = 19.00;
    let planType = 'standard';
    let effectiveLimit = 5;

    if (offer_id) {
      const { data: offerData } = await supabaseAdmin
        .from('custom_offers')
        .select('*')
        .eq('id', offer_id)
        .eq('home_id', home_id)
        .eq('status', 'PENDING')
        .single();

      if (!offerData) throw new Error('Oferta inválida ou expirada.');
      planPrice = offerData.new_price;
      effectiveLimit = offerData.new_limit;
      planType = 'custom';
    }

    // 6. Asaas: Reutilizar Customer se existir, ou Criar Novo
    let customerId = null;
    const { data: pastSub } = await supabaseAdmin
      .from('subscriptions')
      .select('gateway_customer_id')
      .eq('home_id', home_id)
      .not('gateway_customer_id', 'is', null)
      .limit(1)
      .single();

    if (pastSub?.gateway_customer_id) {
      customerId = pastSub.gateway_customer_id;
    } else {
      const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify({
          name: creditCardHolderInfo.name,
          email: creditCardHolderInfo.email,
          cpfCnpj: creditCardHolderInfo.cpfCnpj,
          postalCode: creditCardHolderInfo.postalCode,
          addressNumber: creditCardHolderInfo.addressNumber,
          phone: creditCardHolderInfo.phone,
          externalReference: home_id
        })
      });
      const customerData = await customerResponse.json();
      if (!customerResponse.ok) throw new Error(`Asaas (Customer): ${customerData.errors?.[0]?.description}`);
      customerId = customerData.id;
    }

    // 7. Asaas: Criar Assinatura via Cartão de Crédito
    const subscriptionResponse = await fetch('https://sandbox.asaas.com/api/v3/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: planPrice,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: 'Assinatura Carrin App',
        externalReference: home_id,
        creditCard: creditCard,
        creditCardHolderInfo: creditCardHolderInfo
      })
    });

    const subAsaasData = await subscriptionResponse.json();
    if (!subscriptionResponse.ok) throw new Error(`Asaas (Subscription): ${subAsaasData.errors?.[0]?.description}`);

    // 8. Salvar no Banco Local
    await supabaseAdmin.from('subscriptions').update({ is_current: false }).eq('home_id', home_id);

    const { data: newSub, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        home_id: home_id,
        plan_type: planType,
        price: planPrice,
        status: 'ACTIVE',
        is_current: true,
        gateway_sub_id: subAsaasData.id,
        gateway_customer_id: customerId
      }).select('id').single();

    if (insertError) throw new Error('Erro ao salvar assinatura local.');

    await supabaseAdmin.from('house_commercial_states').upsert({
      home_id: home_id,
      status: 'PAYMENT_REVIEW',
      effective_limit: effectiveLimit,
      active_subscription_id: newSub.id,
      updated_at: new Date().toISOString()
    });

    if (offer_id) {
      await supabaseAdmin.from('custom_offers').update({ status: 'ACCEPTED' }).eq('id', offer_id);
    }

    return new Response(JSON.stringify({ success: true, message: 'Processando pagamento...' }), {
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