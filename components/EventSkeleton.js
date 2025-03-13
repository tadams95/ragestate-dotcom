import React from "react";

export default function EventSkeleton() {
  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl overflow-hidden shadow-xl animate-pulse border border-gray-700/30">
      <div className="h-60 bg-gray-700/50"></div>
      <div className="p-5">
        <div className="h-6 w-3/4 bg-gray-700/50 rounded mb-4"></div>
        
        <div className="flex items-center mt-3">
          <div className="w-4 h-4 mr-2 bg-gray-700/50 rounded-full"></div>
          <div className="h-4 w-1/3 bg-gray-700/50 rounded"></div>
        </div>
        
        <div className="flex items-center mt-3">
          <div className="w-4 h-4 mr-2 bg-gray-700/50 rounded-full"></div>
          <div className="h-4 w-2/3 bg-gray-700/50 rounded"></div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700/30 flex items-center justify-between">
          <div className="h-6 w-16 bg-gray-700/50 rounded"></div>
          <div className="h-4 w-20 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    </div>
  );
}
