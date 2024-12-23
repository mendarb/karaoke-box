import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export async function handleWebhook(event: any, stripe: Stripe | null, supabase: any) {
  try {
    console.log('Processing webhook event:', {
      type: event.type,
      metadata: event.data?.object?.metadata,
      sessionId: event.data?.object?.id,
      paymentStatus: event.data?.object?.payment_status
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', {
          sessionId: session.id,
          metadata: session.metadata,
          customerEmail: session.customer_email
        });

        // Créer la réservation uniquement après confirmation du paiement
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert([{
            user_id: session.metadata.userId || null,
            user_email: session.customer_email || session.metadata.userEmail,
            user_name: session.metadata.userName,
            user_phone: session.metadata.userPhone,
            date: session.metadata.date,
            time_slot: session.metadata.timeSlot,
            duration: session.metadata.duration,
            group_size: session.metadata.groupSize,
            price: parseFloat(session.metadata.price),
            message: session.metadata.message || '',
            status: 'confirmed',
            payment_status: 'paid',
            is_test_booking: session.metadata.isTestMode === 'true',
            payment_intent_id: session.payment_intent,
            promo_code_id: session.metadata.promoCodeId || null,
            cabin: session.metadata.cabin || 'metz'
          }])
          .select()
          .single();

        if (bookingError) {
          console.error('Error creating booking:', bookingError);
          throw bookingError;
        }

        console.log('✅ Booking created:', {
          bookingId: booking.id,
          paymentIntentId: session.payment_intent
        });

        // Envoyer l'email de confirmation
        try {
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-email`, {
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

          if (!response.ok) {
            throw new Error('Failed to send confirmation email');
          }
          
          console.log('✅ Confirmation email sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending confirmation email:', emailError);
        }

        break;
      }

      case 'checkout.session.expired': {
        console.log('Checkout session expired:', event.data.object);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}