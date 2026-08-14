import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const asaasWebhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET') ?? '';

    // CORREÇÃO: O Asaas envia o token no header 'asaas-access-token'
    const signature = req.headers.get('asaas-access-token');
    
    if (asaasWebhookSecret && signature !== asaasWebhookSecret) {
      console.error('Falha de autenticação do Webhook. Token recebido é inválido ou ausente.');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const eventType = payload.event;
    const eventId = payload.id || (payload.payment ? payload.payment.id : `evt_${Date.now()}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEvent } = await supabase
      .from('billing_events')
      .select('id, status')
      .eq('external_id', eventId)
      .single();

    if (existingEvent) {
      console.log(`Evento ${eventId} já processado anteriormente.`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: corsHeaders });
    }

    await supabase.from('billing_events').insert({
      external_id: eventId,
      event_type: eventType,
      payload: payload,
      status: 'PENDING'
    });

    const paymentData = payload.payment || payload.subscription || {};
    const externalSubscriptionId = paymentData.subscription;
    const externalCustomerId = paymentData.customer;

    let homeId: string | null = null;
    
    if (externalSubscriptionId || externalCustomerId) {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('home_id')
        .or(`gateway_sub_id.eq.${externalSubscriptionId},gateway_customer_id.eq.${externalCustomerId}`)
        .eq('is_current', true)
        .single();
      
      if (subData) {
        homeId = subData.home_id;
      }
    }

    if (homeId) {
      const nowIso = new Date().toISOString();

      if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
        const nextDueDate = paymentData.dueDate ? new Date(paymentData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await supabase.from('house_commercial_states').update({
            status: 'ACTIVE',
            current_period_end: nextDueDate.toISOString(),
            grace_period_ends_at: null,
            updated_at: nowIso
        }).eq('home_id', homeId);
      } else if (eventType === 'PAYMENT_OVERDUE') {
        const graceEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await supabase.from('house_commercial_states').update({
            status: 'PAST_DUE',
            grace_period_ends_at: graceEnd.toISOString(),
            updated_at: nowIso
        }).eq('home_id', homeId);
      } else if (eventType === 'SUBSCRIPTION_CANCELED') {
        await supabase.from('house_commercial_states').update({ status: 'CANCELLED', updated_at: nowIso }).eq('home_id', homeId);
      }
    }

    await supabase
      .from('billing_events')
      .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
      .eq('external_id', eventId);

    return new Response(JSON.stringify({ received: true, processed: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro crítico no Webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});