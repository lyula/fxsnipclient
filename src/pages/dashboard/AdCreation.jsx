// ...existing code...
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { COUNTRIES, TIER_PRICING } from "./countries";
import { COUNTRY_DATA, getFlagEmoji } from "./countryData";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import { FaImage, FaVideo, FaLink, FaTrash, FaUpload } from "react-icons/fa";
import AdPreview from "../../components/AdPreview";
import AdSuccessModal from "../../components/AdSuccessModal";

// Currency mapping for countries (symbols only, rates fetched from API)
const COUNTRY_CURRENCIES = {
  "United States": { code: "USD", symbol: "$" },
  "United Kingdom": { code: "GBP", symbol: "£" },
  "Canada": { code: "CAD", symbol: "C$" },
  "Germany": { code: "EUR", symbol: "€" },
  "France": { code: "EUR", symbol: "€" },
  "Japan": { code: "JPY", symbol: "¥" },
  "Australia": { code: "AUD", symbol: "A$" },
  "Italy": { code: "EUR", symbol: "€" },
  "Spain": { code: "EUR", symbol: "€" },
  "Netherlands": { code: "EUR", symbol: "€" },
  "Sweden": { code: "SEK", symbol: "kr" },
  "Switzerland": { code: "CHF", symbol: "Fr" },
  "Norway": { code: "NOK", symbol: "kr" },
  "Finland": { code: "EUR", symbol: "€" },
  "Denmark": { code: "DKK", symbol: "kr" },
  "Belgium": { code: "EUR", symbol: "€" },
  "Austria": { code: "EUR", symbol: "€" },
  "Ireland": { code: "EUR", symbol: "€" },
  "New Zealand": { code: "NZD", symbol: "NZ$" },
  "Kenya": { code: "KES", symbol: "KES" },
  "Uganda": { code: "UGX", symbol: "USh" },
  "Nigeria": { code: "NGN", symbol: "₦" },
  "South Africa": { code: "ZAR", symbol: "R" },
  "India": { code: "INR", symbol: "₹" },
  "Brazil": { code: "BRL", symbol: "R$" },
  "China": { code: "CNY", symbol: "¥" },
  "Russia": { code: "RUB", symbol: "₽" },
  "Mexico": { code: "MXN", symbol: "$" },
  "Turkey": { code: "TRY", symbol: "₺" },
  "Egypt": { code: "EGP", symbol: "£" },
  "Ghana": { code: "GHS", symbol: "₵" },
  "Tanzania": { code: "TZS", symbol: "TSh" },
  "Rwanda": { code: "RWF", symbol: "RF" },
};

