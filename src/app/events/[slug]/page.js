import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getActiveEventSlugs, getEventData } from '../../../../lib/server-only/getEventData';
import EventDetailClient from './EventDetailClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getActiveEventSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const event = await getEventData(slug);

    if (!event || !event.active) {
      return {
        title: 'Event | RAGESTATE',
        description: 'Discover electronic music events on RAGESTATE.',
        openGraph: {
          title: 'Event | RAGESTATE',
          description: 'Discover electronic music events on RAGESTATE.',
          siteName: 'RAGESTATE',
          images: [{ url: '/assets/RAGESTATE.png', width: 1200, height: 630, alt: 'RAGESTATE' }],
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Event | RAGESTATE',
          description: 'Discover electronic music events on RAGESTATE.',
          images: ['/assets/RAGESTATE.png'],
        },
      };
    }

    const description =
      event.description.length > 157 ? event.description.slice(0, 157) + '...' : event.description;
    const ogImage = event.imgURL || '/assets/RAGESTATE.png';

    return {
      title: `${event.name} | RAGESTATE`,
      description: description || `${event.name} — an electronic music event by RAGESTATE.`,
      alternates: { canonical: `/events/${slug}` },
      openGraph: {
        type: 'website',
        title: `${event.name} | RAGESTATE`,
        description: description || `${event.name} — an electronic music event by RAGESTATE.`,
        url: `/events/${slug}`,
        siteName: 'RAGESTATE',
        images: [{ url: ogImage, width: 1200, height: 630, alt: event.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${event.name} | RAGESTATE`,
        description: description || `${event.name} — an electronic music event by RAGESTATE.`,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error in generateMetadata:', error);
    return {
      title: 'Event | RAGESTATE',
      description: 'Discover electronic music events on RAGESTATE.',
    };
  }
}

export default async function EventDetailPage({ params }) {
  const { slug } = await params;

  const event = await getEventData(slug);

  // If event doesn't exist at all, 404
  if (!event) {
    notFound();
  }

  // Draft events: pass null so client component handles auth-gated display
  const serializedEvent = event.active ? event : null;

  // Build Event JSON-LD for active events
  const jsonLd =
    event.active
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.name,
          description: event.description || undefined,
          image: event.imgURL || undefined,
          startDate: event.startDate || undefined,
          endDate: event.endDate || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: event.location
            ? { '@type': 'Place', name: event.location }
            : undefined,
          organizer: {
            '@type': 'Organization',
            name: 'RAGESTATE',
            url: 'https://ragestate.com',
          },
          offers:
            event.price != null
              ? {
                  '@type': 'Offer',
                  price: typeof event.price === 'number' ? event.price.toFixed(2) : String(event.price),
                  priceCurrency: 'USD',
                  availability: 'https://schema.org/InStock',
                  url: `https://ragestate.com/events/${slug}`,
                }
              : undefined,
        }
      : null;

  return (
    <>
      {jsonLd && (
        <Script
          id="event-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventDetailClient slug={slug} initialEvent={serializedEvent} />
    </>
  );
}
