import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Booking } from "@/hooks/useBookings";
import { formatTimeSlot } from "../utils/timeUtils";

export const getTimeColumn = (): ColumnDef<Booking> => ({
  accessorKey: "time_slot",
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="hover:bg-transparent"
    >
      Horaire
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const timeSlot = row.getValue("time_slot") as string;
    const duration = row.original.duration;
    return formatTimeSlot(timeSlot, duration);
  },
});