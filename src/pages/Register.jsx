import { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useTheme } from "../hooks/useTheme";
import { Link, useNavigate } from "react-router-dom"; // <-- add useNavigate

// Helper to get user's country using IP geolocation API
async function fetchUserCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return { name: data.country_name, code: data.country_code, flag: "" }; // flag will be set after fetching countries
  } catch {
    return null;
  }
}

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    country: "",
    countryCode: "",
    countryFlag: "",
  });
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const [userDetectedCountry, setUserDetectedCountry] = useState(null);
  const navigate = useNavigate(); // <-- add this

  // Fetch countries from API and user's country
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flags")
      .then(res => res.json())
      .then(data => {
        const countryList = data.map(c => ({
          name: c.name.common,
          code: c.cca2,
          flag: c.flags && c.flags.png ? c.flags.png : "",
          emoji: c.flags && c.flags.alt ? c.flags.alt : "",
        })).sort((a, b) => a.name.localeCompare(b.name));
        setCountries(countryList);

        // Get user's country and prepopulate
        fetchUserCountry().then(userCountry => {
          if (userCountry) {
            setUserDetectedCountry(userCountry); // Save detected country for later comparison
            const match = countryList.find(
              c => c.code === userCountry.code || c.name === userCountry.name
            );
            if (match) {
              setForm(f => ({
                ...f,
                country: match.name,
                countryCode: match.code,
                countryFlag: match.flag,
              }));
              setCountryQuery(match.name);
            }
          }
        });
      });
  }, []);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countryQuery.toLowerCase())
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess(false);
  };

  const handleCountrySelect = (country) => {
    setForm({ ...form, country: country.name, countryCode: country.code, countryFlag: country.flag });
    setCountryQuery(country.name);
    setShowCountryList(false);

    // If userDetectedCountry exists and the selected country matches, clear the error
    if (
      userDetectedCountry &&
      (country.code === userDetectedCountry.code || country.name === userDetectedCountry.name)
    ) {
      setError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // JavaScript validation for all required fields, with specific error messages
    if (!form.username.trim()) {
      setError("Username is required.");
      setSuccess(false);
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      setSuccess(false);
      return;
    }
    if (!form.password) {
      setError("Password is required.");
      setSuccess(false);
      return;
    }
    if (!form.confirm) {
      setError("Please confirm your password.");
      setSuccess(false);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      setSuccess(false);
      return;
    }
    if (!form.country || !form.countryCode || !form.countryFlag) {
      setError("Please select your country.");
      setSuccess(false);
      return;
    }
    // Check if selected country matches detected country
    if (
      userDetectedCountry &&
      (form.countryCode !== userDetectedCountry.code && form.country !== userDetectedCountry.name)
    ) {
      setError(
        "The country you selected does not match your current location. Please enter your real country."
      );
      setSuccess(false);
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms & Conditions.");
      setSuccess(false);
      return;
    }
    setError("");
    setSuccess(true);
    setForm({
      username: "",
      email: "",
      password: "",
      confirm: "",
      country: "",
      countryCode: "",
      countryFlag: "",
    });
    setCountryQuery("");
    setAgreed(false);

    // Redirect to login after a short delay
    setTimeout(() => {
      navigate("/login");
    }, 1500); // 1.5 seconds
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-2 py-8">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 border border-[#a99d6b] flex flex-col items-center mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] dark:text-white mb-6 font-inter text-center">
          Create Account
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaUser className="text-[#a99d6b] mr-3" />
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b]">
            <FaEnvelope className="text-[#a99d6b] mr-3" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b] relative">
            <FaLock className="text-[#a99d6b] mr-3" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 pr-8"
            />
            <button
              type="button"
              className="absolute right-3 text-[#a99d6b] focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="flex items-center border border-[#a99d6b] rounded-lg px-4 py-2 bg-transparent focus-within:ring-2 focus-within:ring-[#a99d6b] relative">
            <FaLock className="text-[#a99d6b] mr-3" />
            <input
              type={showConfirm ? "text" : "password"}
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Confirm Password"
              className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 pr-8"
            />
            <button
              type="button"
              className="absolute right-3 text-[#a99d6b] focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="mb-4 relative">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Country
            </label>
            <div className="relative">
              <input
                type="text"
                id="country"
                name="country"
                autoComplete="off"
                value={countryQuery}
                onChange={e => {
                  setCountryQuery(e.target.value);
                  setShowCountryList(true);
                  setForm({ ...form, country: "", countryCode: "", countryFlag: "" });
                }}
                onFocus={() => setShowCountryList(true)}
                placeholder="Start typing to search..."
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 pl-10"
                style={{ paddingLeft: form.countryFlag ? 38 : undefined }}
                readOnly={false}
              />
              {form.countryFlag && (
                <img
                  src={form.countryFlag}
                  alt={form.countryCode}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-6 h-4 object-cover rounded-sm pointer-events-none"
                />
              )}
              {showCountryList && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow">
                  {filteredCountries.length === 0 && (
                    <li className="px-4 py-2 text-gray-500 dark:text-gray-300">No countries found</li>
                  )}
                  {filteredCountries.map((country) => (
                    <li
                      key={country.code}
                      className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        handleCountrySelect(country);
                        setShowCountryList(false);
                      }}
                    >
                      {country.flag && (
                        <img src={country.flag} alt={country.code} className="w-6 h-4 object-cover rounded-sm" />
                      )}
                      <span className="text-gray-900 dark:text-white">{country.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm mt-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="accent-[#a99d6b] w-4 h-4"
            />
            <label htmlFor="terms" className="text-gray-700 dark:text-gray-300">
              I agree to the{" "}
              <Link
                to="/terms"
                className="text-[#1E3A8A] dark:text-[#a99d6b] underline hover:opacity-80"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms &amp; Conditions
              </Link>
            </label>
          </div>
          {error && (
            <div className="text-red-600 text-center text-sm font-semibold">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-center text-sm font-semibold">
              Registration successful!
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#a99d6b] text-white rounded-lg font-semibold hover:bg-[#8c865a] transition"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#1E3A8A] dark:text-[#a99d6b] font-semibold hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}