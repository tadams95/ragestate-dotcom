import Link from "next/link";
import ShoppingCartIcon from "@heroicons/react/24/outline/ShoppingCartIcon";

export default function EmptyCart() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <div className="px-6 py-12 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-center mb-6">
            <ShoppingCartIcon
              className="h-12 w-12 text-gray-300 opacity-70"
              aria-hidden="true"
            />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Your cart is empty
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Looks like you haven't added anything to your cart yet.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/shop"
              className="w-full sm:w-auto flex items-center justify-center rounded-md bg-red-700 px-8 py-3 text-base font-medium text-white hover:bg-red-800 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Continue Shopping
            </Link>
            <Link
              href="/events"
              className="w-full sm:w-auto flex items-center justify-center rounded-md border border-gray-600 px-8 py-3 text-base font-medium text-gray-100 hover:bg-gray-800 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
