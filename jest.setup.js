require('@testing-library/jest-dom');

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

// Mock window.scrollTo when window exists (jsdom). In node env this is undefined.
if (global.window) {
  global.window.scrollTo = jest.fn();
}
