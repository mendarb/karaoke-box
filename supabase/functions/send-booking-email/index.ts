import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { format } from "https://esm.sh/date-fns@2.30.0";
import { fr } from "https://esm.sh/date-fns@2.30.0/locale";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking } = await req.json();
    console.log('📧 Sending email for booking:', booking);

    if (!booking || !booking.date || !booking.time_slot) {
      throw new Error('Missing required booking data');
    }

    const bookingDate = new Date(booking.date);
    const formattedDate = format(bookingDate, 'EEEE d MMMM yyyy', { locale: fr });
    const startHour = parseInt(booking.time_slot);
    const endHour = startHour + parseInt(booking.duration);
    const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('Missing Resend API key');
    }

    const emailContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7E3AED;">Votre réservation est confirmée !</h1>
        
        <p>Bonjour ${booking.user_name},</p>
        
        <p>Nous avons le plaisir de vous confirmer votre réservation au Karaoké Box :</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 Date :</strong> ${formattedDate}</p>
          <p><strong>⏰ Horaire :</strong> ${formatHour(startHour)} - ${formatHour(endHour)}</p>
          <p><strong>⌛️ Durée :</strong> ${booking.duration}h</p>
          <p><strong>👥 Nombre de participants :</strong> ${booking.group_size} personne(s)</p>
          <p><strong>💰 Prix :</strong> ${booking.price}€</p>
          ${booking.message ? `<p><strong>💬 Message :</strong> ${booking.message}</p>` : ''}
          ${booking.is_test_booking ? '<p style="color: #EAB308;"><strong>Ceci est une réservation de test</strong></p>' : ''}
        </div>
        
        <div style="background-color: #7E3AED; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: white; margin-top: 0;">📍 Lieu du rendez-vous</h2>
          <p style="margin-bottom: 0;">L'adresse exacte vous sera communiquée par SMS le jour de votre venue</p>
        </div>
        
        <div style="border-left: 4px solid #7E3AED; padding-left: 20px; margin: 20px 0;">
          <h2 style="color: #7E3AED; margin-top: 0;">ℹ️ Informations importantes</h2>
          <ul style="padding-left: 20px;">
            <li>Merci d'arriver 15 minutes avant l'heure de votre réservation</li>
            <li>En cas d'empêchement, merci de nous prévenir au moins 24h à l'avance</li>
            <li>N'hésitez pas à préparer votre playlist à l'avance !</li>
          </ul>
        </div>
        
        <div style="margin-top: 40px;">
          <p><strong>Une question ?</strong></p>
          <p>📞 <a href="tel:+33612345678" style="color: #7E3AED;">06 12 34 56 78</a></p>
          <p>📧 <a href="mailto:contact@karaoke-box-metz.fr" style="color: #7E3AED;">contact@karaoke-box-metz.fr</a></p>
        </div>
        
        <p style="margin-top: 40px;">À très bientôt !</p>
        <p>L'équipe Karaoke Box Metz</p>
      </div>
    `;

    console.log('📧 Sending email with Resend API');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Karaoke Box <onboarding@resend.dev>',
        to: booking.user_email,
        subject: 'Votre réservation est confirmée ! - Karaoke Box Metz',
        html: emailContent,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('❌ Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log('✅ Email sent successfully:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Error in send-booking-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});