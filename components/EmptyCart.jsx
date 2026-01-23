import ShoppingCartIcon from '@heroicons/react/24/outline/ShoppingCartIcon';
import Link from 'next/link';

export default function EmptyCart() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-root)] transition-colors duration-200">
      <div className="px-6 py-12 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <ShoppingCartIcon
              className="h-12 w-12 text-[var(--text-tertiary)] opacity-70"
              aria-hidden="true"
            />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Your cart is empty
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--text-secondary)]">
            Looks like you haven't added anything to your cart yet.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/shop"
              className="flex w-full items-center justify-center rounded-md bg-[var(--accent)] px-8 py-3 text-base font-medium text-white transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-root)] active:scale-95 sm:w-auto"
            >
              Continue Shopping
            </Link>
            <Link
              href="/events"
              className="flex w-full items-center justify-center rounded-md border border-[var(--border-subtle)] px-8 py-3 text-base font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elev-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-root)] active:scale-95 sm:w-auto"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
