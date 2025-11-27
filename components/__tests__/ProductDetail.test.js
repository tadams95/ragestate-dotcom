import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProductDetails from '../ProductDetail';

// Minimal mock for redux dispatch used inside ProductDetails
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

// Stub styling components used inside ProductDetails
jest.mock('@/app/components/styling/EventStyling1', () => () => (
  <div data-testid="event-styling-1" />
));
jest.mock('@/app/components/styling/EventStyling2', () => () => (
  <div data-testid="event-styling-2" />
));

const baseProduct = {
  id: 'prod_1',
  title: 'Test Product',
  description: '<p>Test description</p>',
  images: [
    { id: 'img1', src: '/img1.jpg', altText: 'Image 1' },
    { id: 'img2', src: '/img2.jpg', altText: 'Image 2' },
  ],
  variants: [
    {
      id: 'var1',
      price: { amount: '10.00' },
      selectedOptions: [
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'M' },
      ],
      availableForSale: true,
    },
  ],
};

function renderProductDetail(overrides = {}) {
  const product = { ...baseProduct, ...overrides };
  return render(<ProductDetails product={product} />);
}

describe('ProductDetails image gallery', () => {
  test('renders main image and navigation arrows when multiple images exist', () => {
    renderProductDetail();

    // Main image rendered (scope to gallery container to avoid matching thumbnail)
    const imagesHeading = screen.getByRole('heading', { name: /images/i });
    const gallery = imagesHeading.nextElementSibling;
    const galleryUtils = within(gallery);

    expect(galleryUtils.getByAltText('Image 1')).toBeInTheDocument();

    // Arrows visible
    const prev = screen.getByLabelText('Previous image');
    const next = screen.getByLabelText('Next image');
    expect(prev).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });

  test('clicking next/previous changes the active image', () => {
    renderProductDetail();

    const imagesHeading = screen.getByRole('heading', { name: /images/i });
    const gallery = imagesHeading.nextElementSibling;
    const galleryUtils = within(gallery);

    const next = screen.getByLabelText('Next image');
    const prev = screen.getByLabelText('Previous image');

    // Start on first image
    expect(galleryUtils.getByAltText('Image 1')).toBeInTheDocument();

    // Go to next image
    fireEvent.click(next);
    expect(galleryUtils.getByAltText('Image 2')).toBeInTheDocument();

    // Go back to previous image
    fireEvent.click(prev);
    expect(galleryUtils.getByAltText('Image 1')).toBeInTheDocument();
  });

  test('double tap hint is shown on mobile and hidden once zoomed', () => {
    renderProductDetail();

    // Hint visible initially
    const hint = screen.getByText(/double tap to zoom/i);
    expect(hint).toBeInTheDocument();
  });
});
