import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { PersonalInfoFields } from "./booking/PersonalInfoFields";
import { DateTimeFields } from "./booking/DateTimeFields";
import { GroupSizeAndDurationFields } from "./booking/GroupSizeAndDurationFields";
import { AdditionalFields } from "./booking/AdditionalFields";
import { BookingSteps, type BookingStep } from "./BookingSteps";
import { supabase } from "@/lib/supabase";

export const BookingForm = () => {
  const { toast } = useToast();
  const [groupSize, setGroupSize] = useState("");
  const [duration, setDuration] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm();

  const steps: BookingStep[] = [
    {
      id: 1,
      name: "Informations personnelles",
      description: "Vos coordonnées",
      completed: currentStep > 1,
      current: currentStep === 1,
    },
    {
      id: 2,
      name: "Date et heure",
      description: "Choisissez votre créneau",
      completed: currentStep > 2,
      current: currentStep === 2,
    },
    {
      id: 3,
      name: "Groupe et durée",
      description: "Taille du groupe et durée",
      completed: currentStep > 3,
      current: currentStep === 3,
    },
    {
      id: 4,
      name: "Finalisation",
      description: "Informations complémentaires",
      completed: currentStep > 4,
      current: currentStep === 4,
    },
  ];

  const handlePriceCalculated = (price: number) => {
    console.log('Price calculated:', price);
    setCalculatedPrice(price);
  };

  const checkTimeSlotAvailability = async (date: Date, timeSlot: string) => {
    console.log('Checking availability for:', { date, timeSlot });
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date.toISOString().split('T')[0])
      .eq('time_slot', timeSlot);

    if (error) {
      console.error('Error checking availability:', error);
      return false;
    }

    if (bookings && bookings.length > 0) {
      toast({
        title: "Créneau non disponible",
        description: "Ce créneau est déjà réservé. Veuillez choisir un autre horaire.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const onSubmit = async (data: any) => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting submission with data:', { ...data, groupSize, duration, calculatedPrice });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer une réservation.",
          variant: "destructive",
        });
        return;
      }

      const isAvailable = await checkTimeSlotAvailability(data.date, data.timeSlot);
      if (!isAvailable) return;

      // Récupérer les informations de l'utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      console.log('User data:', { user });

      // Sauvegarder la réservation avec les informations utilisateur
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          user_id: user.id,
          date: data.date,
          time_slot: data.timeSlot,
          duration: duration,
          group_size: groupSize,
          status: 'pending',
          price: calculatedPrice,
          message: data.message || null,
          user_email: data.email || user.email,
          user_name: data.fullName,
          user_phone: data.phone,
        }]);

      if (bookingError) {
        console.error('Booking error:', bookingError);
        throw bookingError;
      }

      // Créer la session de paiement
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: JSON.stringify({
          price: calculatedPrice,
          groupSize,
          duration,
          date: data.date,
          timeSlot: data.timeSlot,
          message: data.message,
          userEmail: data.email || user.email,
          userName: data.fullName,
          userPhone: data.phone,
        })
      });

      console.log('Checkout response:', { checkoutData, checkoutError });

      if (checkoutError) throw checkoutError;
      if (!checkoutData?.url) throw new Error("URL de paiement non reçue");

      window.location.href = checkoutData.url;
      
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réservation. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoFields form={form} />;
      case 2:
        return <DateTimeFields form={form} />;
      case 3:
        return (
          <GroupSizeAndDurationFields
            form={form}
            onGroupSizeChange={setGroupSize}
            onDurationChange={setDuration}
            onPriceCalculated={handlePriceCalculated}
          />
        );
      case 4:
        return (
          <AdditionalFields 
            form={form} 
            calculatedPrice={calculatedPrice}
            groupSize={groupSize}
            duration={duration}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <BookingSteps steps={steps} currentStep={currentStep} />
        
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        <div className="flex justify-between space-x-4 pb-20 sm:pb-0">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="w-full"
            >
              Précédent
            </Button>
          )}
          <Button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700"
            disabled={isSubmitting}
          >
            {currentStep === 4 ? (isSubmitting ? "Traitement..." : "Procéder au paiement") : "Suivant"}
          </Button>
        </div>
      </form>
    </Form>
  );
};