import { useState } from "react";
import { FaEnvelope, FaPhoneAlt, FaStar } from "react-icons/fa";
import Footer from "../components/layout/Footer"; // Import Footer

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Here you would send the form data to your backend or email service
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <>
      <section className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8 pt-20 flex justify-center items-start">
        <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 mx-auto">
          {/* Contact Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-[#a99d6b] flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E3A8A] dark:text-white mb-4 text-center font-inter">
              Contact Us
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
              We'd love to hear from you! Reach out using the details below.
            </p>
            <div className="flex flex-col gap-6 items-center w-full">
              <div className="flex items-center gap-4">
                <FaEnvelope className="text-[#a99d6b] text-2xl" />
                <span className="text-lg text-gray-800 dark:text-gray-200 font-medium select-all">
                  zackfx038@gmail.com
                </span>
              </div>
              <div className="flex items-center gap-4">
                <FaPhoneAlt className="text-[#a99d6b] text-2xl" />
                <span className="text-lg text-gray-800 dark:text-gray-200 font-medium select-all">
                  +254742764060
                </span>
              </div>
              <div className="flex items-center gap-4">
                <FaPhoneAlt className="text-[#a99d6b] text-2xl" />
                <span className="text-lg text-gray-800 dark:text-gray-200 font-medium select-all">
                  +254773079574
                </span>
              </div>
            </div>
          </div>

          {/* Contact Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-[#a99d6b] flex flex-col justify-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A8A] dark:text-[#a99d6b] mb-4 text-center">
              Send Us a Message
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your Name"
                className="rounded-lg border border-[#a99d6b] px-4 py-2 bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a99d6b]"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Your Email"
                className="rounded-lg border border-[#a99d6b] px-4 py-2 bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a99d6b]"
              />
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                placeholder="Your Message"
                rows={4}
                className="rounded-lg border border-[#a99d6b] px-4 py-2 bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a99d6b]"
              />
              <button
                type="submit"
                className="bg-[#a99d6b] text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-[#c2b77a] transition"
              >
                Send Message
              </button>
              {submitted && (
                <div className="text-green-600 text-center font-semibold mt-2">
                  Thank you for your message!
                </div>
              )}
            </form>
          </div>

          {/* Rating Card (full width on mobile, right on desktop) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-[#a99d6b] flex flex-col items-center md:col-span-2 mt-2">
            <h2 className="text-xl font-bold text-[#1E3A8A] dark:text-[#a99d6b] mb-2 text-center">
              Rate Us
            </h2>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  className="focus:outline-none"
                >
                  <FaStar
                    className={`text-2xl ${
                      rating >= star
                        ? "text-[#a99d6b]"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-center text-sm text-[#1E3A8A] dark:text-[#a99d6b] font-medium">
                You rated us {rating} star{rating > 1 ? "s" : ""}. Thank you!
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}