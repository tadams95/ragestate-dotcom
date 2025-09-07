"use client";

import { useState } from "react";
import UserCircleIcon from "@heroicons/react/24/solid/UserCircleIcon";
import MusicalNoteIcon from "@heroicons/react/24/solid/MusicalNoteIcon";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RandomDetailStyling from "../components/styling/RandomDetailStyling";
import Image from "next/image";

import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const paymentOptions = [
  { value: "Venmo" },
  { value: "PayPal" },
  { value: "Cashapp" },
  { value: "Zelle" },
];

export default function GuestMix() {
  const [name, setName] = useState("");
  const [paymentOption, setPaymentOption] = useState("");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [mixDescription, setMixDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [mixUpload, setMixUpload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const firestore = getFirestore();
  const storage = getStorage();

  const handleCancel = () => {
    setName("");
    setPaymentOption("null");
    setPaymentHandle("");
    setMixDescription("");
    setCoverPhoto(null);
    setMixUpload(null);
  };

  const handleSubmission = async (event) => {
    event.preventDefault();

    // Perform basic validation
    if (
      !name ||
      !paymentOption ||
      !paymentHandle ||
      !mixDescription ||
      !mixUpload ||
      !coverPhoto
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsLoading(true); // Set loading state to true during submission

    try {
      // Upload cover photo to Firebase Storage
      const coverPhotoRef = ref(storage, `guest-mix-cover-photo/${name}`);
      await uploadBytes(coverPhotoRef, coverPhoto);
      const coverPhotoUrl = await getDownloadURL(coverPhotoRef);

      // Upload mix file to Firebase Storage
      const mixFileRef = ref(storage, `guest-mixes/${name}`);
      await uploadBytes(mixFileRef, mixUpload);
      const mixFileUrl = await getDownloadURL(mixFileRef);

      // Save mix details to Firestore
      const today = new Date(); // Create a new Date object for today

      // Save mix details to Firestore
      await setDoc(doc(firestore, "guest-mixes", name), {
        name,
        paymentOption,
        paymentHandle,
        mixDescription,
        coverPhotoUrl,
        mixFileUrl,
        createdAt: today,
      });

      // Reset form state after successful submission
      handleCancel();

      alert("Guest mix submitted successfully!");
    } catch (error) {
      console.error("Error submitting guest mix:", error);
      alert("Failed to submit guest mix. Please try again later.");
    } finally {
      setIsLoading(false); // Set loading state back to false after submission
    }
  };
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    setCoverPhoto(file);
  };

  const handleMixUpload = (event) => {
    const mix = event.target.files[0]; // Access the first file in the list
    setMixUpload(mix);
  };

  return (
    <>
      <RandomDetailStyling />
      <Header />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mt-24 text-center text-l font-bold leading-9 tracking-tight text-gray-100">
          SUBMIT YOUR GUEST MIX BELOW!
        </h2>
        {/* We've used 3xl here, but feel free to try other max-widths based on your needs */}
        <div className="mx-auto max-w-3xl">
          <form className="mt-12">
            <div className="space-y-12">
              <div className="border-b border-gray-900/10 pb-12">
                <h2 className="text-base font-semibold leading-7 text-gray-100">
                  SUBMISSION DETAILS
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-300">
                  This information will be displayed publicly so be careful what
                  you share.
                </p>

                <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium leading-6 text-gray-100"
                    >
                      Name
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-900 sm:max-w-md">
                        <input
                          required
                          id="username"
                          name="username"
                          type="text"
                          placeholder="Name"
                          autoComplete="username"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-100 placeholder-gray-300 focus:ring-0 sm:text-sm sm:leading-6"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-4">
                    <div>
                      <h2 className="text-sm font-medium text-gray-100">
                        Payment Option
                      </h2>

                      <fieldset
                        aria-label="Choose a payment option"
                        className="mt-2"
                      >
                        <select
                          value={paymentOption}
                          onChange={(e) => setPaymentOption(e.target.value)}
                          className="pr-8 mb-1 py-1 border text-base font-medium text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
                        >
                          <option className="pr-4" value="">
                            Select one
                          </option>
                          {paymentOptions.map((paymentOption, index) => (
                            <option key={index} value={paymentOption.value}>
                              {paymentOption.value}
                            </option>
                          ))}
                        </select>
                      </fieldset>
                    </div>

                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-900 sm:max-w-md">
                        <input
                          required
                          id="paymentHandle"
                          name="paymentHandle"
                          type="text"
                          placeholder="@/$..."
                          autoComplete="off"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-100 placeholder:text-gray-300 focus:ring-0 sm:text-sm sm:leading-6"
                          value={paymentHandle}
                          onChange={(e) => setPaymentHandle(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-full">
                    <label
                      htmlFor="about"
                      className="block text-sm font-medium leading-6 text-gray-100"
                    >
                      Description
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="about"
                        name="about"
                        rows={3}
                        className="block w-full bg-transparent rounded-md border-0 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-900 sm:text-sm sm:leading-6"
                        value={mixDescription}
                        onChange={(e) => setMixDescription(e.target.value)}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-300">
                      Write a few sentences about the mix. A general description
                      and/or Track List.
                    </p>
                  </div>

                  <div className="col-span-full">
                    <label
                      htmlFor="cover-photo-upload"
                      className="block text-sm font-medium leading-6 text-center text-gray-100"
                    >
                      Cover Photo
                    </label>
                    <div className="mt-2 flex items-center justify-center gap-x-3 border p-8 rounded-md">
                      {coverPhoto ? (
                        <Image
                          src={URL.createObjectURL(coverPhoto)}
                          alt="Cover"
                          height={200}
                          width={200}
                        />
                      ) : (
                        <UserCircleIcon
                          aria-hidden="true"
                          className="h-12 w-12 text-gray-300 rounded-full bg-gray-200 flex items-center justify-center"
                        />
                      )}
                      <div className="flex flex-col items-center text-sm leading-6 text-gray-600">
                        <label
                          htmlFor="cover-photo-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-black focus-within:outline-none focus-within:ring-2 focus-within:ring-red-600 focus-within:ring-offset-2 hover:text-red-600"
                        >
                          <span className="mx-2 text-center justify-center">
                            Upload an image
                          </span>
                          <input
                            id="cover-photo-upload"
                            name="cover-photo-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-full">
                    <label
                      htmlFor="mix-upload"
                      className="block text-sm font-medium leading-6 text-center text-gray-100"
                    >
                      Mix Upload
                    </label>
                    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-100 px-6 py-10">
                      <div className="text-center">
                        {mixUpload ? (
                          <div className="text-center">
                            <CheckIcon
                              aria-hidden="true"
                              className="mx-auto h-12 w-12 text-gray-300"
                            />
                            <p className="mt-2">{mixUpload.name}</p>
                          </div>
                        ) : (
                          <MusicalNoteIcon
                            aria-hidden="true"
                            className="mx-auto h-12 w-12 text-gray-300"
                          />
                        )}
                        <div className="mt-4 flex justify-center text-sm leading-6 text-gray-600">
                          <label
                            htmlFor="mix-upload"
                            className="relative cursor-pointer rounded-md bg-white font-semibold text-black focus-within:outline-none focus-within:ring-2 focus-within:ring-red-600 focus-within:ring-offset-2 hover:text-red-600"
                          >
                            <span className="mx-2">Upload a file</span>
                            <input
                              id="mix-upload"
                              name="mix-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleMixUpload}
                            />
                          </label>
                        </div>
                        <p className="text-xs leading-5 mt-2 text-gray-100">
                          .wav / .mp3 file
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-x-6">
              {isLoading ? (
                <p className="text-l">UPLOADING BANGER...</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-sm font-semibold leading-6 text-gray-100"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 relative"
                    onClick={handleSubmission}
                    disabled={isLoading} // Disable submit button when loading
                  >
                    Submit
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
