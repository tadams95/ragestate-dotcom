import React from "react";

export default function EventSkeleton() {
  return (
    <div className="bg-transparent animate-pulse">
      <div className="mx-auto max-w-2xl px-4 pt-8 lg:max-w-7xl lg:px-4">
        {/* Image skeleton */}
        <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg " 
             style={{ height: '300px' }}></div>
        
        {/* Title skeleton */}
        <div className="mt-4 h-8  rounded w-3/4 mx-auto"></div>
        
        {/* Date skeleton */}
        <div className="mt-2 h-5  rounded w-1/2 mx-auto"></div>
      </div>
    </div>
  );
}
