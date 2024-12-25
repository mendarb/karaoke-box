import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createStripeSession } from "./stripe-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('📦 Données de la requête:', {
      bookingId: requestData.bookingId,
      originalPrice: requestData.price,
      finalPrice: requestData.finalPrice,
      promoCode: requestData.promoCode,
      discountAmount: requestData.discountAmount
    });

    if (!requestData || !requestData.bookingId) {
      throw new Error('ID de réservation manquant');
    }

    const stripeKey = requestData.isTestMode 
      ? Deno.env.get('STRIPE_TEST_SECRET_KEY')
      : Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      throw new Error(`Clé API Stripe ${requestData.isTestMode ? 'test' : 'live'} non configurée`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Créer la session Stripe avec le prix final
    const session = await createStripeSession(
      stripe,
      requestData,
      req.headers.get('origin') || ''
    );

    // Mettre à jour la réservation avec le payment_intent_id
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Identifiants Supabase manquants');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        payment_intent_id: session.payment_intent as string,
        price: requestData.finalPrice // Mettre à jour le prix final dans la base de données
      })
      .eq('id', requestData.bookingId);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour de la réservation:', updateError);
      throw updateError;
    }

    console.log('✅ Session de paiement créée:', {
      sessionId: session.id,
      mode: requestData.isTestMode ? 'TEST' : 'LIVE',
      url: session.url,
      finalPrice: requestData.finalPrice
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erreur dans le processus de paiement:', error);
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