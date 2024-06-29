import Link from "next/link";

export default function EmptyCart() {
  return (
    <div className="pt-24">
      <div className="px-6 py-24 sm:px-6  lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl pt-24">
            Looks like your cart is empty.
            <br />
            Go browse around.
          </h2>
          {/* <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            Incididunt sint fugiat pariatur cupidatat consectetur sit cillum
            anim id veniam aliqua proident excepteur commodo do ea.
          </p> */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/shop"
              className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Shop
            </Link>
            <Link
              href="/events"
              className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
