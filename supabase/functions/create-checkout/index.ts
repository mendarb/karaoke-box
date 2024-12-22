import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    console.log('📦 Received booking data:', {
      bookingId: data.bookingId,
      email: data.userEmail,
      isTestMode: data.isTestMode,
      price: data.finalPrice,
    });

    const requiredFields = [
      'userEmail',
      'date',
      'timeSlot',
      'duration',
      'groupSize',
      'finalPrice',
      'bookingId',
      'isTestMode'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          receivedData: data 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Ensure isTestMode is a boolean and log it
    const isTestMode = Boolean(data.isTestMode);
    console.log('🔧 Payment mode configuration:', {
      rawValue: data.isTestMode,
      parsedValue: isTestMode,
      mode: isTestMode ? 'TEST' : 'LIVE'
    });

    // Get the appropriate Stripe key based on mode
    const stripeKey = isTestMode 
      ? Deno.env.get('STRIPE_TEST_SECRET_KEY') 
      : Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      const mode = isTestMode ? 'test' : 'live';
      console.error(`❌ Stripe ${mode} mode API key not found`);
      throw new Error(`Stripe ${mode} mode API key not configured`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Format price description
    let priceDescription = `${data.groupSize} personnes - ${data.duration}h`;
    if (data.promoCode) {
      priceDescription += ` (Code: ${data.promoCode})`;
    }

    console.log('💰 Creating Stripe session with amount:', Math.round(data.finalPrice * 100));

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(data.finalPrice * 100),
          product_data: {
            name: isTestMode ? '[TEST MODE] Karaoké BOX - MB EI' : 'Karaoké BOX - MB EI',
            description: priceDescription,
            images: ['https://raw.githubusercontent.com/lovable-karaoke/assets/main/logo.png'],
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}`,
      customer_email: data.userEmail,
      metadata: {
        bookingId: data.bookingId,
        date: data.date,
        timeSlot: data.timeSlot,
        duration: data.duration,
        groupSize: data.groupSize,
        userId: data.userId || '',
        isTestMode: String(isTestMode),
        originalPrice: String(data.price),
        finalPrice: String(data.finalPrice),
        promoCodeId: data.promoCodeId || '',
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Session expires in 30 minutes
    };

    console.log('✨ Creating checkout session with config:', {
      mode: isTestMode ? 'TEST' : 'LIVE',
      amount: sessionConfig.line_items[0].price_data.unit_amount,
      email: data.userEmail,
      bookingId: data.bookingId,
      isTestMode: isTestMode
    });

    try {
      const session = await stripe.checkout.sessions.create(sessionConfig);
      console.log('✅ Checkout session created:', {
        sessionId: session.id,
        mode: isTestMode ? 'TEST' : 'LIVE',
        url: session.url,
        isTestMode: isTestMode
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (stripeError) {
      console.error('❌ Stripe error:', {
        error: stripeError,
        mode: isTestMode ? 'TEST' : 'LIVE',
        amount: sessionConfig.line_items[0].price_data.unit_amount
      });
      throw stripeError;
    }
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});