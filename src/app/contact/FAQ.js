'use client';

import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import { useState } from 'react';

const faqs = [
  {
    question: 'How do I purchase tickets for RAGESTATE events?',
    answer:
      "You can purchase tickets directly through our Events page. Select the event you want to attend, choose your ticket type and quantity, and complete checkout. You'll receive a confirmation email with your ticket details and QR code.",
  },
  {
    question: 'What is your refund policy?',
    answer:
      'Tickets are generally non-refundable, but we offer transfers to other events or future credit on a case-by-case basis. Please contact us at least 48 hours before the event for any ticket-related concerns.',
  },
  {
    question: 'How can I become a vendor or sponsor?',
    answer:
      'We\'re always looking for brand partners and vendors who align with our vision. Select "Business / Partnerships" in the contact form above and tell us about your brand. Our team will review and get back to you within 5-7 business days.',
  },
  {
    question: 'Do you offer group discounts?',
    answer:
      "Yes! For groups of 10 or more, we offer special pricing. Reach out to us with your group size and the event you're interested in, and we'll work out a custom package for you.",
  },
  {
    question: 'How do I stay updated on upcoming events?',
    answer:
      'Follow us on social media (Instagram, Twitter/X, TikTok) for the latest announcements. You can also create an account on our site to receive email notifications about new events and exclusive presale access.',
  },
  {
    question: 'I have an issue with my order. What should I do?',
    answer:
      'Select "Customer Support" in the contact form and include your order confirmation number. Our support team typically responds within 24-48 hours. For urgent issues on event day, DM us on Instagram for faster response.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="divide-y divide-gray-800">
      {faqs.map((faq, index) => (
        <div key={index} className="py-4">
          <button
            onClick={() => toggleFAQ(index)}
            className="flex w-full items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-expanded={openIndex === index}
          >
            <span className="pr-4 text-base font-medium text-gray-200 transition-colors duration-200 hover:text-white">
              {faq.question}
            </span>
            <ChevronDownIcon
              className={`h-5 w-5 flex-shrink-0 text-red-500 transition-transform duration-300 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === index ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="text-sm leading-relaxed text-gray-400">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
