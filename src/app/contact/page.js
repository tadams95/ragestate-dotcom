import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import ContactForm from './ContactForm';
import FAQ from './FAQ';
import SocialLinks from './SocialLinks';

export const metadata = {
  title: 'Contact Us | RAGESTATE',
  description:
    "Get in touch with the RAGESTATE team. Questions about events, partnerships, or support — we're here to help.",
};

export default function Contact() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-red-700/20 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-red-700/10 blur-[100px]" />
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">
              We typically respond within 24 hours
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Let's{' '}
            <span className="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
              Connect
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
            Questions, partnerships, or just want to say hi? We're here to help and would love to
            hear from you.
          </p>

          {/* Social Links */}
          <div className="mt-8 flex justify-center">
            <SocialLinks />
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="relative px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Contact Info */}
            <div className="space-y-8">
              {/* Contact Cards */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Get in Touch</h2>

                {/* Email Support Card */}
                <div className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-300 hover:border-red-500/50 hover:bg-gray-900/80">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-700/20 text-red-500 transition-colors duration-300 group-hover:bg-red-700 group-hover:text-white">
                      <EnvelopeIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Email Support</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        For general inquiries and support
                      </p>
                      <a
                        href="mailto:contact@ragestate.com"
                        className="mt-2 inline-block text-red-500 transition-colors duration-200 hover:text-red-400"
                      >
                        contact@ragestate.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Business Inquiries Card */}
                <div className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-300 hover:border-red-500/50 hover:bg-gray-900/80">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-700/20 text-red-500 transition-colors duration-300 group-hover:bg-red-700 group-hover:text-white">
                      <BuildingOfficeIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Business Inquiries</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Partnerships, sponsorships & collaborations
                      </p>
                      <a
                        href="mailto:business@ragestate.com"
                        className="mt-2 inline-block text-red-500 transition-colors duration-200 hover:text-red-400"
                      >
                        business@ragestate.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700/20 text-red-500">
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
                </div>
                <FAQ />
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm sm:p-8">
                <h2 className="mb-6 text-xl font-semibold text-white">Send us a Message</h2>
                <ContactForm />
              </div>

              {/* Trust Indicators */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Secure & encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>No spam, ever</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>24-48hr response</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
