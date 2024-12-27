import { Users, Music2, Calendar } from "lucide-react";

export const FeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      <div className="bg-[#7E3AED] p-6 md:p-8 text-center text-white flex flex-col justify-center">
        <Users className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4" />
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">Salle privative</h3>
        <p className="text-sm md:text-base">Un espace rien que pour vous et vos proches</p>
      </div>
      <div className="bg-[#F5F3FF] p-6 md:p-8 text-center flex flex-col justify-center">
        <Music2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-kbox-coral" />
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-kbox-coral">Large choix</h3>
        <p className="text-sm md:text-base text-gray-600">Des milliers de chansons disponibles</p>
      </div>
      <div className="bg-[#7E3AED] p-6 md:p-8 text-center text-white flex flex-col justify-center">
        <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4" />
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">Horaires flexibles</h3>
        <p className="text-sm md:text-base">Du mercredi au dimanche, de 17h à 23h</p>
      </div>
    </div>
  );
};