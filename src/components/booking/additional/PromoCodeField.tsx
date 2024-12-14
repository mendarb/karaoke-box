import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface PromoCodeFieldProps {
  onPromoValidated: (isValid: boolean, promoCode?: any) => void;
  form: any;
}

export const PromoCodeField = ({ onPromoValidated, form }: PromoCodeFieldProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handlePromoCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setPromoCode(code);
    onPromoValidated(false);
    form.setValue('promoCode', code);
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Code promo manquant",
        description: "Veuillez entrer un code promo.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim())
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        onPromoValidated(false);
        toast({
          title: "Code promo invalide",
          description: "Ce code promo n'existe pas ou n'est plus valide.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier les limites d'utilisation
      if (data.max_uses && data.current_uses >= data.max_uses) {
        onPromoValidated(false);
        toast({
          title: "Code promo épuisé",
          description: "Ce code promo a atteint sa limite d'utilisation.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier la période de validité
      const now = new Date();
      if (data.start_date && new Date(data.start_date) > now) {
        onPromoValidated(false);
        toast({
          title: "Code promo non valide",
          description: "Ce code promo n'est pas encore valide.",
          variant: "destructive",
        });
        return;
      }

      if (data.end_date && new Date(data.end_date) < now) {
        onPromoValidated(false);
        toast({
          title: "Code promo expiré",
          description: "Ce code promo a expiré.",
          variant: "destructive",
        });
        return;
      }

      onPromoValidated(true, data);
      form.setValue('promoCodeId', data.id);
      toast({
        title: "Code promo valide !",
        description: `Le code ${promoCode} a été appliqué avec succès.`,
      });
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la validation du code promo.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-2">
      <FormItem>
        <FormLabel>Code promo (optionnel)</FormLabel>
        <div className="flex gap-2">
          <FormControl>
            <Input
              type="text"
              value={promoCode}
              onChange={handlePromoCodeChange}
              placeholder="Entrez votre code promo"
            />
          </FormControl>
          <Button 
            type="button" 
            variant="outline"
            onClick={validatePromoCode}
            disabled={isValidating}
            className="shrink-0"
          >
            {isValidating ? 'Validation...' : 'Valider'}
          </Button>
        </div>
      </FormItem>
    </div>
  );
};