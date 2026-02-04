import OrderLookupClient from './order-lookup.client';

export const metadata = {
  title: 'Track Your Order | RAGESTATE',
  description: 'Look up your order status using your email and order number.',
};

/**
 * Order Lookup Page - Server component wrapper
 */
export default function OrderLookupPage() {
  return <OrderLookupClient />;
}
