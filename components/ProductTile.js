import Link from "next/link";
import Image from "next/image";
export default function ProductTile({ product }) {
  const priceNumber = parseFloat(product.variants[0].price.amount);
  const formattedPrice = priceNumber.toFixed(2);

  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  };

  const handleLinkClick = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("selectedProduct", JSON.stringify(product));
      } else {
        console.warn("localStorage is not available.");
      }
    } catch (error) {
      console.error("Failed to save product to localStorage:", error);
    }
  };
  return (
    <Link
      href={`/shop/${formatSlug(product.title)}`}
      className="group"
      onClick={handleLinkClick}
    >
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg xl:aspect-h-8 xl:aspect-w-7 mt-4">
        <Image
          priority
          src={product.imageSrc}
          alt={product.imageAlt || product.title} // Use imageAlt if provided, otherwise fallback to title
          className="h-full w-full object-cover object-center group-hover:opacity-75"
          width={500}
          height={500}
        />
      </div>
      <h2 className="mt-4 text-lg text-gray-100">{product.title}</h2>
      <p className="text-sm mt-1 font-normal text-gray-400">
        ${formattedPrice}
      </p>
    </Link>
  );
}
