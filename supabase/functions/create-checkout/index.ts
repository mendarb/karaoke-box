import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { format } from "https://esm.sh/date-fns@2.30.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Received checkout request');
    const { data } = await req.json();
    
    console.log('🔧 Processing checkout with data:', {
      bookingId: data.bookingId,
      email: data.userEmail,
      isTestMode: data.isTestMode
    });

    const formattedDate = format(new Date(data.date), 'yyyy-MM-dd');
    console.log('📅 Formatted date:', formattedDate);

    const stripeKey = data.isTestMode 
      ? Deno.env.get('STRIPE_TEST_SECRET_KEY')
      : Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      console.error('❌ Missing Stripe API key');
      throw new Error(`${data.isTestMode ? 'Test' : 'Live'} mode Stripe API key not configured`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log('💳 Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: data.isTestMode ? '[TEST MODE] Karaoké BOX - MB EI' : 'Karaoké BOX - MB EI',
              description: `${data.groupSize} personnes - ${data.duration}h`,
              images: ['https://raw.githubusercontent.com/lovable-karaoke/assets/main/logo.png'],
            },
            unit_amount: Math.round(data.finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${data.bookingId}`,
      cancel_url: `${req.headers.get('origin')}/error?error=payment_cancelled`,
      customer_email: data.userEmail,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expire après 30 minutes
      metadata: {
        bookingId: data.bookingId,
        date: formattedDate,
        timeSlot: data.timeSlot,
        duration: data.duration,
        groupSize: data.groupSize,
        isTestMode: String(data.isTestMode),
        userName: data.userName,
        userPhone: data.userPhone,
        promoCodeId: data.promoCodeId || '',
        originalPrice: String(data.price),
        finalPrice: String(data.finalPrice),
      }
    });

    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      mode: data.isTestMode ? 'TEST' : 'LIVE',
      url: session.url
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in checkout process:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});