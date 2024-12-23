import { Form } from "@/components/ui/form";
import { useBookingForm } from "./hooks/useBookingForm";
import { useBookingSteps } from "./hooks/useBookingSteps";
import { useBookingSubmit } from "./hooks/useBookingSubmit";
import { BookingSteps } from "@/components/BookingSteps";
import { BookingFormContent } from "./BookingFormContent";
import { BookingFormActions } from "./BookingFormActions";
import { useBookingMode } from "./hooks/useBookingMode";
import { useBookingOverlap } from "@/hooks/useBookingOverlap";
import { toast } from "@/hooks/use-toast";

export const BookingFormWrapper = () => {
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

  const steps = useBookingSteps(currentStep);
  const { isTestMode } = useBookingMode();
  
  const { handleSubmit: submitBooking } = useBookingSubmit(
    form, 
    groupSize, 
    duration, 
    calculatedPrice, 
    setIsSubmitting
  );

  const { checkOverlap } = useBookingOverlap();

  const validateStep = (step: number) => {
    const requiredFields = {
      1: ['email', 'fullName', 'phone'],
      2: ['date', 'timeSlot'],
      3: ['groupSize', 'duration'],
      4: []
    }[step];

    if (!requiredFields) return true;

    const isValid = requiredFields.every(field => {
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
    }

    return isValid;
  };

  const onSubmit = async (data: any) => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }
    
    console.log('🔧 Payment mode:', isTestMode ? 'TEST' : 'LIVE', {
      isTestMode
    });
    
    // Set test mode in form data
    form.setValue('isTestMode', isTestMode);
    
    // Vérifier les chevauchements avant de soumettre
    const hasOverlap = await checkOverlap(data.date, data.timeSlot, duration);
    if (hasOverlap) {
      return;
    }

    await submitBooking({ ...data, isTestMode });
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