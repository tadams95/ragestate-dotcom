"use client";

import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const orders = [
  {
    number: "4376",
    status: "Delivered on January 22, 2021",
    href: "#",
    invoiceHref: "#",
    products: [
      {
        id: 1,
        name: "Machined Brass Puzzle",
        href: "#",
        price: "$95.00",
        color: "Brass",
        size: '3" x 3" x 3"',
        imageSrc:
          "https://tailwindui.com/img/ecommerce-images/order-history-page-07-product-01.jpg",
        imageAlt:
          "Brass puzzle in the shape of a jack with overlapping rounded posts.",
      },
      {
        id: 2,
        name: "Machined Brass Puzzle",
        href: "#",
        price: "$95.00",
        color: "Brass",
        size: '3" x 3" x 3"',
        imageSrc:
          "https://tailwindui.com/img/ecommerce-images/order-history-page-07-product-01.jpg",
        imageAlt:
          "Brass puzzle in the shape of a jack with overlapping rounded posts.",
      },
      {
        id: 3,
        name: "Machined Brass Puzzle",
        href: "#",
        price: "$95.00",
        color: "Brass",
        size: '3" x 3" x 3"',
        imageSrc:
          "https://tailwindui.com/img/ecommerce-images/order-history-page-07-product-01.jpg",
        imageAlt:
          "Brass puzzle in the shape of a jack with overlapping rounded posts.",
      },
      // More products...
    ],
  },
  // More orders...
];

const fetchUserPurchases = async (userId) => {
  try {
    const firestore = getFirestore();
    const purchasesRef = collection(firestore, `customers/${userId}/purchases`);
    const querySnapshot = await getDocs(purchasesRef);
    const userPurchases = [];
    querySnapshot.forEach((doc) => {
      const purchaseData = doc.data();
      userPurchases.push(purchaseData);
    });
    return userPurchases;
  } catch (error) {
    console.error("Error fetching user purchases: ", error);
    return [];
  }
};

export default function OrderHistory() {
  const userId = localStorage.getItem("userId");
  const [userPurchases, setUserPurchases] = useState([]);

  useEffect(() => {
    fetchUserPurchases(userId)
      .then((userPurchases) => {
        setUserPurchases(userPurchases);
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  }, [userId]);

  console.log("User Purchases from Order History: ", userPurchases);

  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-3xl px-4  sm:px-6 ">
        <div className="max-w-l">
          <h1
            id="your-orders-heading"
            className="text-3xl font-bold tracking-tight text-gray-100 text-center"
          >
            Your Orders
          </h1>
          <p className="mt-2 text-sm text-gray-200">
            View your order history. In the future we'll have more here such as
            order status.
          </p>
          <p className="mt-2 text-sm text-gray-200">
            If you have any questions or concerns, email contact@ragestate.com
            or DM @ragestate on IGs
          </p>
        </div>

        <div className="mt-12 space-y-16 sm:mt-16">
          {orders.map((order) => (
            <section
              key={order.number}
              aria-labelledby={`${order.number}-heading`}
            >
              <div className="space-y-1 md:flex md:items-baseline md:space-x-2 md:space-y-0">
                <h2
                  id={`${order.number}-heading`}
                  className="text-lg font-medium text-gray-100 md:flex-shrink-0"
                >
                  Order #{order.number}
                </h2>
              </div>

              <div className="-mb-6 mt-6 flow-root divide-y divide-gray-200 border-t border-gray-200">
                {order.products.map((product) => (
                  <div key={product.id} className="py-6 sm:flex items-center">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 lg:space-x-8">
                      <img
                        alt={product.imageAlt}
                        src={product.imageSrc}
                        className="h-20 w-20 sm:h-48 sm:w-48 flex-none rounded-md object-cover object-center"
                      />
                      <div className="min-w-0 flex-1 sm:mt-0 mt-4">
                        <h3 className="text-sm font-medium text-gray-100">
                          <a href={product.href}>{product.name}</a>
                        </h3>
                        <p className="truncate text-sm text-gray-300">
                          <span>{product.color}</span>{" "}
                          <span
                            aria-hidden="true"
                            className="mx-1 text-gray-300"
                          >
                            &middot;
                          </span>{" "}
                          <span>{product.size}</span>
                        </p>
                        <p className="mt-1 font-medium text-gray-100">
                          {product.price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
