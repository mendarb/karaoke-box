import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useBookingSettings } from "../date-time/hooks/useBookingSettings";
import { createBooking } from "@/services/bookingService";
import { createCheckoutSession } from "@/services/checkoutService";
import { sendBookingEmail } from "@/services/emailService";

export const useBookingSubmit = (
  form: UseFormReturn<any>,
  groupSize: string,
  duration: string,
  calculatedPrice: number,
  setIsSubmitting: (value: boolean) => void
) => {
  const { toast } = useToast();
  const { settings } = useBookingSettings();

  const validateBookingData = (data: any) => {
    const requiredFields = ['fullName', 'email', 'phone', 'date', 'timeSlot', 'groupSize', 'duration'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Champs requis manquants : ${missingFields.join(', ')}`);
    }

    if (!calculatedPrice && calculatedPrice !== 0) {
      throw new Error('Le prix n\'a pas été calculé correctement');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      console.log('🚀 Starting booking submission process', { data });
      setIsSubmitting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check:', { session });
      
      if (!session) {
        console.error('❌ No active session found');
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer une réservation",
          variant: "destructive",
        });
        return;
      }

      // Validation des données
      validateBookingData(data);

      const isTestMode = settings?.isTestMode || false;

      // Créer la réservation
      const booking = await createBooking({
        userId: session.user.id,
        date: data.date,
        timeSlot: data.timeSlot,
        duration,
        groupSize,
        price: calculatedPrice,
        message: data.message,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        isTestMode,
        promoCodeId: form.getValues('promoCodeId'),
      });

      console.log('📧 Sending initial booking email');
      try {
        await sendBookingEmail(booking);
        console.log('✅ Initial booking email sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending initial booking email:', emailError);
      }

      // Créer la session de paiement
      const checkoutUrl = await createCheckoutSession({
        bookingId: booking.id,
        userEmail: data.email,
        date: data.date,
        timeSlot: data.timeSlot,
        duration,
        groupSize,
        price: calculatedPrice,
        finalPrice: form.getValues('finalPrice') || calculatedPrice,
        message: data.message,
        userName: data.fullName,
        userPhone: data.phone,
        isTestMode,
        promoCodeId: form.getValues('promoCodeId'),
        promoCode: form.getValues('promoCode'),
      });

      console.log('✅ Redirecting to:', checkoutUrl);
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error('❌ Error in booking submission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la réservation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit };
};