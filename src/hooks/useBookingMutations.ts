import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Booking } from "./useBookings";

export const useBookingMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    console.log('Updating booking status:', { bookingId, newStatus });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Vous devez être connecté pour effectuer cette action');
      }

      const isAdmin = session.user.email === 'mendar.bouchali@gmail.com';
      if (!isAdmin) {
        throw new Error('Permission refusée');
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Réservation non trouvée');
      }

      // Optimistic update
      queryClient.setQueryData(['bookings'], (old: Booking[] | undefined) => {
        if (!old) return [];
        return old.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        );
      });

      // Send email notification
      await supabase.functions.invoke('send-booking-email', {
        body: {
          type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
          booking: {
            ...data,
            status: newStatus
          }
        }
      });

      toast({
        title: "Succès",
        description: "Le statut a été mis à jour",
      });

      // Refresh data to ensure sync
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });

    } catch (error: any) {
      console.error('Error in updateBookingStatus:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });

      // Refresh data in case of error to ensure UI is in sync
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  };

  return {
    updateBookingStatus,
  };
};