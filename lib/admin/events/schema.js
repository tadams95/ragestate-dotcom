import { z } from 'zod';

// Shared zod schema for event creation
export const eventCreateSchema = z.object({
  name: z.string().min(4).max(80),
  description: z.string().min(20).max(5000),
  imgURL: z.string().url(),
  price: z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number().min(0).max(1000),
  ),
  age: z.number().int().min(0).max(119).optional().nullable(),
  dateTime: z.string(), // ISO string from client, server converts to Timestamp
  location: z.string().min(4).max(140),
  quantity: z.number().int().min(0).max(50000),
  capacity: z.number().int().min(0).max(50000).optional(),
  isDigital: z.boolean().optional(),
  category: z.string().max(40).optional(),
  guests: z.array(z.string().max(40)).max(20).optional(),
  active: z.boolean().optional(),
});

export function coerceAndValidate(data) {
  const parsed = eventCreateSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, code: mapIssueToCode(issue), issue };
  }
  return { ok: true, value: parsed.data };
}

function mapIssueToCode(issue) {
  const path = issue.path[0];
  switch (path) {
    case 'name':
      return 'NAME_INVALID';
    case 'description':
      return 'DESCRIPTION_INVALID';
    case 'price':
      return 'PRICE_INVALID';
    case 'age':
      return 'AGE_INVALID';
    case 'dateTime':
      return 'DATETIME_INVALID';
    case 'location':
      return 'LOCATION_INVALID';
    case 'quantity':
      return 'QUANTITY_INVALID';
    case 'capacity':
      return 'CAPACITY_INVALID';
    case 'category':
      return 'CATEGORY_INVALID';
    case 'guests':
      return 'GUESTS_INVALID';
    case 'imgURL':
      return 'IMG_URL_INVALID';
    default:
      return 'VALIDATION_ERROR';
  }
}
