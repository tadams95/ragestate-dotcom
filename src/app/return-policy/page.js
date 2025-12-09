import CheckCircleIcon from '@heroicons/react/20/solid/CheckCircleIcon';

export default function ReturnPolicy() {
  return (
    <>
      {/* Header is rendered by layout.js */}
      <div className="bg-black px-4 py-32 lg:px-8">
        <div className="relative mx-auto max-w-3xl text-base leading-7 text-gray-200">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-200 sm:text-5xl">
              Return Policy
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">Last updated: 7/23/24</p>
          </div>
          <p className="mt-6 text-xl leading-8">
            We have a 30-day return policy, which means you have 30 days after receiving your item
            to request a return.
          </p>
          <div className="mt-10 max-w-2xl">
            <p>
              To be eligible for a return, your item must be in the same condition that you received
              it, unworn or unused, with tags, and in its original packaging. You’ll also need the
              receipt or proof of purchase.
            </p>
            <p className="mt-8">
              To start a return, you can contact us at To start a return, you can contact us at
              contact@ragestate.com. Please note that returns addresses will be displayed on the
              shipping information of a product delivered.
            </p>

            <ul role="list" className="mt-8 max-w-xl space-y-8 text-gray-600">
              <li className="flex gap-x-3">
                <CheckCircleIcon
                  className="mt-1 h-5 w-5 flex-none text-red-700"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-red-700">Damages and issues.</strong> Please
                  inspect your order upon reception and contact us immediately if the item is
                  defective, damaged or if you receive the wrong item, so that we can evaluate the
                  issue and make it right.
                </span>
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon
                  className="mt-1 h-5 w-5 flex-none text-red-700"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-red-700">
                    Exceptions / non-returnable items
                  </strong>{' '}
                  Certain types of items cannot be returned, like perishable goods (such as food,
                  flowers, or plants), custom products (such as special orders or personalized
                  items), and personal care goods (such as beauty products). We also do not accept
                  returns for hazardous materials, flammable liquids, or gases. Please get in touch
                  if you have questions or concerns about your specific item.
                </span>
              </li>
              <li className="flex gap-x-3">
                <CheckCircleIcon
                  className="mt-1 h-5 w-5 flex-none text-red-700"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-red-700">Exchanges</strong> The fastest way
                  to ensure you get what you want is to return the item you have, and once the
                  return is accepted, make a separate purchase for the new item.
                </span>
              </li>
            </ul>

            <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-100">Refunds</h2>
            <p className="mt-6">
              We will notify you once we’ve received and inspected your return, and let you know if
              the refund was approved or not. If approved, you’ll be automatically refunded on your
              original payment method within 10 business days. Please remember it can take some time
              for your bank or credit card company to process and post the refund too. If more than
              15 business days have passed since we’ve approved your return, please contact us at
              contact@ragestate.com.
            </p>
          </div>
        </div>
      </div>
      {/* Footer is rendered globally in RootLayout */}
    </>
  );
}
