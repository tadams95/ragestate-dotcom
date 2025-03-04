import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Shop from "../page";
import { fetchShopifyProducts } from "../../../../shopify/shopifyService";

// Mock dependency components to simplify testing
jest.mock("../../../../shopify/shopifyService", () => ({
  fetchShopifyProducts: jest.fn(),
}));

jest.mock("../../components/Header", () => () => <div>Header</div>);
jest.mock("../../components/Footer", () => () => <div>Footer</div>);
jest.mock("../../components/styling/ShopStyling", () => () => (
  <div>ShopStyling</div>
));
jest.mock(
  "../../../../components/ProductTile",
  () =>
    ({ product, viewMode }) =>
      (
        <div data-testid="product-tile">
          {product.title} - {viewMode}
        </div>
      )
);

describe("Shop Page", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Spy on console.error before each test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clear mocks and restore console.error after each test
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it("shows a loading spinner initially", () => {
    // Make the fetch promise hang so that loading state is visible
    fetchShopifyProducts.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Shop />);
    // We check for the spinner by looking for the 'animate-spin' CSS class text.
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows an error message when product fetching fails", async () => {
    fetchShopifyProducts.mockRejectedValue(new Error("Fetch failed"));
    render(<Shop />);
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to fetch products. Please try again later./i)
      ).toBeInTheDocument()
    );
    // Optionally verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching products:",
      expect.any(Error)
    );
  });

  it("renders the products grid when products are loaded", async () => {
    // Provide an array of products
    fetchShopifyProducts.mockResolvedValue([
      {
        id: "1",
        title: "Test Product",
        images: [{ src: "test.jpg" }],
        descriptionHtml: "<p>Test description</p>",
      },
      {
        id: "2",
        title: "Second Product",
        images: [{ src: "test2.jpg" }],
        descriptionHtml: "<p>Another description</p>",
      },
    ]);
    render(<Shop />);
    // Wait for at least one product tile to be rendered
    await waitFor(() => {
      expect(screen.getAllByTestId("product-tile").length).toBe(2);
    });
  });

  it("renders a 'No products available' message when there are no products", async () => {
    fetchShopifyProducts.mockResolvedValue([]);
    render(<Shop />);
    await waitFor(() =>
      expect(screen.getByText(/No products available/i)).toBeInTheDocument()
    );
  });

  it("toggles view mode correctly", async () => {
    fetchShopifyProducts.mockResolvedValue([
      {
        id: "1",
        title: "Test Product",
        images: [{ src: "test.jpg" }],
        descriptionHtml: "<p>Test description</p>",
      },
    ]);
    render(<Shop />);
    // Wait until the product is rendered with initial viewMode ('grid')
    await waitFor(() => screen.getByTestId("product-tile"));
    expect(screen.getByText(/Test Product - grid/i)).toBeInTheDocument();

    // Use data-testid to find the list view button
    const listButton = screen.getByTestId('list-view-button');
    fireEvent.click(listButton);

    // The product tile should now be rendered with list view mode
    await waitFor(() =>
      expect(screen.getByText(/Test Product - list/i)).toBeInTheDocument()
    );
  });
});
