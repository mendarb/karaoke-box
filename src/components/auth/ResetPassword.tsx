import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Vérifier les paramètres d'erreur dans l'URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");

    if (errorCode) {
      let message = "Une erreur est survenue lors de la réinitialisation du mot de passe.";
      if (errorCode === "otp_expired") {
        message = "Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.";
      }
      setError(message);
    }
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour",
      });
      
      navigate("/");
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <Card className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            className="w-full mt-4"
            onClick={() => navigate("/")}
          >
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Réinitialisation du mot de passe</h1>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Chargement..." : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      </Card>
    </div>
  );
};