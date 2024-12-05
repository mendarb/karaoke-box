import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PriceCalculatorProps {
  groupSize: string;
  duration: string;
}

export const PriceCalculator = ({ groupSize, duration }: PriceCalculatorProps) => {
  const [price, setPrice] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const calculatePrice = () => {
      const hours = parseInt(duration) || 0;
      let basePrice = 0;

      // Handle "6+" case
      const size = parseInt(groupSize) || 0;
      if (groupSize === "6+" || size >= 6) {
        basePrice = 60; // Price for 6 or more people
      } else {
        switch (size) {
          case 2:
            basePrice = 30;
            break;
          case 3:
            basePrice = 35;
            break;
          case 4:
            basePrice = 40;
            break;
          case 5:
            basePrice = 45;
            break;
          default:
            basePrice = 0;
        }
      }

      setPrice(basePrice * hours);
    };

    calculatePrice();
  }, [groupSize, duration]);

  return (
    <div className={`${isMobile ? 'mt-3 p-4' : 'mt-4 p-6'} bg-violet-50 rounded-lg animate-fadeIn`}>
      <p className="text-xl sm:text-2xl font-semibold text-karaoke-primary mb-2">
        Prix total estimé : {price}€
      </p>
      <p className="text-xs sm:text-sm text-gray-600">
        *Prix indicatif, peut varier selon les options choisies
      </p>
    </div>
  );
};