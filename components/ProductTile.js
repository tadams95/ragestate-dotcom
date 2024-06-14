import Link from "next/link";
import Image from "next/image";
export default function ProductTile({ product }) {
  return (
    <Link key={product.id} href={product.href} className="group">
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-h-8 xl:aspect-w-7 mt-4">
        <Image
          src={product.imageSrc}
          alt={product.imageAlt || product.title} // Use imageAlt if provided, otherwise fallback to title
          className="h-full w-full object-cover object-center group-hover:opacity-75"
          width={500}
          height={500}
        />
      </div>
      <h2 className="mt-4 text-sm text-gray-100">{product.title}</h2>
      <p className="mt-1 text-lg font-normal text-gray-400">{product.variants[0].price.amount}</p>
    </Link>
  );
}
