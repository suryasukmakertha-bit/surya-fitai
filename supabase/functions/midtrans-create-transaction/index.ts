import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: sub } = await supabase.from('subscriptions').select('id').eq('user_id', user.id).maybeSingle()
    if (!sub) return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const orderId = `surya-fitai-${user.id.slice(0, 8)}-${Date.now()}`
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')!
    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const baseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const midtransRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(serverKey + ':')}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: 19900,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.full_name || 'FitAi User',
        },
        item_details: [{
          id: 'surya-fitai-pro',
          price: 19900,
          quantity: 1,
          name: 'Surya-FitAi Pro - Monthly',
        }],
        callbacks: {
          finish: `${Deno.env.get('APP_URL') || 'https://surya-fitai.com'}/payment/finish`,
        },
      }),
    })

    if (!midtransRes.ok) {
      const err = await midtransRes.json()
      console.error('[midtrans-create-transaction]', err)
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { token, redirect_url } = await midtransRes.json()

    // Save pending transaction
    await supabase.from('payment_transactions').insert({
      user_id: user.id,
      subscription_id: sub.id,
      amount: 19900,
      midtrans_order_id: orderId,
      status: 'pending',
    })

    return new Response(JSON.stringify({ token, redirect_url, order_id: orderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[midtrans-create-transaction] error:', err)
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
