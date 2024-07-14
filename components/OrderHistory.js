"use client";

import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";

import Image from "next/image";

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
  const [userId, setUserId] = useState("");
  const [userPurchases, setUserPurchases] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userIdFromLocalStorage = localStorage.getItem("userId");
      setUserId(userIdFromLocalStorage);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserPurchases(userId)
        .then((userPurchases) => {
          setUserPurchases(userPurchases);
        })
        .catch((error) => {
          console.error("Error: ", error);
        });
    }
  }, [userId]);

  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="max-w-l">
          <h1 className="text-3xl font-bold tracking-tight text-gray-100 text-center">
            Your Orders
          </h1>
          <p className="mt-2 text-sm text-center text-gray-200">
            View your order history. In the future we'll have more here such as
            order status.
          </p>
          <p className="mt-2 text-sm text-center text-gray-200">
            If you have any questions or concerns, email contact@ragestate.com
            or DM @ragestate on IGs
          </p>
        </div>

        <div className="mt-12 space-y-16 sm:mt-16">
          {userPurchases.map((purchase, index) => (
            <div key={index} className="space-y-6 border rounded-md p-4  mt-4">
              <div className="dateContainer">
                <h2 className="text-lg text-center font-medium text-gray-100">
                  Purchase Date:{" "}
                  {purchase.dateTime.toDate().toLocaleDateString()}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
                {purchase.cartItems.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="bg-transparent p-4 mx-auto" // Add mx-auto to center horizontally
                  >
                    <Image
                      priority
                      src={item.productImageSrc}
                      alt={item.title}
                      height={250}
                      width={250}
                    />
                    <p className="text-sm font-medium text-gray-100 mb-2 mt-2">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-300 mb-1">
                      QTY: {item.quantity}
                    </p>
                    <p className="text-sm text-gray-300 mb-1">
                      Price: ${item.price}
                    </p>
                    {item.color && (
                      <p className="text-sm text-gray-300 mb-1">
                        Color: {item.color}
                      </p>
                    )}
                    {item.size && (
                      <p className="text-sm text-gray-300 mb-1">
                        Size: {item.size}
                      </p>
                    )}
                    {/* Add more details as needed */}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
