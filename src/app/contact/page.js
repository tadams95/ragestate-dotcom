import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <>
      {/* Header is rendered by layout.js */}
      <div className="isolate bg-black px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl sm:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Contact Us
          </h2>
          <p className="mt-2 text-lg leading-8 text-gray-300">
            We're here to help and answer any question you might have. We look forward to hearing
            from you.
          </p>
        </div>
        <div className="mx-auto mt-20 max-w-lg space-y-16">
          <div className="flex gap-x-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-700">
              <EnvelopeIcon aria-hidden="true" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-7 text-gray-100">Email Support</h3>
              <p className="text-gray-6300 mt-2 leading-7">
                Email us at{' '}
                <a href="mailto:contact@ragestate.com" className="hover:text-blue">
                  contact@ragestate.com
                </a>{' '}
                and we'll get back to you!
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
