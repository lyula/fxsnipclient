import { useState } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";

export default function CommunityTabs({ activeTab, setActiveTab, onCreatePost, visible = true, newPostsCount = 0, onSearch, onCancelSearch }) {
  const [touchStart, setTouchStart] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Add touch handlers for swipe gestures
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0 && activeTab === "forYou") {
        setActiveTab("following");
      } else if (diff < 0 && activeTab === "following") {
        setActiveTab("forYou");
      }
    }
  };

  return (
    <div 
      className="w-full overflow-hidden"
      id="main-tabs-content"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container with same margins as posts but with top border styling */}
      <div className="mx-2 md:mx-3">
        <div className="bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 border-b-0 shadow-sm">
          {/* Mobile-first design - Google Material Design inspired */}
          <div className="w-full px-3 py-2">
            {/* Mobile Layout */}
            <div className="flex md:hidden">
          {!searchMode ? (
            /* Normal Mode - Balanced distribution with centered search */
            <div className="flex items-center w-full min-w-0">
              {/* Left side - Tab navigation */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <button
                  className={`relative py-3 text-base font-semibold transition-all duration-200 ${
                    activeTab === "forYou"
                      ? "text-[#a99d6b]"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={() => setActiveTab("forYou")}
                  role="tab"
                  aria-selected={activeTab === "forYou"}
                >
                  For you
                  {activeTab === "forYou" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a99d6b] rounded-full"></div>
                  )}
                  {newPostsCount > 0 && activeTab === "forYou" && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                <button
                  className={`relative py-3 text-base font-semibold transition-all duration-200 ${
                    activeTab === "following"
                      ? "text-[#a99d6b]"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={() => setActiveTab("following")}
                  role="tab"
                  aria-selected={activeTab === "following"}
                >
                  Following
                  {activeTab === "following" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a99d6b] rounded-full"></div>
                  )}
                </button>
              </div>
              
              {/* Center - Search icon */}
              <div className="flex-1 flex justify-center">
                <button
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 dark:bg-white dark:hover:bg-gray-200"
                  aria-label="Search posts"
                  onClick={() => setSearchMode(true)}
                >
                  <FaSearch className="w-4 h-4 text-gray-600 dark:text-gray-800" />
                </button>
              </div>
              
              {/* Right side - Create Post button */}
              <div className="flex items-center flex-shrink-0">
                {onCreatePost && (
                  <button
                    onClick={onCreatePost}
                    className="px-3 py-1.5 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-full transition-colors duration-200 flex items-center space-x-1.5 text-xs font-medium"
                    aria-label="Create new post"
                  >
                    <FaPlus className="w-3 h-3" />
                    <span>Create</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Search Mode - Full width search */
            <div className="flex items-center w-full space-x-3">
              <form
                className="flex-1 flex items-center space-x-2"
                onSubmit={e => {
                  e.preventDefault();
                  if (searchValue.trim() && onSearch) {
                    onSearch(searchValue.trim());
                    setSearchMode(false);
                    setSearchValue("");
                  }
                }}
              >
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] focus:border-transparent text-base placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100"
                    placeholder="Search posts..."
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-full text-xs font-medium transition-colors duration-200 disabled:opacity-50"
                  disabled={!searchValue.trim()}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="px-2 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-medium transition-colors duration-200"
                  onClick={() => {
                    setSearchMode(false);
                    setSearchValue("");
                    if (onCancelSearch) onCancelSearch();
                  }}
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Desktop Layout - Clean and spacious */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Left side - Tab navigation */}
          <div className="flex items-center space-x-6">
            <button
              className={`relative py-4 px-2 text-lg font-semibold transition-all duration-200 ${
                activeTab === "forYou"
                  ? "text-[#a99d6b]"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("forYou")}
              role="tab"
              aria-selected={activeTab === "forYou"}
            >
              For you
              {activeTab === "forYou" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a99d6b] rounded-full"></div>
              )}
              {newPostsCount > 0 && activeTab === "forYou" && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              className={`relative py-4 px-2 text-lg font-semibold transition-all duration-200 ${
                activeTab === "following"
                  ? "text-[#a99d6b]"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("following")}
              role="tab"
              aria-selected={activeTab === "following"}
            >
              Following
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a99d6b] rounded-full"></div>
              )}
            </button>
          </div>
          
          {/* Right side - Search and actions */}
          <div className="flex items-center space-x-3">
            <form
              className="flex items-center"
              onSubmit={e => {
                e.preventDefault();
                if (searchValue.trim() && onSearch) {
                  onSearch(searchValue.trim());
                  setSearchValue("");
                }
              }}
            >
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="pl-10 pr-4 py-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] focus:border-transparent text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 transition-all duration-200"
                  placeholder="Search posts..."
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    onClick={() => {
                      setSearchValue("");
                      if (onCancelSearch) onCancelSearch();
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </form>
            {onCreatePost && (
              <button
                onClick={onCreatePost}
                className="px-4 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white font-medium rounded-full transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm hover:shadow-md"
                aria-label="Create new post"
              >
                <FaPlus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}