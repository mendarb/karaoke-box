import { Home, Calendar, Settings, LogOut, ArrowLeft, BookOpen, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

export const DashboardSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: "/admin", icon: Home, label: "Dashboard" },
    { path: "/admin/calendar", icon: Calendar, label: "Calendrier" },
    { path: "/admin/accounts", icon: Users, label: "Comptes" },
    { path: "/admin/settings", icon: Settings, label: "Paramètres" },
    { path: "/admin/documentation", icon: BookOpen, label: "Documentation" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col h-full min-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Karaoke Admin</h2>
        </div>

        <nav className="flex-1 p-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Button 
                key={item.path}
                variant={isActive(item.path) ? "secondary" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => navigate(item.path)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>

        <div className="p-2 border-t space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au site
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" 
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};