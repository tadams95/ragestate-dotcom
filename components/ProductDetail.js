'use client';
import { TruckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { useDispatch } from 'react-redux';
import { addToCart } from '../lib/features/todos/cartSlice';

import Footer from '@/app/components/Footer';
import EventStyling1 from '@/app/components/styling/EventStyling1';
import EventStyling2 from '@/app/components/styling/EventStyling2';

const policies = [
  {
    name: 'National delivery',
    icon: TruckIcon,
    description: 'Get your order within 1-2 Weeks',
  },
  {
    name: 'Your support matters',
    icon: UserGroupIcon,
    description: 'Thanks for RAGING with us!',
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ProductDetails({ product }) {
  const dispatch = useDispatch();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  // const [productPrice, setProductPrice] = useState(0);

  const price = parseFloat(product?.variants[0]?.price?.amount).toFixed(2);
  // Ensure product is defined before accessing its properties
  if (!product) {
    return <div>Loading...</div>; // or handle differently while product is loading
  }

  // console.log("Price Ya Heard: ", product?.variants[0]?.price?.amount);

  // Destructure necessary fields from product
  const {
    id,
    title,
    images,
    // Add other necessary fields
  } = product;

  const handleAddToCart = (e) => {
    e.preventDefault(); // Prevent form submission

    // Check if all required selections are made
    if (selectedSize && selectedColor) {
      const productToAdd = {
        productId: id,
        productImageSrc: images && images.length > 0 ? images[0].src : null,
        title,
        price: price,
        selectedSize,
        selectedColor,
        isDigital: false,
      };

      console.log('Product Added: ', productToAdd);
      // Implement dispatch or function to add to cart
      dispatch(addToCart(productToAdd));
      setSelectedSize(''); // Reset selectedSize
      setSelectedColor(''); // Reset selectedColor
      toast.success('Added to cart!', {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
          border: '1px solid #444',
        },
      });
    } else {
      // Handle the case where not all required selections are made
      if (!selectedSize) {
        toast.error('Please select a size', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #444',
          },
        });
      }
      if (!selectedColor) {
        toast.error('Please select a color', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #444',
          },
        });
      }
    }
  };

  const getColorOptions = () => {
    const colorSet = new Set(); // Set to store unique color options

    product.variants.forEach((variant) => {
      const colorOption = variant.selectedOptions.find((option) => option.name === 'Color');
      if (colorOption) {
        colorSet.add(colorOption.value); // Add color value to set (ignores duplicates)
      }
    });

    const colorOptions = Array.from(colorSet).map((color) => ({
      value: color,
      name: product.variants.find((variant) => {
        const option = variant.selectedOptions.find((opt) => opt.name === 'Color');
        return option && option.value === color;
      }).title, // Assuming 'title' is the name of the product variant
    }));

    // console.log("Color Options:", colorOptions); // Log all color options

    return colorOptions; // Return the color options array
  };

  const getSizeOptions = () => {
    const sizeSet = new Set();

    product.variants.forEach((variant) => {
      const sizeOption = variant.selectedOptions.find((option) => option.name === 'Size');
      if (sizeOption) {
        sizeSet.add(sizeOption.value);
      }
    });

    const sizeOptions = Array.from(sizeSet).map((size) => ({
      value: size,
      name: product.variants.find((variant) => {
        const option = variant.selectedOptions.find((opt) => opt.name === 'Size');
        return option && option.value === size;
      }).title,
    }));
    return sizeOptions;
  };

  return (
    <div className="isolate bg-black">
      <Toaster />
      <EventStyling1 />
      <EventStyling2 />
      <div className="pb-8 pt-6 sm:pb-12">
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:auto-rows-min lg:grid-cols-10 lg:gap-x-8">
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-100">{product.title}</h1>
                <p className="text-2xl font-bold text-white">${price}</p>
              </div>
            </div>

            {/* Image gallery */}
            <div className="col-start-1 mt-8 lg:col-span-7 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <h2 className="sr-only">Images</h2>
              <div className="grid grid-cols-2 gap-4">
                {product.images.map((image, index) => {
                  const src = image?.src || image?.transformedSrc || null;
                  if (!src) {
                    // eslint-disable-next-line no-console
                    console.warn('[ProductDetail] Missing product image URL', {
                      productId: product?.id,
                      image,
                    });
                  }
                  return (
                    <div
                      key={image.id}
                      className={classNames(
                        index === 0
                          ? 'col-span-2 row-span-2 h-[28rem] sm:h-[32rem]'
                          : 'col-span-1 h-64 sm:h-72',
                        'group relative overflow-hidden rounded-lg',
                      )}
                    >
                      <Image
                        src={src || '/assets/user.png'}
                        alt={image?.altText || product.title}
                        fill
                        sizes="(min-width:1024px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 rounded-lg bg-opacity-0 transition-opacity duration-300 group-hover:bg-opacity-10" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 lg:col-span-5">
              <form onSubmit={handleAddToCart} className="space-y-6">
                {/* Color picker */}
                <div>
                  <h2 className="mb-3 text-sm font-medium text-gray-100">Color</h2>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full max-w-xs rounded-md border border-white bg-transparent py-2 pl-3 pr-10 text-base text-gray-100 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Color</option>
                    {getColorOptions().map((colorOption) => (
                      <option key={colorOption.value} value={colorOption.value}>
                        {colorOption.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size picker */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-100">Size</h2>
                  </div>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full max-w-xs rounded-md border border-white bg-transparent py-2 pl-3 pr-10 text-base text-gray-100 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Size</option>
                    {getSizeOptions().map((sizeOption) => (
                      <option key={sizeOption.value} value={sizeOption.value}>
                        {sizeOption.value}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="flex w-full max-w-xs items-center justify-center rounded-md bg-red-600 px-8 py-3 text-base font-medium text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Add to cart
                </button>
              </form>

              {/* Product details */}
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-medium text-gray-100">Description</h2>
                <div
                  className="prose prose-sm prose-invert mt-4 text-gray-300"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              <div className="mt-8 border-t border-gray-800 pt-8" />

              {/* Policies */}
              <section aria-labelledby="policies-heading" className="mt-0">
                <h2 id="policies-heading" className="sr-only">
                  Our Policies
                </h2>
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.name}
                      className="rounded-lg border border-white bg-transparent bg-opacity-50 p-6 text-center transition-colors duration-200 hover:border-gray-700"
                    >
                      <dt>
                        <policy.icon
                          className="mx-auto h-6 w-6 flex-shrink-0 text-red-500"
                          aria-hidden="true"
                        />
                        <span className="mt-4 text-sm font-medium text-gray-100">
                          {policy.name}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm text-gray-400">{policy.description}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
