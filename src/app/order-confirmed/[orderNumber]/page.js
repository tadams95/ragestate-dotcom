import OrderConfirmedClient from './order-confirmed.client';

export const metadata = {
  title: 'Order Confirmed | RAGESTATE',
  description: 'Your order has been confirmed.',
};

/**
 * Order Confirmed Page - Server component wrapper
 * @param {{ params: Promise<{ orderNumber: string }> }} props
 */
export default async function OrderConfirmedPage({ params }) {
  const { orderNumber } = await params;

  return <OrderConfirmedClient orderNumber={orderNumber} />;
}
