import { useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { useTheme } from "../hooks/useTheme"; // <-- Add this import

export default function Landing() {
  const [darkMode, setDarkMode] = useTheme(); // <-- Add this line

  useEffect(() => {
    AOS.init({ once: true, duration: 700, offset: 80 });
  }, []);

  return (
    <section
      className="bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen w-full flex flex-col overflow-x-hidden pt-20"
    >
      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl flex flex-col items-center justify-center px-2 sm:px-4 py-8 sm:py-12 mx-auto">
        {/* Hero Section */}
        <div className="w-full text-center" data-aos="fade-down">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A8A] dark:text-white mb-4 font-inter">
            Turn Data Into Discipline,<br className="hidden md:inline" /> and Discipline Into Profits
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-6 font-medium">
            FXsnip empowers you to track your trades, analyze your performance, and connect with top traders.
            <span className="block mt-2">
              <span className="font-bold text-[#a99d6b]">Access your journals from any device, anywhere, anytime.</span>
            </span>
          </p>
          <div className="mb-8">
            <span className="inline-block bg-[#a99d6b] text-white px-4 py-2 rounded-full font-semibold text-base shadow transition-transform duration-300 hover:scale-105">
              <span className="block md:hidden">1 free trading journal per month!</span>
              <span className="hidden md:inline">1 free trading journal per month! Paid plans for screenshots & video journals.</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              to="/register"
              className="px-8 py-3 bg-[#1E3A8A] text-white rounded-lg font-semibold shadow hover:bg-[#2746b6] transition-transform duration-300 hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-white dark:bg-gray-800 text-[#1E3A8A] dark:text-white border border-[#1E3A8A] rounded-lg font-semibold shadow hover:bg-blue-50 dark:hover:bg-gray-700 transition-transform duration-300 hover:scale-105"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-3 gap-6 mt-8 mb-16 justify-center">
          <Link
            to="/register"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#1E3A8A] transition-transform duration-300 hover:scale-105 focus:outline-none"
            data-aos="fade-up"
          >
            <span className="text-[#a99d6b] font-bold text-lg mb-2">Free Plan</span>
            <h3 className="font-bold text-2xl text-[#1E3A8A] dark:text-white mb-1">1 Journal / Month</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
              Create and manage one trading journal every month at no cost.
            </p>
            <span className="text-3xl font-extrabold text-[#1E3A8A] dark:text-white mb-2">Free</span>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">Get Started</span>
          </Link>
          <Link
            to="/register"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#1E3A8A] transition-transform duration-300 hover:scale-105 focus:outline-none"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            <span className="text-[#a99d6b] font-bold text-lg mb-2">Screenshot Journals</span>
            <h3 className="font-bold text-2xl text-[#1E3A8A] dark:text-white mb-1">Unlimited Journals</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
              Attach screenshots to your trades and keep unlimited journals.
            </p>
            <span className="text-3xl font-extrabold text-[#1E3A8A] dark:text-white mb-2">
              $2.5<span className="text-base font-normal">/month</span>
            </span>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">Get Started</span>
          </Link>
          <Link
            to="/register"
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center border-2 border-[#1E3A8A] transition-transform duration-300 hover:scale-105 focus:outline-none"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <span className="text-[#a99d6b] font-bold text-lg mb-2">Video Journals</span>
            <h3 className="font-bold text-2xl text-[#1E3A8A] dark:text-white mb-1">Screenrecorded Trades</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
              Record and upload screenrecorded videos for your trades.
            </p>
            <span className="text-3xl font-extrabold text-[#1E3A8A] dark:text-white mb-2">
              $10<span className="text-base font-normal">/month</span>
            </span>
            <span className="mt-4 inline-block px-6 py-2 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition">Get Started</span>
          </Link>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-3 gap-6 mt-8">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105"
            data-aos="fade-right"
          >
            <svg className="w-10 h-10 text-[#a99d6b] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="font-bold text-lg text-[#1E3A8A] dark:text-white mb-1">Pre & Post Trade Journaling</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              Log your trade ideas, strategies, emotions, and screenshots or videos before and after every trade.
            </p>
          </div>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105"
            data-aos="fade-up"
          >
            <svg className="w-10 h-10 text-[#a99d6b] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 17a4 4 0 1 0 2-7.75V5a7 7 0 1 1-2 0v4.25A4 4 0 0 0 11 17z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="font-bold text-lg text-[#1E3A8A] dark:text-white mb-1">Powerful Trade Analytics</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              Visualize your win rate, profit/loss, and trading edge with interactive charts and stats.
            </p>
          </div>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105"
            data-aos="fade-left"
          >
            <svg className="w-10 h-10 text-[#a99d6b] mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1m0-4V4a4 4 0 1 1 8 0v6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="font-bold text-lg text-[#1E3A8A] dark:text-white mb-1">Trading Signal Rooms</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
              View and follow verified traders’ public journals and signals in real time.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-blue-100 dark:border-gray-700 my-16"></div>

        {/* Why Choose Us Section */}
        <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] dark:text-white mb-4">Why FXsnip?</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            FXsnip is built for traders who want to turn data into discipline and discipline into profits.
            Our platform is designed to help you:
          </p>
          <ul className="text-left text-gray-700 dark:text-gray-300 mx-auto max-w-xl space-y-3">
            <li>• <span className="font-semibold text-[#a99d6b]">Master your psychology</span> by tracking your emotions and mindset for every trade.</li>
            <li>• <span className="font-semibold text-[#a99d6b]">Spot patterns</span> in your trading strategy and performance over time.</li>
            <li>• <span className="font-semibold text-[#a99d6b]">Learn from the best</span> by following verified traders and their public journals.</li>
            <li>• <span className="font-semibold text-[#a99d6b]">Stay updated</span> with forex news and market insights.</li>
            <li>• <span className="font-semibold text-[#a99d6b]">Access anywhere</span> — your journals are always available on any device, anytime.</li>
          </ul>
        </div>

        {/* How It Works Section */}
        <div className="max-w-4xl mx-auto mb-16" data-aos="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] dark:text-white mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105" data-aos="zoom-in" data-aos-delay="100">
              <span className="text-3xl font-bold text-[#a99d6b] mb-2">1</span>
              <h4 className="font-semibold text-[#1E3A8A] dark:text-white mb-1">Create Your Journal</h4>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                Register for free and start logging your trades with detailed notes, screenshots, or videos.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105" data-aos="zoom-in" data-aos-delay="200">
              <span className="text-3xl font-bold text-[#a99d6b] mb-2">2</span>
              <h4 className="font-semibold text-[#1E3A8A] dark:text-white mb-1">Analyze & Improve</h4>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                Use our analytics tools to review your performance, spot strengths and weaknesses, and refine your trading edge.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105" data-aos="zoom-in" data-aos-delay="300">
              <span className="text-3xl font-bold text-[#a99d6b] mb-2">3</span>
              <h4 className="font-semibold text-[#1E3A8A] dark:text-white mb-1">Connect & Grow</h4>
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                Join signal rooms, follow top traders, and stay updated with forex news and market trends.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="max-w-2xl mx-auto text-center mb-12" data-aos="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] dark:text-white mb-4">
            Ready to take your trading to the next level?
          </h2>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition-transform duration-300 hover:scale-105"
          >
            Join FXsnip Free
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <a
            href="https://github.com/lyula"
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:underline transition"
          >
            &copy; {new Date().getFullYear()} FXsnip. All rights reserved.
          </a>
        </div>
      </div>
    </section>
  );
}