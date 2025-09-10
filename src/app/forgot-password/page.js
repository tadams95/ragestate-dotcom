"use client";

import { useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { forgotPassword } from "../../../firebase/util/auth";

import Header from "../components/Header";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import Footer from "../components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function confirmReset(e) {
    e.preventDefault(); // Prevent default form submission
    console.log("Submitting password reset for:", email);

    const success = await forgotPassword(email);

    if (success) {
      window.alert("Reset Password Email Sent");
      router.push("/login");
    }
  }

  // Memoize the onChange handlers using useCallback
  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
  }, []);

  return (
    <>
      <RandomDetailStyling />
      <Header />
      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 isolate">
        <div className="sm:mx-auto sm:w-1/2">
          <h2 className="mt-52 text-center text-2xl font-bold leading-9 tracking-tight text-gray-100">
            RESET YOUR PASSWORD BELOW
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full md:w-full sm:max-w-[480px]">
          <div className="bg-transparent border border-white py-12 shadow rounded-lg px-12">
            <form className="space-y-6" onSubmit={confirmReset}>
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-100"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className="block w-full rounded-md border-0 py-1.5 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    style={{ paddingLeft: "10px" }} // Adjust the padding-left here
                  />
                </div>
              </div>

              {/* Sign in button */}
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md border border-white bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
