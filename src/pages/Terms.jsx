import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-2 py-8">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-10 border border-[#a99d6b] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] dark:text-white mb-4 font-inter text-center">
          Terms &amp; Conditions
        </h1>
        <div className="text-gray-700 dark:text-gray-200 text-sm sm:text-base space-y-4 max-h-[60vh] overflow-y-auto px-1">
          <p>
            Welcome to FXsnip! By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.
          </p>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">1. Service Overview</h2>
          <p>
            FXsnip provides a digital journal and analytics platform for forex traders. Our service is for informational and educational purposes only and does not constitute financial advice.
          </p>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">2. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must be at least 18 years old to use this platform.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree not to use the platform for unlawful or abusive purposes.</li>
          </ul>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">3. Content &amp; Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You retain ownership of your journal entries and data.</li>
            <li>We do not share your personal data with third parties except as required by law or to provide our services.</li>
            <li>You grant us a license to use anonymized, aggregated data to improve our services.</li>
          </ul>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">4. Disclaimer</h2>
          <p>
            Trading forex involves risk. FXsnip does not guarantee any trading results. All information and analytics are for educational purposes only.
          </p>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">5. Changes &amp; Termination</h2>
          <p>
            We may update these terms at any time. Continued use of the platform means you accept the new terms. We reserve the right to suspend or terminate accounts for violations.
          </p>
          <h2 className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] mt-4">6. Contact</h2>
          <p>
            For questions, contact us at <a href="mailto:support@fxsnip.com" className="underline text-[#a99d6b]">support@fxsnip.com</a>.
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="text-[#1E3A8A] dark:text-[#a99d6b] font-semibold hover:underline"
          >
            Back to Register
          </Link>
        </div>
      </div>
    </section>
  );
}