import Link from "next/link";
import Image from "next/image";
export default function ProductTile({ product }) {
  const priceNumber = parseFloat(product.variants[0].price.amount);
  const formattedPrice = priceNumber.toFixed(2);

  console.log(product.href);

  // Function to format slug
  const formatSlug = (title) => {
    return title
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/[^\w\-]+/g, "") // Remove all non-word characters except dashes
      .replace(/\-\-+/g, "-"); // Replace multiple dashes with single dash
  };

  return (
    <Link
      key={product.id}
      href={`/shop/${formatSlug(product.title)}`}
      className="group"
    >
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-h-8 xl:aspect-w-7 mt-4">
        <Image
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
