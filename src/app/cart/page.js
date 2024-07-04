"use client";

import { useState, useEffect } from "react";
import { TruckIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useSelector, useDispatch } from "react-redux";
import { selectAuthenticated } from "../../../lib/features/todos/userSlice";

import Header from "../components/Header";
import Footer from "../components/Footer";

import {
  selectCartItems,
  removeFromCart,
  setCheckoutPrice,
} from "../../../lib/features/todos/cartSlice";

import Link from "next/link";
import EmptyCart from "../../../components/EmptyCart";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";

export default function Cart() {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const isAuthenticated = useSelector(selectAuthenticated);

  console.log("Cart Items: ", cartItems);

  const handleRemoveFromCart = (productId, selectedColor, selectedSize) => {
    dispatch(removeFromCart({ productId, selectedColor, selectedSize }));
  };

  useEffect(() => {
    // Calculate subtotal price
    const newCartSubtotal = cartItems.reduce((accumulator, item) => {
      const itemPrice = parseFloat(item.price);
      return accumulator + itemPrice;
    }, 0);

    setCartSubtotal(newCartSubtotal);

    // Calculate tax and total price
    const taxRate = 0.075;
    const taxTotal = newCartSubtotal * taxRate;

    const newTotalPrice = newCartSubtotal + taxTotal + shipping;

    setTotalPrice(newTotalPrice);
    dispatch(setCheckoutPrice(newTotalPrice * 100)); // Convert to cents for Stripe
  }, [cartItems, dispatch]);

  const taxRate = 0.075;
  const taxTotal = (cartSubtotal * taxRate).toFixed(2);

  // Initialize shipping cost
  let shipping = 0.0;

  // Check if there are any physical (non-digital) items in the cart
  const hasPhysicalItems = cartItems.some((item) => !item.isDigital);

  // Adjust shipping based on the presence of physical items
  if (hasPhysicalItems) {
    shipping = 9.99;
  } else {
    shipping = 0.0; // No shipping cost for digital items
  }

  const total = (
    parseFloat(cartSubtotal) +
    parseFloat(taxTotal) +
    shipping
  ).toFixed(2);

  return (
    <div className="bg-black isolate">
      <Header />
      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6 lg:max-w-7xl lg:px-8">
          <RandomDetailStyling />
          <h1 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Shopping Cart
          </h1>
          <form className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
            <section aria-labelledby="cart-heading" className="lg:col-span-7">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-100"
              >
                {cartItems.map((item, index) => (
                  <li
                    key={`${item.productId}-${item.selectedColor}-${item.selectedSize}-${index}`}
                    className="flex py-6 sm:py-10"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={item.images[0].src || item.images}
                        alt={item.title}
                        className="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48"
                      />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                      <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-sm">
                              <Link
                                href="/shop"
                                className="font-medium text-gray-100 hover:text-gray-500"
                              >
                                {item.title}
                              </Link>
                            </h3>
                          </div>
                          <div className="mt-1 flex text-sm">
                            <p className="text-gray-100">
                              {item.selectedColor}
                            </p>
                            {item.selectedSize ? (
                              <p className="ml-4 border-l border-gray-200 pl-4 text-gray-100">
                                {item.selectedSize}
                              </p>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-100">
                            ${item.price}
                          </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:pr-9">
                          <label
                            htmlFor={`quantity-${index}`}
                            className="sr-only"
                          >
                            Quantity, {item.title}
                          </label>
                          <select
                            id={`quantity-${index}`}
                            name={`quantity-${index}`}
                            className="max-w-full rounded-md border border-gray-900 py-1.5 text-left text-base font-medium leading-5 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                            <option value={6}>6</option>
                            <option value={7}>7</option>
                            <option value={8}>8</option>
                          </select>

                          <div className="absolute right-0 top-0">
                            <button
                              type="button"
                              className="-m-2 inline-flex p-2 text-gray-100 hover:text-red-500"
                              onClick={() =>
                                handleRemoveFromCart(
                                  item.productId,
                                  item.selectedColor,
                                  item.selectedSize
                                )
                              }
                            >
                              <span className="sr-only">Remove</span>
                              <XMarkIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 flex space-x-2 text-sm text-gray-500">
                        <TruckIcon
                          className="h-5 w-5 flex-shrink-0 text-gray-100"
                          aria-hidden="true"
                        />
                        {/* Always render ClockIcon */}
                        <span className="text-gray-200">{`Ships in 1-2 weeks`}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Order summary */}
            <section
              aria-labelledby="summary-heading"
              className="mt-16 rounded-lg bg-transparent px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8 border border-solid border-gray-100"
            >
              <h2
                id="summary-heading"
                className="text-lg font-medium text-gray-100"
              >
                Order summary
              </h2>

              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-100">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-100">
                    ${cartSubtotal.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex items-center text-sm text-gray-100">
                    <span>Shipping</span>
                  </dt>
                  <dd className="text-sm font-medium text-gray-100">
                    ${shipping.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex text-sm text-gray-100">
                    <span>Tax</span>
                  </dt>
                  <dd className="text-sm font-medium text-gray-100">
                    ${taxTotal}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-100">
                    Order total
                  </dt>
                  <dd className="text-base font-medium text-gray-100">
                    ${total}
                  </dd>
                </div>
              </dl>

              <div className="mt-10">
                {isAuthenticated ? (
                  <button
                    type="submit"
                    className="w-full rounded-md border border-solid border-gray-100 bg-transparent px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                  >
                    Checkout
                  </button>
                ) : (
                  <div>
                    <p className="text-sm text-gray-100 mb-2 text-center">
                      Please log in or create an account to checkout.
                    </p>
                    {/* You can add a link to the login or signup page here */}
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                      <Link
                        href="/login"
                        className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Login
                      </Link>

                      <Link
                        href="/create-account"
                        className="flex  items-center justify-center rounded-md border border-gray-100 px-8 py-2 text-base font-medium text-white hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center text-sm">
                <p>
                  <Link
                    href="/shop"
                    className="font-medium text-gray-100 hover:text-red-500"
                  >
                    Continue Shopping
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </p>
              </div>
            </section>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