// Finance CPM (cost per 1000 views) in USD (should match backend)
const FINANCE_CPM_USD = 10.00; // Example: $10 per 1000 views

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
  // Currency mode state for toggling between local and USD
  const [currencyMode, setCurrencyMode] = useState('local'); // 'local' or 'usd'
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [duration, setDuration] = useState(1);
  const [targetUserbase, setTargetUserbase] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [countryList, setCountryList] = useState([]); // [{name, code, flag, tier}]
  const [userCountry, setUserCountry] = useState("United States"); // Default to USA
  const [exchangeRates, setExchangeRates] = useState({}); // Store exchange rates
  const [ratesLoading, setRatesLoading] = useState(true);
  const [isGlobalTargeting, setIsGlobalTargeting] = useState(false); // New state for global targeting
  
  // Media upload states
  const [image, setImage] = useState("");
  const [imagePublicId, setImagePublicId] = useState("");
  const [video, setVideo] = useState("");
  const [videoPublicId, setVideoPublicId] = useState("");
  const [previewFile, setPreviewFile] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAdId, setCreatedAdId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  
  const inputRef = useRef();
  const imageInputRef = useRef();
  const videoInputRef = useRef();

  // Function to fetch exchange rates from a reliable API (using ExchangeRate-API)
  const fetchExchangeRates = async () => {
    try {
      setRatesLoading(true);
      // Using ExchangeRate-API (free tier, reliable)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data.rates) {
        setExchangeRates(data.rates);
        console.log('Exchange rates updated successfully');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Fallback rates if API fails
      setExchangeRates({
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 150,
        CAD: 1.36,
        AUD: 1.53,
        CHF: 0.88,
        CNY: 7.24,
        INR: 83.12,
        BRL: 5.02,
        ZAR: 18.75,
        KES: 128.5,
        NGN: 785.4,
        UGX: 3780,
        // Add more fallback rates as needed
      });
    } finally {
      setRatesLoading(false);
    }
  };

  // Function to detect user's country (you can implement geolocation or user preference)
  const detectUserCountry = async () => {
    try {
      // Try to get user's country from IP geolocation
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const countryName = data.country_name;
      
      // Check if the detected country is in our currency mapping
      if (COUNTRY_CURRENCIES[countryName]) {
        setUserCountry(countryName);
      }
    } catch (error) {
      console.log('Could not detect user country, using default');
      // Keep default country (USA)
    }
  };

  // Function to get currency info for user's country
  const getUserCurrency = () => {
    return COUNTRY_CURRENCIES[userCountry] || COUNTRY_CURRENCIES["United States"];
  };

  // Function to convert USD to user's currency
  const convertFromUSD = (usdAmount) => {
    const currency = getUserCurrency();
    const rate = exchangeRates[currency.code] || 1;
    return usdAmount * rate;
  };

  // Function to format currency display with comma separators
  const formatCurrency = (usdAmount) => {
    if (currencyMode === 'usd') {
      return `$${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const currency = getUserCurrency();
    const convertedAmount = convertFromUSD(usdAmount);
    // Format based on currency
    let formattedAmount;
    if (currency.code === 'JPY' || currency.code === 'KRW') {
      formattedAmount = Math.round(convertedAmount).toLocaleString();
    } else {
      formattedAmount = convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${currency.symbol}${formattedAmount}`;
  };

  // Fetch countries with flag images on mount, detect user country, and fetch exchange rates
  useEffect(() => {
    // Detect user's country
    detectUserCountry();
    
    // Fetch exchange rates
    fetchExchangeRates();
    
    // Fetch countries data
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

  const TARGET_USERBASE_OPTIONS = [
    { value: "1000", label: "1,000 - 10,000 users (Small audience)", multiplier: 1 },
    { value: "10000", label: "10,000 - 50,000 users (Medium audience)", multiplier: 1.3 },
    { value: "50000", label: "50,000 - 200,000 users (Large audience)", multiplier: 1.8 },
    { value: "200000", label: "200,000 - 1M users (Very large audience)", multiplier: 2.5 },
    { value: "1000000", label: "1M+ users (Maximum reach)", multiplier: 3.2 },
  ];

  // CPM-based calculation
  const calculatePayment = () => {
    if (!targetUserbase) return 0;
    const targetOption = TARGET_USERBASE_OPTIONS.find(option => option.value === targetUserbase);
    const audienceSize = targetOption ? Number(targetOption.value) : 1000;
    const estimatedViews = audienceSize * duration;
    return (estimatedViews / 1000) * FINANCE_CPM_USD;
  };

  const payment = calculatePayment();

  // For UI display
  const targetOption = TARGET_USERBASE_OPTIONS.find(option => option.value === targetUserbase);
  const audienceSize = targetOption ? Number(targetOption.value) : 0;
  const estimatedViews = audienceSize * duration;

  // Media upload functions
  const createFilePreview = (file, type) => {
    const url = URL.createObjectURL(file);
    setPreviewFile(url);
    setPreviewType(type);
  };

  const cleanupPreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile);
      setPreviewFile("");
      setPreviewType("");
    }
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Clear video if image is selected
      setVideo("");
      setVideoPublicId("");
      createFilePreview(file, "image");

      setIsUploading(true);
      setUploadProgress("Preparing image upload...");
      setUploadPercentage(0);

      try {
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
        }, 300);

        setUploadProgress("Uploading image to cloud...");

        const result = await uploadToCloudinary(file, {
          folder: "forex-journal/ads/images",
        });

        clearInterval(progressInterval);
        setUploadPercentage(100);

        if (result.success) {
          setImage(result.url);
          setImagePublicId(result.publicId);
          setPreviewFile(result.url); // Show uploaded image as preview
          setPreviewType("image");
          setUploadProgress("Image uploaded successfully!");
          setTimeout(() => {
            setUploadProgress("");
            setUploadPercentage(0);
          }, 1500);
        } else {
          console.error("Image upload failed:", result.error);
          setUploadProgress("Upload failed. Please try again.");
          cleanupPreview();
          setImage("");
          setImagePublicId("");
        }
      } catch (error) {
        console.error("Image upload error:", error);
        setUploadProgress("Upload failed. Please try again.");
        cleanupPreview();
        setImage("");
        setImagePublicId("");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    }
  };

  const handleVideoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Clear image if video is selected
      setImage("");
      setImagePublicId("");
      createFilePreview(file, "video");

      setIsUploading(true);
      setUploadProgress("Preparing video upload...");
      setUploadPercentage(0);

      try {
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
        }, 300);

        setUploadProgress("Uploading video to cloud... This may take a moment.");

        const result = await uploadToCloudinary(file, {
          folder: "forex-journal/ads/videos",
        });

        clearInterval(progressInterval);
        setUploadPercentage(100);

        if (result.success) {
          setVideo(result.url);
          setVideoPublicId(result.publicId);
          setPreviewFile(result.url); // Show uploaded video as preview
          setPreviewType("video");
          setUploadProgress("Video uploaded successfully!");
          setTimeout(() => {
            setUploadProgress("");
            setUploadPercentage(0);
          }, 1500);
        } else {
          console.error("Video upload failed:", result.error);
          setUploadProgress("Upload failed. Please try again.");
          cleanupPreview();
          setVideo("");
          setVideoPublicId("");
        }
      } catch (error) {
        console.error("Video upload error:", error);
        setUploadProgress("Upload failed. Please try again.");
        cleanupPreview();
        setVideo("");
        setVideoPublicId("");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    }
  };

  const removeMedia = () => {
    setImage("");
    setImagePublicId("");
    setVideo("");
    setVideoPublicId("");
    cleanupPreview();
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      cleanupPreview();
    };
  }, []);

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

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      alert("Please enter an ad title");
      return;
    }
    if (!description.trim()) {
      alert("Please enter an ad description");
      return;
    }
    if (!category) {
      alert("Please select a category");
      return;
    }
    if (!image && !video) {
      alert("Please upload either an image or video for your ad");
      return;
    }
    if (!linkUrl.trim()) {
      alert("Please enter a destination URL");
      return;
    }
    if (!isGlobalTargeting && selectedCountries.length === 0) {
      alert("Please select at least one target country or choose global targeting");
      return;
    }
    if (!targetUserbase) {
      alert("Please select a target audience size");
      return;
    }

    const adData = {
      title,
      description,
      category,
      image,
      imagePublicId,
      video,
      videoPublicId,
      linkUrl,
      targetingType: isGlobalTargeting ? 'global' : 'specific',
      targetCountries: isGlobalTargeting ? [] : selectedCountries.map(name => {
        const country = countryList.find(c => c.name === name);
        return {
          name,
          code: country?.code || '',
          tier: country?.tier || 3
        };
      }),
      duration,
      targetUserbase,
      userCountry
    };

    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_BASE}/ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adData)
      });

      const result = await response.json();

      if (result.success) {
        setCreatedAdId(result.ad?._id);
        setShowSuccessModal(true);
        clearForm(); // Clear all form inputs after successful creation
      } else {
        console.error('Ad creation failed:', result);
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map(err => err.msg).join('\n');
          alert(`Validation errors:\n${errorMessages}`);
        } else {
          alert(result.message || 'Failed to create ad');
        }
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('An error occurred while creating the ad');
    }
  };

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

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setCreatedAdId(null);
  };

  const handleViewAd = () => {
    setShowSuccessModal(false);
    // Navigate to ad preview or details (you can implement this later)
    console.log('View ad:', createdAdId);
  };

  const handleManageAds = () => {
    setShowSuccessModal(false);
    navigate('/dashboard/ad-management');
  };

  const clearForm = () => {
    // Clear all form inputs
    setTitle("");
    setDescription("");
    setCategory("");
    setLinkUrl("");
    setCountryQuery("");
    setSelectedCountries([]);
    setDuration(1);
    setTargetUserbase("");
    setShowSuggestions(false);
    setIsGlobalTargeting(false);
    setImage("");
    setImagePublicId("");
    setVideo("");
    setVideoPublicId("");
    setPreviewFile("");
    setPreviewType("");
    
    // Clear file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.value = '';
    });
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
        <form className="space-y-3" onSubmit={handleSubmit}>
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

          {/* Media Upload Section */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Ad Media (Required)
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading || video}
                  className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaImage className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {image ? "Change Image" : "Upload Image"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploading || image}
                  className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaVideo className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {video ? "Change Video" : "Upload Video"}
                  </span>
                </button>
              </div>
              
              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />

              {/* Media Preview */}
              {(previewFile || image || video) && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {(previewType === "video" || video) ? "Video Preview:" : "Image Preview:"}
                    </span>
                    <button
                      type="button"
                      onClick={removeMedia}
                      disabled={isUploading}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm"
                    >
                      <FaTrash size={12} />
                      Remove
                    </button>
                  </div>

                  {(previewType === "image" || (image && !video)) && (
                    <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                      <img
                        src={previewFile || image}
                        alt="Ad Preview"
                        className="w-full h-auto object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {(previewType === "video" || (video && !image)) && (
                    <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                      <video
                        src={previewFile || video}
                        controls
                        className="w-full h-auto object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    {uploadProgress}
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Link URL Field */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              <FaLink className="inline mr-2" />
              Destination URL (Where users go when they click your ad)
            </label>
            <input
              type="url"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="https://example.com/your-product"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Targeting Type
            </label>
            <div className="flex items-center space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="targetingType"
                  checked={!isGlobalTargeting}
                  onChange={() => {
                    setIsGlobalTargeting(false);
                    setSelectedCountries([]);
                  }}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-200">Specific Countries</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="targetingType"
                  checked={isGlobalTargeting}
                  onChange={() => {
                    setIsGlobalTargeting(true);
                    setSelectedCountries([]);
                  }}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-200">Global Targeting</span>
              </label>
            </div>
            {isGlobalTargeting && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Global Targeting:</strong> Your ad will be shown to users worldwide. 
                  This uses optimized delivery to reach the most relevant audience globally at competitive rates.
                </p>
              </div>
            )}
          </div>
          {!isGlobalTargeting && (
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
                        (Tier {country?.tier || 3})
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
                        (Tier {c.tier})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
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
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 || e.target.value === '') {
                  setDuration(value || 1);
                }
              }}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Target Userbase
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={targetUserbase}
              onChange={(e) => setTargetUserbase(e.target.value)}
              required
            >
              <option value="" disabled>
                Select target audience size
              </option>
              {TARGET_USERBASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Choose your target audience size to optimize ad reach and engagement
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-gray-700 dark:text-gray-200">
                Total Payment ({currencyMode === 'local' ? getUserCurrency().code : 'USD'})
              </label>
              <button
                type="button"
                onClick={() => setCurrencyMode(currencyMode === 'local' ? 'usd' : 'local')}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                style={{ color: '#a99d6b', border: '1px solid #a99d6b', background: 'transparent' }}
                disabled={ratesLoading}
              >
                {currencyMode === 'local' ? 'Show in USD' : `Show in ${getUserCurrency().code}`}
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={
                  ratesLoading 
                    ? "Loading exchange rates..." 
                    : payment > 0 
                      ? formatCurrency(payment) 
                      : isGlobalTargeting 
                        ? "Select target audience to see pricing"
                        : "Select countries and target audience to see pricing"
                }
                readOnly
              />
              {/* Currency toggle moved to button above, select removed */}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              CPM-based pricing: <b>${FINANCE_CPM_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per 1,000 views</b><br />
              Estimated views: <b>{estimatedViews.toLocaleString()}</b><br />
              Price calculation: <b>(Estimated Views / 1,000) × CPM</b><br />
              Example: ({estimatedViews.toLocaleString()} / 1,000) × ${FINANCE_CPM_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = <b>{formatCurrency(payment)}</b>
              {ratesLoading && <><br />Loading current exchange rates...</>}
            </span>
          </div>

          {/* Ad Preview Section */}
          {(title || description || image || video || linkUrl) && (
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Live Preview
              </label>
              <AdPreview
                title={title}
                description={description}
                image={image}
                video={video}
                linkUrl={linkUrl}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || (!image && !video)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
          >
            {isUploading ? "Uploading..." : "Create Ad"}
          </button>
        </form>
      </div>

      {/* Success Modal - Centered on screen */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            minWidth: '100vw',
            padding: '0',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              margin: 'auto', // 24px right, 16px left
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AdSuccessModal
              isOpen={showSuccessModal}
              onClose={handleModalClose}
              onViewAd={handleViewAd}
              onManageAds={handleManageAds}
            />
          </div>
        </div>
      )}
    </div>
  );
}
