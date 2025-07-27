import { Link, NavLink } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tsr", label: "TSR" },
];

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold" style={{ color: '#1e3a8a' }}>
          Journalyze
        </Link>
        <div className="flex items-center gap-6">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 px-2 py-1 rounded transition ${
                  isActive ? "font-semibold underline text-blue-800 dark:text-blue-300" : ""
                }`
              }
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
          {/* Theme toggle placeholder */}
          <button
            className="ml-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-700 transition"
            aria-label="Toggle theme"
          >
            <span className="inline-block w-5 h-5 bg-gradient-to-tr from-blue-800 to-blue-400 rounded-full" />
          </button>
        </div>
      </div>
    </nav>
  );
}