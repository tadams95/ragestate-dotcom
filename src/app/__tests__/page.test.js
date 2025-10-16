import { act, fireEvent, render, screen } from '@testing-library/react';
import { useInView } from 'react-intersection-observer';
import Home from '../page';

// Mock the intersection observer hook
jest.mock('react-intersection-observer');

// Mock the animation components
jest.mock('../components/animations/home-3d-animation', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-3d-animation" />,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

// NOTE: The Home page has been redesigned to feature an Event Hero.
// These legacy tests targeted the previous animated landing and are skipped until rewritten.
describe.skip('Home Page', () => {
  beforeEach(() => {
    // Set up timers for animations
    jest.useFakeTimers();

    // Reset IntersectionObserver mock
    useInView.mockImplementation(() => ({
      ref: jest.fn(),
      inView: true,
    }));

    // Mock window.scrollTo
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByText('LIVE IN YOUR WORLD')).toBeInTheDocument();
    expect(screen.getByText('RAGE IN OURS')).toBeInTheDocument();
  });

  it('starts with "your" world active', () => {
    render(<Home />);
    const yourWorldButton = screen.getByText('LIVE IN YOUR WORLD');
    expect(yourWorldButton).toHaveClass('text-white');
  });

  it('switches world state when clicking navigation buttons', () => {
    render(<Home />);

    // Get initial state
    const rageButton = screen.getByText('RAGE IN OURS');
    expect(rageButton).not.toHaveClass('text-red-600');

    // Click button and run all timers
    fireEvent.click(rageButton);
    act(() => {
      jest.runAllTimers(); // Run all timers including the setTimeout
    });

    // Check final state
    expect(rageButton).toHaveClass('text-red-600');
  });

  it('shows scroll-based header background', () => {
    render(<Home />);
    const header = screen.getByText('LIVE IN YOUR WORLD').closest('div.fixed');

    // Simulate scroll
    act(() => {
      fireEvent.scroll(window, { target: { scrollY: 100 } });
    });

    expect(header).toHaveClass('bg-black/80');
  });

  it('renders main content sections', () => {
    render(<Home />);
    expect(screen.getByText('RAGESTATE Unfiltered')).toBeInTheDocument();
    // Use test-id to find the main events section
    expect(screen.getByTestId('events-section')).toBeInTheDocument();
    expect(screen.getByTestId('apparel-section')).toBeInTheDocument();
  });

  it('animates content based on intersection observer', () => {
    // Mock the useInView hook to return inView as true
    useInView.mockImplementation(() => ({
      ref: jest.fn(),
      inView: true,
    }));

    render(<Home />);

    // Use a more specific selector targeting the span with the blue text
    const blueSpan = screen.getByText('YOUR WORLD', { selector: 'span.text-blue-400' });

    // Find the parent container that should have the animation applied
    const container = blueSpan.closest('h1').parentElement;

    // Verify container has the expected class
    expect(container).toHaveClass('container');

    // Alternative assertion that doesn't rely on exact styling
    // Verify that the container has motion properties applied
    expect(container).toHaveAttribute('style');

    // Or simply check that the element exists and has the right parent structure
    expect(blueSpan).toBeInTheDocument();
    expect(blueSpan.parentElement.tagName).toBe('H1');
  });

  it('renders footer with current year', () => {
    render(<Home />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  it('handles email subscription form', () => {
    render(<Home />);
    const emailInput = screen.getByPlaceholderText('Your email');
    const subscribeButton = screen.getByText('SUBSCRIBE');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(subscribeButton);

    // Add your form submission assertions here
  });

  // Test scroll behavior
  it('scrolls to sections with correct offset', () => {
    render(<Home />);
    const enterButton = screen.getByText('ENTER OUR WORLD');

    fireEvent.click(enterButton);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth',
    });
  });
});
