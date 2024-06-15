"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { fetchShopifyProducts } from "../../../shopify/shopifyService";
import Footer from "../components/Footer";
import ProductTile from "../../../components/ProductTile";

const navigation = [
  { name: "SHOP", href: "/shop" },
  { name: "EVENTS", href: "/events" },
  { name: "ABOUT", href: "/about" },
  { name: "PRODUCTS", href: "/products" },
  { name: "BLOG", href: "/blog" },
];

export default function Shop() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsWithHref, setProductsWithHref] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedProducts = await fetchShopifyProducts();
        const products = fetchedProducts.map((product) => ({
          ...product,
          href: `/product/${product.id}`,
          imageSrc: product.images[0]?.src,
        }));
        setProductsWithHref(products);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-black">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          className="flex items-center justify-between p-6 lg:px-8"
          aria-label="Global"
        >
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">RAGESTATE</span>
              <img
                className="h-8 w-auto"
                src="/assets/RSLogo.png"
                alt="RAGESTATE LOGO"
              />
            </Link>
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
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-gray-100"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <Link
              href="#"
              className="text-sm font-semibold leading-6 text-gray-100"
            >
              LOG IN <span aria-hidden="true">&rarr;</span>
            </Link>
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
              <Link href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">RAGESTATE</span>
                <img
                  className="h-8 w-auto"
                  src="https://firebasestorage.googleapis.com/v0/b/ragestate-app.appspot.com/o/RSLogo.png?alt=media&token=ca235ae9-35e5-4666-8ba2-3090a3e54b37"
                  alt="RAGESTATE LOGO"
                />
              </Link>
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
                    <Link
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-100 hover:bg-zinc-900"
                    >
                      {item.name}
                    </Link>
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
          <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
            {productsWithHref.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
