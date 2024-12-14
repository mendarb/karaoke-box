import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";

export const usePromoCode = (
  calculatedPrice: number,
  form: UseFormReturn<any>
) => {
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [promoData, setPromoData] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState(calculatedPrice);

  useEffect(() => {
    if (!isPromoValid || !promoData) {
      console.log('Resetting price to original:', calculatedPrice);
      setFinalPrice(calculatedPrice);
      form.setValue('finalPrice', calculatedPrice);
      return;
    }

    calculateFinalPrice(promoData);
  }, [calculatedPrice, isPromoValid, promoData, form]);

  const calculateFinalPrice = (promoCode: any) => {
    if (!promoCode) {
      setFinalPrice(calculatedPrice);
      form.setValue('finalPrice', calculatedPrice);
      return;
    }

    let newPrice = calculatedPrice;
    
    if (promoCode.type === 'percentage' && promoCode.value) {
      newPrice = calculatedPrice * (1 - promoCode.value / 100);
    } else if (promoCode.type === 'fixed_amount' && promoCode.value) {
      newPrice = Math.max(0, calculatedPrice - promoCode.value);
    } else if (promoCode.type === 'free') {
      newPrice = 0;
    }
    
    console.log('Calculating final price:', {
      originalPrice: calculatedPrice,
      promoType: promoCode.type,
      promoValue: promoCode.value,
      newPrice,
      promoCode
    });
    
    const roundedPrice = Math.round(newPrice * 100) / 100;
    setFinalPrice(roundedPrice);
    
    // Important: Mettre à jour le prix final dans le formulaire
    form.setValue('finalPrice', roundedPrice);
  };

  const handlePromoValidated = (isValid: boolean, promoCode?: any) => {
    console.log('Promo validation result:', { isValid, promoCode });
    setIsPromoValid(isValid);
    setPromoData(promoCode);
    
    if (!isValid) {
      setFinalPrice(calculatedPrice);
      form.setValue('finalPrice', calculatedPrice);
      form.setValue('promoCode', '');
      form.setValue('promoCodeId', null);
    } else {
      form.setValue('promoCode', promoCode.code);
      form.setValue('promoCodeId', promoCode.id);
      calculateFinalPrice(promoCode);
    }
  };

  return {
    isPromoValid,
    promoData,
    finalPrice,
    handlePromoValidated
  };
};