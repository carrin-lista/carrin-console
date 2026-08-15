import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('MY_SUPABASE_URL') ?? '',
    Deno.env.get('MY_SERVICE_ROLE_KEY') ?? ''
  )

  const publicVapidKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const privateVapidKey = Deno.env.get('VAPID_PRIVATE_KEY')!

  webpush.setVapidDetails('mailto:suporte@carrin.app', publicVapidKey, privateVapidKey)

  try {
    // 1. Validação do Administrador Logado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta o header de autorização.')

    const supabaseAnon = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado.')

    const { data: adminData } = await supabaseAdmin
      .from('console_admins')
      .select('id, status, profile')
      .eq('id', user.id)
      .single()

    if (!adminData || adminData.status !== 'active') {
      throw new Error('Acesso negado: Administrador inativo ou sem permissão.')
    }

    // 2. Leitura e validação do Payload
    const body = await req.json()
    const { audience, title, message, type = 'info', target_url = '/', client_request_id } = body

    if (!audience || !audience.type || !title || !message) {
      throw new Error('Payload inválido: público, título e mensagem são obrigatórios.')
    }

    // 3. Verificação de Idempotência por client_request_id
    if (client_request_id) {
      const { data: existingDispatch } = await supabaseAdmin
        .from('push_dispatches')
        .select('*')
        .eq('client_request_id', client_request_id)
        .maybeSingle()

      if (existingDispatch) {
        return new Response(JSON.stringify({ success: true, dispatch: existingDispatch, idempotent_hit: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // 4. Resolução de Público e Coleta de Inscrições (Subscriptions)
    let targetUserIds: string[] = []
    let audienceUserId: string | null = null
    let audienceHomeId: string | null = null

    if (audience.type === 'user') {
      if (!audience.user_id) throw new Error('user_id é obrigatório para o público user.')
      audienceUserId = audience.user_id
      targetUserIds = [audience.user_id]
    } 
    else if (audience.type === 'home') {
      if (!audience.home_id) throw new Error('home_id é obrigatório para o público home.')
      audienceHomeId = audience.home_id
      
      const { data: members } = await supabaseAdmin
        .from('home_members')
        .select('user_id')
        .eq('home_id', audience.home_id)
      
      targetUserIds = (members || []).map((m: any) => m.user_id)
    } 
    else if (audience.type === 'all') {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
      
      targetUserIds = (users || []).map((u: any) => u.id)
    } 
    else {
      throw new Error('Tipo de público desconhecido.')
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: 'EMPTY_AUDIENCE',
        message: 'Nenhum usuário encontrado para este público.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // Buscar todas as subscriptions ativas para os usuários alvos
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: 'NO_SUBSCRIPTIONS',
        targeted_users: targetUserIds.length,
        subscriptions_found: 0,
        sent: 0,
        failed: 0,
        pruned: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // 5. Deduplicação de endpoints
    const uniqueMap = new Map()
    subscriptions.forEach((sub: any) => {
      if (!uniqueMap.has(sub.endpoint)) {
        uniqueMap.set(sub.endpoint, sub)
      }
    })
    const uniqueSubscriptions = Array.from(uniqueMap.values())

    // 6. Criar Registro Inicial do Disparo (Status: processing)
    const { data: dispatchRecord, error: dispatchError } = await supabaseAdmin
      .from('push_dispatches')
      .insert({
        created_by: adminData.id,
        audience_type: audience.type,
        audience_user_id: audienceUserId,
        audience_home_id: audienceHomeId,
        title,
        message,
        type,
        target_url,
        status: 'processing',
        targeted_users: targetUserIds.length,
        subscriptions_found: uniqueSubscriptions.length,
        client_request_id: client_request_id || null
      })
      .select()
      .single()

    if (dispatchError || !dispatchRecord) {
      throw new Error('Erro ao registrar o disparo na base de dados.')
    }

    const dispatchId = dispatchRecord.id

    // 7. Processamento dos Disparos em Batches com Promise.allSettled
    const pushPayload = JSON.stringify({ title, body: message, url: target_url })
    const batchSize = 50
    let totalSent = 0
    let totalFailed = 0
    let totalPruned = 0

    // Mapeamento por usuário para consolidar recibos em push_dispatch_recipients
    const userStats: Record<string, { found: number, sent: number, failed: number, pruned: number, lastError?: string }> = {}
    targetUserIds.forEach(uid => { userStats[uid] = { found: 0, sent: 0, failed: 0, pruned: 0 } })

    subscriptions.forEach((sub: any) => {
      if (userStats[sub.user_id]) {
        userStats[sub.user_id].found++
      }
    })

    for (let i = 0; i < uniqueSubscriptions.length; i += batchSize) {
      const batch = uniqueSubscriptions.slice(i, i + batchSize)

      const promises = batch.map(async (sub: any) => {
        const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }
        try {
          await webpush.sendNotification(pushSub, pushPayload)
          totalSent++
          if (userStats[sub.user_id]) userStats[sub.user_id].sent++
        } catch (err: any) {
          totalFailed++
          if (userStats[sub.user_id]) {
            userStats[sub.user_id].failed++
            userStats[sub.user_id].lastError = String(err.statusCode || err.code || 'UNKNOWN')
          }
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
            totalPruned++
            if (userStats[sub.user_id]) userStats[sub.user_id].pruned++
          }
        }
      })

      await Promise.allSettled(promises)
    }

    // 8. Determinar Status Final do Disparo
    let finalStatus = 'sent'
    if (totalSent === 0 && totalFailed > 0) {
      finalStatus = 'failed'
    } else if (totalFailed > 0) {
      finalStatus = 'partial'
    }

    // Atualizar tabela principal de disparos
    await supabaseAdmin
      .from('push_dispatches')
      .update({
        status: finalStatus,
        sent: totalSent,
        failed: totalFailed,
        pruned: totalPruned,
        completed_at: new Date().toISOString()
      })
      .eq('id', dispatchId)

    // 9. Inserir Recibos por Destinatário (push_dispatch_recipients)
    const recipientRows = Object.entries(userStats)
      .filter(([_, stats]) => stats.found > 0)
      .map(([uid, stats]) => ({
        dispatch_id: dispatchId,
        user_id: uid,
        subscriptions_found: stats.found,
        sent: stats.sent,
        failed: stats.failed,
        pruned: stats.pruned,
        status: stats.sent > 0 && stats.failed === 0 ? 'sent' : (stats.sent > 0 ? 'partial' : 'failed'),
        last_error_code: stats.lastError || null
      }))

    if (recipientRows.length > 0) {
      await supabaseAdmin.from('push_dispatch_recipients').insert(recipientRows)
    }

    // 10. Registrar Auditoria de Segurança no Backend (`console_audit_logs`)[cite: 3]
    await supabaseAdmin.from('console_audit_logs').insert({
      admin_id: adminData.id,
      action: 'push.dispatched',
      entity_type: 'push_dispatches',
      entity_id: dispatchId,
      metadata: {
        audience_type: audience.type,
        targeted_users: targetUserIds.length,
        subscriptions_found: uniqueSubscriptions.length,
        sent: totalSent,
        failed: totalFailed,
        pruned: totalPruned,
        status: finalStatus
      }
    })

    return new Response(JSON.stringify({
      success: true,
      dispatch_id: dispatchId,
      status: finalStatus,
      targeted_users: targetUserIds.length,
      subscriptions_found: uniqueSubscriptions.length,
      sent: totalSent,
      failed: totalFailed,
      pruned: totalPruned
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})