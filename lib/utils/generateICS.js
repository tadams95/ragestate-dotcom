/**
 * Generate an .ics calendar file for an event
 *
 * @param {Object} options
 * @param {string} options.title - Event name (SUMMARY)
 * @param {string|Date} options.startDate - Event start date/time
 * @param {string|Date} [options.endDate] - Event end date/time (defaults to start + 3 hours)
 * @param {string} [options.location] - Venue name and address
 * @param {string} [options.description] - Event description
 * @param {string} [options.uid] - Unique identifier (defaults to generated UUID)
 * @returns {string} ICS file content
 */
export function generateICS({ title, startDate, endDate, location, description, uid }) {
  // Parse start date
  const start = startDate instanceof Date ? startDate : new Date(startDate);

  // Default end to start + 3 hours if not provided
  let end;
  if (endDate) {
    end = endDate instanceof Date ? endDate : new Date(endDate);
  } else {
    end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // +3 hours
  }

  // Format date to ICS format: YYYYMMDDTHHMMSSZ (UTC)
  const formatDateUTC = (date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  // Generate UID if not provided
  const eventUID =
    uid || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@ragestate.com`;

  // Current timestamp for DTSTAMP
  const now = formatDateUTC(new Date());

  // Escape special characters for ICS text fields
  const escapeText = (text) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  // Build ICS content
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RAGESTATE//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventUID}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDateUTC(start)}`,
    `DTEND:${formatDateUTC(end)}`,
    `SUMMARY:${escapeText(title)}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`);
  }

  if (description) {
    lines.push(`DESCRIPTION:${escapeText(description)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Download an .ics file to the user's device
 *
 * @param {Object} event - Event data
 * @param {string} event.eventName - Event name
 * @param {string|Date} event.eventDate - Event date/time
 * @param {string} [event.location] - Venue address
 * @param {string} [event.ticketToken] - Ticket identifier for description
 */
export function downloadEventICS(event) {
  const { eventName, eventDate, eventTime, location, ticketToken, eventId, id } = event;

  // Parse the event date
  let startDate;
  if (eventDate) {
    startDate = new Date(eventDate);
    // If we have a separate time string like "10:00 PM", try to parse it
    if (eventTime && eventTime !== 'TBA') {
      const timeMatch = eventTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2] || '0', 10);
        const meridiem = timeMatch[3];
        if (meridiem) {
          if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        startDate.setHours(hours, minutes, 0, 0);
      }
    }
  } else {
    startDate = new Date();
  }

  // Build description
  const description = [
    `Event: ${eventName}`,
    location ? `Location: ${location}` : null,
    '',
    '🎫 Show your QR code at the door',
    'Open your ticket in the RAGESTATE app to display your entry QR code.',
  ]
    .filter(Boolean)
    .join('\\n');

  // Generate unique ID from ticket data
  const uid = `${ticketToken || `${eventId}-${id}`}@ragestate.com`;

  const icsContent = generateICS({
    title: eventName || 'RAGESTATE Event',
    startDate,
    location,
    description,
    uid,
  });

  // Create blob and trigger download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${(eventName || 'event').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
