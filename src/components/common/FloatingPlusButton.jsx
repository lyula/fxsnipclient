import React from "react";
import { FaPlus } from "react-icons/fa";

export default function FloatingPlusButton({ onClick, visible = true }) {
  return (
    <button
      className={`fixed bottom-4 right-4 z-40 sm:hidden flex items-center justify-center w-14 h-14 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      onClick={onClick}
      aria-label="Create new post"
      style={{ transition: "opacity 0.3s, transform 0.3s" }}
    >
      <FaPlus className="text-lg" />
    </button>
  );
}
