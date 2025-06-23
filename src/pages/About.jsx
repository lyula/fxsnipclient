import { Link } from "react-router-dom";

export default function About() {
  return (
    <section className="bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 pt-20">
      <div className="max-w-3xl mx-auto text-center" data-aos="fade-down">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A8A] dark:text-white mb-4 font-inter">
          About FXsnip
        </h1>
        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 font-medium">
          FXsnip is dedicated to empowering traders to turn{" "}
          <span className="text-[#a99d6b] font-bold">data into discipline</span>{" "}
          and{" "}
          <span className="text-[#a99d6b] font-bold">discipline into profits</span>
          .
          <br />
          We provide a modern, cloud-based platform for journaling, analyzing, and
          improving your trading performance—accessible from any device, anywhere,
          anytime.
        </p>
      </div>

      <div className="w-full max-w-4xl mx-auto grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center border-2 border-[#a99d6b] transition-transform duration-300 hover:scale-105" data-aos="fade-up">
          <svg className="w-12 h-12 text-[#a99d6b] mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Comprehensive Journaling</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Log every trade with notes, screenshots, or videos. Reflect on your strategy, psychology, and results before and after each trade.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center border-2 border-[#a99d6b] transition-transform duration-300 hover:scale-105" data-aos="fade-up" data-aos-delay="100">
          <svg className="w-12 h-12 text-[#a99d6b] mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 17a4 4 0 1 0 2-7.75V5a7 7 0 1 1-2 0v4.25A4 4 0 0 0 11 17z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Powerful Analytics</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Visualize your trading edge with interactive charts and stats. Spot patterns, track your progress, and make data-driven improvements.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center border-2 border-[#a99d6b] transition-transform duration-300 hover:scale-105" data-aos="fade-up" data-aos-delay="200">
          <svg className="w-12 h-12 text-[#a99d6b] mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1m0-4V4a4 4 0 1 1 8 0v6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-bold text-xl text-[#1E3A8A] dark:text-white mb-2">Community & Signals</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Connect with top traders, join signal rooms, and learn from public journals. Grow with a supportive trading community.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] dark:text-white mb-4">Our Mission</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          We believe every trader deserves the tools to grow, learn, and succeed.
          ForexJournal is here to help you build discipline, master your psychology,
          and achieve consistent results—no matter your experience level.
        </p>
      </div>

      <div className="max-w-2xl mx-auto text-center mb-8" data-aos="fade-up">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] dark:text-white mb-4">Easy Payments, Instant Access</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          We support{" "}
          <span className="text-[#a99d6b] font-semibold">all major payment methods</span>{" "}
          for your convenience—credit/debit cards, PayPal, mobile money, crypto, and more.
          <br />
          Enjoy seamless, secure payments and instant access to all ForexJournal features.
        </p>
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-12 w-auto bg-white rounded shadow px-3 py-2 object-contain" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png" alt="Mastercard" className="h-12 w-auto bg-white rounded shadow px-3 py-2 object-contain" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-12 w-auto bg-white rounded shadow px-3 py-2 object-contain" />
          <img src="https://public.bnbstatic.com/image/cms/blog/20240207/37b2b01f-6115-41fa-9166-c987b0cc8bd3.jpg" alt="Crypto" className="h-12 w-auto bg-white rounded shadow px-3 py-2 object-contain" />
          <img src="https://techafricanews.com/wp-content/uploads/2023/05/m-pesa-logo_1.png" alt="M-Pesa" className="h-12 w-auto bg-white rounded shadow px-3 py-2 object-contain" />
        </div>
        <Link
          to="/register"
          className="inline-block px-10 py-4 bg-[#a99d6b] text-white rounded-lg font-bold shadow hover:bg-[#c2b77a] transition-transform duration-300 hover:scale-105"
        >
          Get Started with FXsnip
        </Link>
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <Link
            to="/"
            className="hover:underline transition"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}