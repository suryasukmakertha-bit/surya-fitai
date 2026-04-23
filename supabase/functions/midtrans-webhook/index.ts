// Midtrans Payment Notification Webhook
// Register this URL in Midtrans Dashboard → Settings → Configuration → Payment Notification URL:
// https://hrxqvheudexwswmlqbgw.supabase.co/functions/v1/midtrans-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()
    const { order_id, transaction_status, fraud_status, transaction_id, payment_type } = body

    // Verify signature
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')!
    const signatureString = body.order_id + body.status_code + body.gross_amount + serverKey
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureString)
    const hashBuffer = await crypto.subtle.digest('SHA-512', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (expectedSignature !== body.signature_key) {
      console.warn('[midtrans-webhook] Invalid signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find transaction
    const { data: tx } = await supabase
      .from('payment_transactions')
      .select('id, subscription_id, status')
      .eq('midtrans_order_id', order_id)
      .maybeSingle()

    if (!tx) {
      console.log('[midtrans-webhook] Order not found in DB (possibly a Midtrans test):', order_id)
      return new Response(JSON.stringify({ received: true, note: 'Order not found, skipped' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (tx.status === 'paid') return new Response(JSON.stringify({ received: true }), { status: 200 })

    const isSuccess =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement'

    const isFailed =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'

    if (isSuccess) {
      // Update transaction
      await supabase.from('payment_transactions').update({
        status: 'paid',
        midtrans_transaction_id: transaction_id,
        payment_type,
      }).eq('id', tx.id)

      // Activate subscription 30 days
      const subEnd = new Date()
      subEnd.setDate(subEnd.getDate() + 30)
      const subStart = new Date()
      await supabase.from('subscriptions').update({
        status: 'active',
        subscription_start: subStart.toISOString(),
        subscription_end: subEnd.toISOString(),
      }).eq('id', tx.subscription_id)

      // Reset generate counter for the new billing period.
      // Look up the user_id from the activated subscription, then reset profiles counters.
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', tx.subscription_id)
        .maybeSingle()
      if (subRow?.user_id) {
        await supabase.from('profiles').update({
          period_generate_count: 0,
          last_generate_reset: subStart.toISOString().slice(0, 10),
        }).eq('user_id', subRow.user_id)
      }

      console.log(`[midtrans-webhook] ✅ Activated subscription ${tx.subscription_id}`)
    }

    if (isFailed) {
      await supabase.from('payment_transactions').update({ status: 'failed' }).eq('id', tx.id)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error('[midtrans-webhook]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
