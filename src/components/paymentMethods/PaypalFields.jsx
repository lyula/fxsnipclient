import React from 'react';

const inputClass =
  "text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]";

export default function PaypalFields({ onChange }) {
  return (
    <input
      type="email"
      name="paypalEmail"
      placeholder="PayPal Email"
      className={inputClass}
      onChange={onChange}
      required
    />
  );
}
