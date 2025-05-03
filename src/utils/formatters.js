import { format } from "date-fns";

// Format date helper
export const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    // Ensure date is a Date object or valid string/number for Date constructor
    const dateObj = date instanceof Date ? date : new Date(date);
    // Check if the date is valid after conversion
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    return format(dateObj, "MMM d, yyyy h:mm a");
  } catch (err) {
    console.error("Error formatting date:", date, err);
    return "Invalid Date";
  }
};

// Helper function to safely format currency
export const formatCurrency = (amount) => {
  if (typeof amount === "string") {
    amount = parseFloat(amount);
  }
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
};

// Helper function to get status color class
export const getStatusColor = (status) => {
  if (!status) return "bg-gray-500/20 text-gray-500";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("completed")) {
    return "bg-green-500/20 text-green-500";
  } else if (statusLower.includes("processing")) {
    return "bg-blue-500/20 text-blue-500";
  } else if (statusLower.includes("pending")) {
    return "bg-yellow-500/20 text-yellow-500";
  } else if (statusLower.includes("shipped")) {
    return "bg-indigo-500/20 text-indigo-500";
  } else if (statusLower.includes("cancel")) {
    return "bg-red-500/20 text-red-500";
  } else if (statusLower.includes("partial")) {
    return "bg-orange-500/20 text-orange-500";
  } else {
    return "bg-gray-500/20 text-gray-500";
  }
};
