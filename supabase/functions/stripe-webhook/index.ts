import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  try {
    // Gérer les requêtes CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Récupérer la signature du webhook
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ Pas de signature Stripe dans les en-têtes');
      return new Response(
        JSON.stringify({ error: 'No stripe signature found in headers' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ Secret webhook non configuré');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Récupérer le corps de la requête en tant que texte brut
    const body = await req.text();
    console.log('📦 Corps de la requête reçu:', body.substring(0, 100) + '...');

    // Initialiser Stripe avec la clé secrète
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log('✅ Signature du webhook vérifiée, événement:', event.type);
    } catch (err) {
      console.error('❌ Erreur de vérification de la signature:', err);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Traiter l'événement
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('💳 Session de paiement complétée:', {
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        metadata: session.metadata,
      });

      try {
        // Rechercher la réservation avec le payment_intent_id
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('payment_intent_id', session.payment_intent)
          .single();

        if (bookingError) {
          console.error('❌ Erreur lors de la recherche de la réservation:', bookingError);
          throw bookingError;
        }

        if (!booking) {
          console.error('❌ Aucune réservation trouvée avec le payment_intent_id:', session.payment_intent);
          throw new Error('Réservation introuvable');
        }

        console.log('✅ Réservation trouvée:', booking);

        // Mettre à jour le statut de la réservation
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour de la réservation:', updateError);
          throw updateError;
        }

        console.log('✅ Réservation mise à jour avec succès');

        // Envoyer l'email de confirmation
        try {
          console.log('📧 Envoi de l\'email de confirmation...');
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({ 
              booking,
              type: 'confirmation'
            })
          });

          if (!emailResponse.ok) {
            throw new Error(`Erreur d'envoi d'email: ${await emailResponse.text()}`);
          }

          console.log('✅ Email de confirmation envoyé');

        } catch (emailError) {
          console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
          // Ne pas bloquer le processus si l'email échoue
        }

      } catch (error) {
        console.error('❌ Erreur dans le traitement de la session:', error);
        throw error;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erreur dans le gestionnaire de webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});