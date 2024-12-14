import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { CheckoutData } from './types.ts';

export const getStripeInstance = (isTestMode: boolean): Stripe => {
  const stripeSecretKey = isTestMode 
    ? Deno.env.get('STRIPE_TEST_SECRET_KEY')
    : Deno.env.get('STRIPE_SECRET_KEY');

  if (!stripeSecretKey) {
    throw new Error(isTestMode ? 'Test mode API key not configured' : 'Live mode API key not configured');
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });
};

export const createLineItem = (data: CheckoutData) => {
  const amount = data.finalPrice || data.price;
  console.log('Creating line item with amount:', amount);
  
  return {
    price_data: {
      currency: 'eur',
      product_data: {
        name: `${data.isTestMode ? '[TEST] ' : ''}Réservation - ${data.date} ${data.timeSlot}`,
        description: `${data.groupSize} personnes - ${data.duration}h`,
      },
      unit_amount: amount * 100,
    },
    quantity: 1,
  };
};

export const createMetadata = (data: CheckoutData): Record<string, string> => {
  return {
    date: data.date,
    timeSlot: data.timeSlot,
    duration: data.duration,
    groupSize: data.groupSize,
    message: data.message || '',
    userName: data.userName,
    userPhone: data.userPhone,
    isTestMode: String(data.isTestMode),
    userId: data.userId,
    promoCodeId: data.promoCodeId || '',
    originalPrice: String(data.price),
    finalPrice: String(data.finalPrice || data.price)
  };
};