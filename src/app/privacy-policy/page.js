'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const sections = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: [
      {
        subtitle: 'Account Information',
        text: 'When you create an account, we collect your email address, display name, and profile picture. If you sign in with Google or Apple, we receive basic profile information from those services.',
      },
      {
        subtitle: 'Payment Information',
        text: 'When you purchase event tickets or merchandise, our payment processor (Stripe) collects your payment card details. We store only a reference to your Stripe customer ID and basic order information—we never store your full card number.',
      },
      {
        subtitle: 'Event & Ticket Data',
        text: 'We store information about your ticket purchases, including event details, ticket quantities, and scan history for entry verification.',
      },
      {
        subtitle: 'Social Feed Activity',
        text: 'If you use our social feed, we collect the content you post (text, images, videos), your likes, comments, and who you follow.',
      },
      {
        subtitle: 'Device & Usage Information',
        text: 'We automatically collect information about your device (browser type, operating system) and how you interact with our platform (pages visited, features used) through Vercel Analytics.',
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    items: [
      'Process and fulfill your event ticket and merchandise orders',
      'Verify your identity and ticket ownership at event check-in',
      'Send you order confirmations, ticket details, and event updates',
      'Enable social features like posting, following, and engaging with other users',
      'Send marketing emails about upcoming events (only if you opt in)',
      'Improve our platform through analytics and user feedback',
      'Prevent fraud and ensure platform security',
      'Comply with legal obligations',
    ],
  },
  {
    id: 'data-sharing',
    title: '3. How We Share Your Information',
    content: [
      {
        subtitle: 'Service Providers',
        text: 'We share data with trusted third parties who help us operate our platform:',
        list: [
          'Stripe — Payment processing',
          'Firebase (Google) — Database, authentication, and file storage',
          'Shopify — Merchandise fulfillment',
          'Amazon SES / Resend — Transactional and marketing emails',
          'Vercel — Website hosting and analytics',
        ],
      },
      {
        subtitle: 'Event Organizers',
        text: 'When you purchase tickets, event organizers may receive your name and email for event-related communications.',
      },
      {
        subtitle: 'Legal Requirements',
        text: 'We may disclose information if required by law, court order, or to protect the rights, property, or safety of RAGESTATE, our users, or the public.',
      },
    ],
  },
  {
    id: 'data-security',
    title: '4. Data Security',
    text: "We implement industry-standard security measures to protect your data, including HTTPS encryption, secure Firebase rules, and Stripe's PCI-compliant payment processing. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    id: 'data-retention',
    title: '5. Data Retention',
    text: 'We retain your account information for as long as your account is active. Purchase records are kept for legal and accounting purposes (typically 7 years). You can request deletion of your account and associated data at any time by contacting us.',
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    items: [
      'Access — Request a copy of the personal data we hold about you',
      'Correction — Update or correct inaccurate information',
      'Deletion — Request deletion of your account and personal data',
      'Portability — Receive your data in a machine-readable format',
      'Opt-out — Unsubscribe from marketing emails at any time',
    ],
    text: 'To exercise these rights, contact us at support@ragestate.com.',
  },
  {
    id: 'cookies',
    title: '7. Cookies & Local Storage',
    text: 'We use cookies and local storage to keep you logged in, remember your preferences (like dark/light mode), and improve your experience. We use Vercel Analytics for aggregated, privacy-friendly usage statistics. We do not use third-party advertising cookies.',
  },
  {
    id: 'childrens-privacy',
    title: "8. Children's Privacy",
    text: 'RAGESTATE is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us immediately.',
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    text: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website or sending you an email. Your continued use of RAGESTATE after changes constitutes acceptance of the updated policy.',
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    text: 'If you have questions about this Privacy Policy or our data practices, please contact us at:',
    contact: {
      email: 'support@ragestate.com',
      company: 'RAGESTATE, LLC',
    },
  },
];

function Section({ section, index }) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <motion.section
      ref={ref}
      id={section.id}
      className="mb-12"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={
        prefersReducedMotion
          ? { opacity: 1, y: 0 }
          : { opacity: inView ? 1 : 0, y: inView ? 0 : 20 }
      }
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
        {section.title}
      </h2>

      {/* Simple text paragraph */}
      {section.text && (
        <p className="leading-relaxed text-[var(--text-secondary)]">{section.text}</p>
      )}

      {/* Content with subtitles */}
      {section.content && (
        <div className="space-y-6">
          {section.content.map((item, i) => (
            <div key={i}>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{item.subtitle}</h3>
              <p className="leading-relaxed text-[var(--text-secondary)]">{item.text}</p>
              {item.list && (
                <ul className="mt-3 list-inside list-disc space-y-1 text-[var(--text-secondary)]">
                  {item.list.map((listItem, j) => (
                    <li key={j}>{listItem}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bullet list items */}
      {section.items && (
        <ul className="mt-4 list-inside list-disc space-y-2 text-[var(--text-secondary)]">
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {/* Contact info */}
      {section.contact && (
        <div className="mt-4 rounded-lg bg-[var(--bg-elev-1)] p-4">
          <p className="font-semibold text-[var(--text-primary)]">{section.contact.company}</p>
          <a
            href={`mailto:${section.contact.email}`}
            className="text-[var(--accent)] hover:underline"
          >
            {section.contact.email}
          </a>
        </div>
      )}
    </motion.section>
  );
}

export default function PrivacyPolicy() {
  const prefersReducedMotion = useReducedMotion();
  const { ref: headerRef, inView: headerInView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const lastUpdated = 'January 4, 2026';

  return (
    <div className="min-h-screen bg-[var(--bg-root)] transition-colors duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-red-900/10 to-[var(--bg-root)] px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.02]" />
        <motion.div
          ref={headerRef}
          className="relative mx-auto max-w-3xl text-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1, y: 0 }
              : { opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 30 }
          }
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-secondary)]">
            At RAGESTATE, we respect your privacy and are committed to protecting your personal
            information. This policy explains what data we collect, how we use it, and your rights.
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Table of Contents */}
        <motion.nav
          className="mb-12 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Contents
          </h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                >
                  {index + 1}. {section.title.replace(/^\d+\.\s*/, '')}
                </a>
              </li>
            ))}
          </ol>
        </motion.nav>

        {/* Sections */}
        {sections.map((section, index) => (
          <Section key={section.id} section={section} index={index} />
        ))}

        {/* Footer Note */}
        <motion.div
          className="mt-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 text-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-sm text-[var(--text-secondary)]">
            By using RAGESTATE, you agree to this Privacy Policy. If you do not agree with our
            practices, please do not use our services.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
