import { useState } from "react";
import { useBookingActions } from "@/hooks/useBookingActions";
import { BookingStatus } from "@/integrations/supabase/types/booking";
import { DeleteBookingDialog } from "./actions/DeleteBookingDialog";
import { BookingActionsMenu } from "./actions/BookingActionsMenu";

interface BookingActionsProps {
  bookingId: string;
  currentStatus: BookingStatus;
}

export const BookingActions = ({ 
  bookingId, 
  currentStatus 
}: BookingActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { updateBookingStatus, deleteBooking, isLoading } = useBookingActions();

  const handleStatusChange = async (newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
    } catch (error) {
      console.error('Error in handleStatusChange:', error);
    } finally {
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBooking(bookingId);
      setShowDeleteDialog(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  return (
    <>
      <BookingActionsMenu
        isOpen={isOpen}
        isLoading={isLoading}
        currentStatus={currentStatus}
        onOpenChange={(open) => !isLoading && setIsOpen(open)}
        onStatusChange={handleStatusChange}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <DeleteBookingDialog
        isOpen={showDeleteDialog}
        isLoading={isLoading}
        onClose={() => {
          setShowDeleteDialog(false);
          setIsOpen(false);
        }}
        onConfirm={handleDelete}
      />
    </>
  );
};