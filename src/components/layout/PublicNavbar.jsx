import { Link, NavLink } from "react-router-dom";
import { useState } from "react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/news", label: "News" },
  { to: "/markets", label: "Markets" },
  { to: "/contact", label: "Contact" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg font-sans">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-extrabold tracking-tight text-[#1E3A8A] dark:text-white font-inter"
          style={{ letterSpacing: ".02em" }}
        >
          Forex
          <span className="text-white bg-[#1E3A8A] px-2 py-1 rounded ml-1">
            Journal
          </span>
        </Link>
        <div className="md:hidden">
          <button
            onClick={() => setOpen(!open)}
            className="text-[#1E3A8A] dark:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 8h16M4 16h16"
                />
              )}
            </svg>
          </button>
        </div>
        <div
          className={`flex-col md:flex-row md:flex gap-2 md:gap-6 items-center transition-all duration-200 ${
            open
              ? "flex absolute top-16 left-0 w-full bg-white dark:bg-gray-900 z-50 rounded-b-lg shadow-lg"
              : "hidden md:!flex md:static md:bg-transparent"
          }`}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block md:inline text-base font-medium font-inter px-4 py-2 md:px-2 md:py-1 rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-[#1E3A8A] text-white font-semibold shadow"
                    : "text-[#1E3A8A] dark:text-white hover:bg-[#1E3A8A] hover:text-white"
                }`
              }
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}