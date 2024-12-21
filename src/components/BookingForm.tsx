import { Form } from "@/components/ui/form";
import { useBookingForm } from "./booking/hooks/useBookingForm";
import { useBookingSteps } from "./booking/hooks/useBookingSteps";
import { useBookingSubmit } from "./booking/hooks/useBookingSubmit";
import { BookingSteps } from "./BookingSteps";
import { BookingFormContent } from "./booking/BookingFormContent";
import { BookingFormActions } from "./booking/BookingFormActions";
import { useEffect } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { toast } from "@/components/ui/use-toast";

export const BookingForm = () => {
  const { session } = useAuthSession();
  const {
    form,
    groupSize,
    setGroupSize,
    duration,
    setDuration,
    currentStep,
    setCurrentStep,
    calculatedPrice,
    isSubmitting,
    setIsSubmitting,
    availableHours,
    handlePriceCalculated,
    handleAvailabilityChange,
    handlePrevious,
  } = useBookingForm();

  // Si l'utilisateur est connecté, on commence à l'étape 2
  useEffect(() => {
    if (session?.user && currentStep === 1) {
      setCurrentStep(2);
      // Pré-remplir les informations de l'utilisateur
      form.setValue('email', session.user.email || '');
    }
  }, [session, currentStep, setCurrentStep, form]);

  const steps = useBookingSteps(currentStep);
  const { handleSubmit: submitBooking } = useBookingSubmit(
    form, 
    groupSize, 
    duration, 
    calculatedPrice, 
    setIsSubmitting
  );

  const onSubmit = async (data: any) => {
    // Validation des champs requis selon l'étape
    const requiredFields = {
      1: ['email', 'fullName', 'phone'],
      2: ['date', 'timeSlot'],
      3: ['groupSize', 'duration'],
      4: []
    }[currentStep];

    const isValid = requiredFields?.every(field => {
      const value = form.getValues(field);
      if (!value) {
        form.setError(field, {
          type: 'required',
          message: 'Ce champ est requis'
        });
        return false;
      }
      return true;
    });

    if (!isValid) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }

    await submitBooking(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <BookingSteps steps={steps} currentStep={currentStep} />
        
        <div className="min-h-[300px]">
          <BookingFormContent
            currentStep={currentStep}
            form={form}
            groupSize={groupSize}
            duration={duration}
            calculatedPrice={calculatedPrice}
            onGroupSizeChange={setGroupSize}
            onDurationChange={setDuration}
            onPriceCalculated={handlePriceCalculated}
            onAvailabilityChange={handleAvailabilityChange}
            availableHours={availableHours}
          />
        </div>

        <BookingFormActions
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          onPrevious={handlePrevious}
        />
      </form>
    </Form>
  );
};