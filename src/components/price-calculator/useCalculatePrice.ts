import { useEffect, useState } from "react";
import { PriceSettings } from "./types";

interface CalculatePriceProps {
  groupSize: string;
  duration: string;
  settings?: { basePrice: PriceSettings };
  onPriceCalculated?: (price: number) => void;
}

export const useCalculatePrice = ({ 
  groupSize, 
  duration, 
  settings, 
  onPriceCalculated 
}: CalculatePriceProps) => {
  const [price, setPrice] = useState(0);
  const [pricePerPersonPerHour, setPricePerPersonPerHour] = useState(0);

  useEffect(() => {
    if (!settings || !groupSize || !duration) {
      console.log('Missing required data:', { settings, groupSize, duration });
      return;
    }

    const hours = parseFloat(duration);
    const size = parseFloat(groupSize);

    if (isNaN(hours) || isNaN(size) || hours <= 0 || size <= 0) {
      console.log('Invalid input values:', { hours, size });
      return;
    }

    const baseHourRate = settings.basePrice?.perHour || 30;
    const basePersonRate = settings.basePrice?.perPerson || 5;

    console.log('Base rates:', { baseHourRate, basePersonRate });

    const pricePerPerson = basePersonRate;
    const basePrice = baseHourRate + (pricePerPerson * size);
    let finalPrice = basePrice;

    if (hours > 1) {
      const additionalHours = hours - 1;
      const discountedHourPrice = basePrice * 0.9;
      finalPrice += discountedHourPrice * additionalHours;
    }

    const pricePerPersonHour = Math.round((basePrice / size) * 100) / 100;

    console.log('Price calculation:', {
      basePrice,
      finalPrice,
      pricePerPersonHour
    });

    setPrice(finalPrice);
    setPricePerPersonPerHour(pricePerPersonHour);

    if (onPriceCalculated) {
      onPriceCalculated(finalPrice);
    }
  }, [groupSize, duration, settings, onPriceCalculated]);

  return { price, pricePerPersonPerHour };
};