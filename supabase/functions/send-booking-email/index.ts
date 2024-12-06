import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { format } from "https://deno.land/x/date_fns@v2.22.1/format/index.js";
import { fr } from "https://deno.land/x/date_fns@v2.22.1/locale/index.js";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingEmailRequest {
  type: 'booking_confirmed' | 'booking_cancelled';
  booking: {
    user_name: string;
    user_email: string;
    date: string;
    time_slot: string;
    duration: string;
    group_size: string;
    price: number;
    status: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Email function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { type, booking }: BookingEmailRequest = await req.json();
    console.log('Received email request:', { type, booking });

    const formattedDate = format(new Date(booking.date), "d MMMM yyyy", { locale: fr });
    const endTime = parseInt(booking.time_slot) + parseInt(booking.duration);

    const emailSubject = type === 'booking_confirmed' 
      ? 'Votre réservation est confirmée !'
      : 'Votre réservation a été annulée';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${emailSubject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Karaoke Box Metz</h1>
              <h2>${emailSubject}</h2>
            </div>
            <p>Bonjour ${booking.user_name},</p>
            <p>${type === 'booking_confirmed' 
              ? 'Votre réservation a été confirmée.' 
              : 'Votre réservation a été annulée.'}</p>
            <div class="details">
              <h3>Détails de votre réservation :</h3>
              <p>📅 Date : ${formattedDate}</p>
              <p>🕒 Horaire : ${booking.time_slot}h - ${endTime}h</p>
              <p>👥 Nombre de personnes : ${booking.group_size}</p>
              <p>💶 Prix total : ${booking.price}€</p>
            </div>
            <div class="footer">
              <p>Karaoke Box Metz<br>
              📍 [Adresse]<br>
              📞 [Téléphone]<br>
              ✉️ contact@karaoke-box-metz.fr</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('Sending email with Resend...');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Karaoke Box Metz <no-reply@karaoke-box-metz.fr>',
        to: [booking.user_email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const data = await res.json();
    console.log('Resend API response:', data);

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-booking-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);