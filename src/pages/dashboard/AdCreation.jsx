import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { COUNTRIES, TIER_PRICING } from "./countries";
import { COUNTRY_DATA, getFlagEmoji } from "./countryData";

function filterCountries(query) {
  return COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );
}

function getCountryDataByName(name) {
  return COUNTRY_DATA.find((c) => c.name === name);
}

function getCountryDataByCode(code) {
  return COUNTRY_DATA.find((c) => c.code === code);
}

function getNeighborSuggestions(selectedCountries) {
  // Use the first selected country as the user's location for suggestion
  if (!selectedCountries.length) return [];
  const userCountry = getCountryDataByName(selectedCountries[0]);
  if (!userCountry) return [];
  return userCountry.neighbors
    .map((code) => getCountryDataByCode(code))
    .filter(Boolean)
    .map((c) => c.name)
    .filter((name) => !selectedCountries.includes(name));
}

export default function AdCreation() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [duration, setDuration] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [countryList, setCountryList] = useState([]); // [{name, code, flag, tier}]
  const inputRef = useRef();

  // Fetch countries with flag images on mount
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flags")
      .then((res) => res.json())
      .then((data) => {
        const list = data
          .map((c) => {
            // Find tier from COUNTRIES by name or code
            const tierObj = COUNTRIES.find(
              (x) => x.name === c.name.common || x.code === c.cca2
            );
            return {
              name: c.name.common,
              code: c.cca2,
              flag: c.flags && c.flags.png ? c.flags.png : "",
              tier: tierObj ? tierObj.tier : 3,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList(list);
      });
  }, []);

  const CATEGORIES = [
    "Finance",
    "Education",
    "Technology",
    "Health",
    "Lifestyle",
    "Trading",
    "Forex",
    "Crypto",
    "Events",
    "Jobs",
  ];

  // Calculate payment: sum of (tier price * days) for each selected country
  const payment = selectedCountries.reduce((sum, c) => {
    const country = countryList.find((x) => x.name === c);
    const tier = country ? country.tier : 3;
    return sum + TIER_PRICING[tier] * duration;
  }, 0);

  // For search
  const filteredCountries = countryQuery
    ? countryList.filter(
        (c) =>
          c.name.toLowerCase().includes(countryQuery.toLowerCase()) &&
          !selectedCountries.includes(c.name)
      )
    : countryList.filter((c) => !selectedCountries.includes(c.name));

  // Neighbor suggestions
  const neighborSuggestions = getNeighborSuggestions(selectedCountries);

  const handleAddCountry = (name) => {
    if (!selectedCountries.includes(name)) {
      setSelectedCountries([...selectedCountries, name]);
      setCountryQuery("");
      setShowSuggestions(false);
    }
  };
  const handleRemoveCountry = (name) => {
    setSelectedCountries(selectedCountries.filter((c) => c !== name));
  };

  return (
    <div className="w-full md:w-auto flex-1 mx-auto p-1 md:p-2">
      <button
        className="mb-2 px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 md:p-4 w-full h-full">
        <h2 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-100">
          Create a New Ad
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Fill in the details below to create and run your advertisement.
        </p>
        <form className="space-y-3">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Ad Title
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter ad title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows="3"
              placeholder="Describe your ad"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Category
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Countries (search & select multiple)
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedCountries.map((name) => {
                const country = countryList.find((c) => c.name === name);
                const data = getCountryDataByName(name);
                return (
                  <span
                    key={name}
                    className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs"
                  >
                    {country && country.flag ? (
                      <img
                        src={country.flag}
                        alt={country.code}
                        className="mr-1 w-5 h-3 object-cover rounded-sm"
                      />
                    ) : (
                      <span className="mr-1">🌐</span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100">{name}</span>
                    <button
                      type="button"
                      className="ml-1 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveCountry(name)}
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
            <input
              ref={inputRef}
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-1"
              placeholder="Search country..."
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            {/* Neighbor suggestions */}
            {showSuggestions && !countryQuery && neighborSuggestions.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 shadow mt-1">
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  Suggested neighbors
                </div>
                {neighborSuggestions.map((name) => {
                  const data = getCountryDataByName(name);
                  const country = COUNTRIES.find((c) => c.name === name);
                  return (
                    <div
                      key={name}
                      className="px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer text-sm flex items-center"
                      onClick={() => handleAddCountry(name)}
                    >
                      {data && (
                        <span className="mr-2">{getFlagEmoji(data.code)}</span>
                      )}
                      <span className="text-gray-900 dark:text-gray-100">{name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        (Tier {country?.tier || 3}, KES{" "}
                        {TIER_PRICING[country?.tier || 3]}/day)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Search results */}
            {showSuggestions && countryQuery && filteredCountries.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 shadow mt-1">
                {filteredCountries.slice(0, 10).map((c) => {
                  const data = getCountryDataByName(c.name);
                  return (
                    <div
                      key={c.name}
                      className="px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer text-sm flex items-center"
                      onClick={() => handleAddCountry(c.name)}
                    >
                      {c.flag ? (
                        <img
                          src={c.flag}
                          alt={c.code}
                          className="mr-2 w-5 h-3 object-cover rounded-sm"
                        />
                      ) : (
                        <span className="mr-2">🌐</span>
                      )}
                      <span className="text-gray-900 dark:text-gray-100">
                        {c.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        (Tier {c.tier}, KES {TIER_PRICING[c.tier]}/day)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Duration (days)
            </label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g. 7"
              min="1"
              value={duration}
              onChange={(e) =>
                setDuration(Math.max(1, Number(e.target.value)))
              }
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Total Payment (KES)
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={payment}
              readOnly
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Pricing: Tier 1 = {TIER_PRICING[1]}, Tier 2 ={" "}
              {TIER_PRICING[2]}, Tier 3 = {TIER_PRICING[3]} KES per day per country
            </span>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
          >
            Run Ad
          </button>
        </form>
      </div>
    </div>
  );
}
