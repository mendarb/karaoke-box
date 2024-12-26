import { useState, useCallback } from "react";
import { PriceSettings } from "./types";

interface CalculatePriceProps {
  settings?: { basePrice: PriceSettings };
}

export const useCalculatePrice = ({ settings }: CalculatePriceProps = {}) => {
  const [price, setPrice] = useState<number>(0);
  const [pricePerPersonPerHour, setPricePerPersonPerHour] = useState<number>(0);

  const calculatePrice = useCallback((groupSize: string, duration: string) => {
    if (!settings?.basePrice) {
      console.log('❌ Paramètres de prix manquants');
      return 0;
    }

    const hours = parseFloat(duration);
    const size = parseFloat(groupSize);

    if (isNaN(hours) || isNaN(size) || hours <= 0 || size <= 0) {
      console.log('❌ Valeurs invalides:', { hours, size });
      return 0;
    }

    const baseHourRate = settings.basePrice.perHour || 30;
    const basePersonRate = settings.basePrice.perPerson || 5;

    console.log('💰 Tarifs de base:', { baseHourRate, basePersonRate });

    // Prix par personne pour la première heure
    const basePrice = baseHourRate + (basePersonRate * size);
    
    // Prix total pour la première heure
    let totalPrice = basePrice;
    
    // Prix réduit pour les heures suivantes (-10%)
    if (hours > 1) {
      const additionalHoursPrice = (basePrice * 0.9) * (hours - 1);
      totalPrice += additionalHoursPrice;
    }

    // Arrondir à 2 décimales et forcer l'affichage des deux décimales
    const finalPrice = Number(totalPrice.toFixed(2));
    const pricePerPerson = Number((finalPrice / (size * hours)).toFixed(2));

    console.log('💰 Calcul du prix:', {
      groupSize,
      duration,
      basePrice,
      totalPrice: finalPrice,
      pricePerPerson
    });

    setPrice(finalPrice);
    setPricePerPersonPerHour(pricePerPerson);

    return finalPrice;
  }, [settings]);

  return { price, pricePerPersonPerHour, calculatePrice };
};