import { Link } from "react-router-dom";
import { FaBook, FaChartBar, FaUsers, FaPlusCircle } from "react-icons/fa";

export default function Dashboard() {
  return (
    <section className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-2 py-8 flex flex-col items-center">
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] dark:text-white mb-6 font-inter text-center">
          Welcome to Your Dashboard
        </h1>
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          <Link
            to="/journal"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
          >
            <FaBook className="text-3xl text-[#a99d6b] mb-3" />
            <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">My Journals</h2>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              View, edit, and reflect on your trading journals.
            </p>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
              Go to Journals
            </span>
          </Link>
          <Link
            to="/stats"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
          >
            <FaChartBar className="text-3xl text-[#a99d6b] mb-3" />
            <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Analytics</h2>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              Visualize your performance and trading edge.
            </p>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
              View Analytics
            </span>
          </Link>
          <Link
            to="/community"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#a99d6b] hover:scale-105 transition-transform"
          >
            <FaUsers className="text-3xl text-[#a99d6b] mb-3" />
            <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Community</h2>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              Connect with other traders and view public journals.
            </p>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">
              Explore Community
            </span>
          </Link>
        </div>
        <div className="flex justify-center">
          <Link
            to="/journal/new"
            className="flex items-center gap-2 px-8 py-3 bg-[#1E3A8A] text-white rounded-lg font-semibold shadow hover:bg-[#2746b6] transition-transform duration-300 hover:scale-105"
          >
            <FaPlusCircle className="text-lg" />
            New Journal Entry
          </Link>
        </div>
      </div>
    </section>
  );
}