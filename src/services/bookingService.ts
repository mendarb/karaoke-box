import { supabase } from "@/lib/supabase";
import { createCheckoutSession } from "@/services/checkoutService";
import { format } from "date-fns";

export const fetchBookings = async () => {
  console.log('📚 Fetching bookings...');
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching bookings:', error);
    throw error;
  }

  console.log('✅ Bookings fetched successfully:', bookings);
  return bookings;
};

export const createBooking = async (data: any) => {
  const formattedDate = format(new Date(data.date), 'yyyy-MM-dd');
  
  console.log('📝 Création d\'une nouvelle réservation :', {
    userId: data.userId,
    email: data.email,
    date: formattedDate,
    timeSlot: data.timeSlot,
    duration: data.duration,
    groupSize: data.groupSize,
    price: data.price || data.calculatedPrice // Ajout d'un fallback sur calculatedPrice
  });

  if (!data.price && !data.calculatedPrice) {
    throw new Error('Le prix est requis pour créer une réservation');
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      user_id: data.userId,
      user_email: data.email,
      user_name: data.fullName,
      user_phone: data.phone,
      date: formattedDate,
      time_slot: data.timeSlot,
      duration: data.duration,
      group_size: data.groupSize,
      price: data.price || data.calculatedPrice, // Ajout d'un fallback sur calculatedPrice
      message: data.message,
      status: 'pending',
      payment_status: 'unpaid',
      is_test_booking: data.isTestMode || false,
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur lors de la création de la réservation:', error);
    throw error;
  }

  console.log('✅ Réservation créée avec succès:', {
    bookingId: booking.id,
    status: booking.status,
    paymentStatus: booking.payment_status
  });

  return booking;
};

export const generatePaymentLink = async (booking: any, data: any) => {
  console.log('💰 Génération du lien de paiement pour la réservation:', booking.id);

  const checkoutUrl = await createCheckoutSession({
    bookingId: booking.id,
    userEmail: data.email,
    date: data.date,
    timeSlot: data.timeSlot,
    duration: data.duration,
    groupSize: data.groupSize,
    price: data.price || data.calculatedPrice, // Ajout d'un fallback sur calculatedPrice
    finalPrice: data.finalPrice || data.calculatedPrice,
    message: data.message,
    userName: data.fullName,
    userPhone: data.phone,
    isTestMode: data.isTestMode || false,
  });

  console.log('✅ Lien de paiement généré:', checkoutUrl);
  return checkoutUrl;
};