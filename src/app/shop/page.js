"use client";

import { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
const navigation = [
  { name: "SHOP", href: "/shop" },
  { name: "EVENTS", href: "/events" },
  { name: "ABOUT", href: "/about" },
  { name: "PRODUCTS", href: "/products" },
  { name: "BLOG", href: "/blog" },
];

const products = [
  {
    id: 1,
    name: "ARES | Wrath of Gods",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/files/unisex-performance-crew-neck-t-shirt-black-back-654d74a654351.png?v=1699574962&width=1426",
    imageAlt: "Ares Wrath of Gods Black tee",
  },
  {
    id: 2,
    name: "Premium T-Shirt",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/products/mens-premium-heavyweight-tee-black-left-front-2-6408dc8f24896.png?v=1678302360",
    imageAlt: "Model wearing women's black cotton crewneck tee.",
  },
  {
    id: 3,
    name: "RND Windbreaker",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/products/unisex-lightweight-zip-up-windbreaker-blush-white-zipper-back-6410cb054ceef.png?v=1678822203",
    imageAlt: "Model wearing women's black cotton crewneck tee.",
  },
  {
    id: 4,
    name: "ARES | Wrath of Gods",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/files/unisex-performance-crew-neck-t-shirt-black-back-654d74a654351.png?v=1699574962&width=1426",
    imageAlt: "Ares Wrath of Gods Black tee",
  },
  {
    id: 5,
    name: "Premium T-Shirt",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/products/mens-premium-heavyweight-tee-black-left-front-2-6408dc8f24896.png?v=1678302360",
    imageAlt: "Model wearing women's black cotton crewneck tee.",
  },
  {
    id: 6,
    name: "RND Windbreaker",
    price: "$32",
    href: "#",
    imageSrc:
      "https://ragestate.com/cdn/shop/products/unisex-lightweight-zip-up-windbreaker-blush-white-zipper-back-6410cb054ceef.png?v=1678822203",
    imageAlt: "Model wearing women's black cotton crewneck tee.",
  },
  // More products...
];

export default function Shop() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div>
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          className="flex items-center justify-between p-6 lg:px-8"
          aria-label="Global"
        >
          <div className="flex lg:flex-1">
            <a href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">RAGESTATE</span>
              <img
                className="h-8 w-auto"
                src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo.png?alt=media&token=ca235ae9-35e5-4666-8ba2-3090a3e54b37"
                alt="RAGESTATE LOGO"
              />
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-gray-100"
              >
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a
              href="#"
              className="text-sm font-semibold leading-6 text-gray-100"
            >
              LOG IN <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </nav>
        <Dialog
          className="lg:hidden"
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
        >
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-black px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">RAGESTATE</span>
                <img
                  className="h-8 w-auto"
                  src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo.png?alt=media&token=ca235ae9-35e5-4666-8ba2-3090a3e54b37"
                  alt="RAGESTATE LOGO"
                />
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  <a
                    href="#"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                  >
                    LOG IN
                  </a>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
      <div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          {/* <div className="sm:flex sm:items-baseline sm:justify-between"> */}
          {/* <h2 className="text-2xl font-bold tracking-tight text-gray-100">
              SHOP RAGESTATE
            </h2> */}
          {/* <a
              href="#"
              className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
            >
              Browse all favorites
              <span aria-hidden="true"> &rarr;</span>
            </a> */}
          {/* </div> */}

          <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
            {products.map((product) => (
              <div key={product.id} className="group relative">
                <div className="h-96 w-full overflow-hidden rounded-lg sm:aspect-h-3 sm:aspect-w-2 group-hover:opacity-75 sm:h-auto">
                  <img
                    src={product.imageSrc}
                    alt={product.imageAlt}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-100">
                  <a href={product.href}>
                    <span className="absolute inset-0" />
                    {product.name}
                  </a>
                </h3>
                <p className="mt-1 text-sm text-gray-300">{product.price}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 sm:hidden">
            <a
              href="#"
              className="block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Browse all favorites
              <span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
