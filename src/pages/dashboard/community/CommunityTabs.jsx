import { useState } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";

export default function CommunityTabs({ activeTab, setActiveTab, onCreatePost, visible = true, newPostsCount = 0 }) {
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
      className="w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-col items-center w-full">
        {/* Centered Tab Row */}
        <div className="flex gap-4 items-center justify-center w-full max-w-3xl mx-auto">
          {/* Mobile: show search icon with tabs, on click show search bar only */}
          {/* Desktop: show all elements */}
          {/* Mobile view logic */}
          <div className="flex items-center w-full justify-between md:hidden">
            {!searchMode ? (
              <div className="flex w-full items-center justify-between">
                <button
                  className={`flex-1 pb-2 text-base font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                    activeTab === "forYou"
                      ? "text-[#d4af37] border-[#d4af37]"
                      : "text-gray-400 border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("forYou")}
                  role="tab"
                  aria-selected={activeTab === "forYou"}
                >
                  For you
                  {newPostsCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full whitespace-nowrap">
                      {newPostsCount > 99 ? "99+" : newPostsCount}
                    </span>
                  )}
                </button>
                <button
                  className={`flex-1 pb-2 text-base font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                    activeTab === "following"
                      ? "text-[#d4af37] border-[#d4af37]"
                      : "text-gray-400 border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("following")}
                  role="tab"
                  aria-selected={activeTab === "following"}
                >
                  Following
                </button>
                <div className="flex-1 flex justify-center">
                  <button
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
                    aria-label="Search"
                    type="button"
                    onClick={() => setSearchMode(true)}
                  >
                    <FaSearch className="w-3 h-3" />
                  </button>
                </div>
                {onCreatePost && (
                  <button
                    onClick={onCreatePost}
                    className="ml-2 px-3 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white font-medium rounded-full transition-all duration-200 flex items-center gap-2 text-xs"
                    aria-label="Create new post"
                  >
                    <FaPlus className="w-3 h-3" />
                    <span className="hidden xs:inline sm:inline">Create Post</span>
                    <span className="inline xs:hidden sm:hidden">Create Post</span>
                  </button>
                )}
              </div>
            ) : (
              <form
                className="flex items-center w-full max-w-[180px] pl-1.5"
                onSubmit={e => {
                  e.preventDefault();
                  setSearchMode(false);
                  setSearchValue("");
                }}
              >
                <span className="flex items-center">
                  <FaSearch className="w-4 h-4 text-gray-500 mr-2" />
                </span>
                <input
                  type="text"
                  className="px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-[#d4af37] text-sm overflow-x-auto text-black"
                  style={{ width: "160px" }}
                  placeholder="Search..."
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  tabIndex={0}
                  autoFocus
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-2 bg-[#d4af37] text-white rounded-full text-xs font-medium"
                  disabled={!searchValue}
                  style={{ opacity: searchValue ? 1 : 0.5, cursor: searchValue ? 'pointer' : 'not-allowed' }}
                >
                  Go
                </button>
                <button
                  type="button"
                  className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-full text-xs font-medium"
                  onClick={() => { setSearchMode(false); setSearchValue(""); }}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          {/* Desktop view logic */}
          <div className="hidden md:flex gap-4 items-center justify-center w-full">
            <button
              className={`min-w-fit pb-2 text-base font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === "forYou"
                  ? "text-[#d4af37] border-[#d4af37]"
                  : "text-gray-400 border-transparent hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("forYou")}
              role="tab"
              aria-selected={activeTab === "forYou"}
            >
              For you
              {newPostsCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full whitespace-nowrap">
                  {newPostsCount > 99 ? "99+" : newPostsCount}
                </span>
              )}
            </button>
            <button
              className={`min-w-fit pb-2 text-base font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === "following"
                  ? "text-[#d4af37] border-[#d4af37]"
                  : "text-gray-400 border-transparent hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("following")}
              role="tab"
              aria-selected={activeTab === "following"}
            >
              Following
            </button>
            <form
              className="flex items-center max-w-[180px] ml-2"
              onSubmit={e => {
                e.preventDefault();
                setSearchMode(false);
                setSearchValue("");
              }}
            >
              <span className="flex items-center">
                <FaSearch className="w-4 h-4 text-gray-500 mr-2" />
              </span>
              <input
                type="text"
                className="px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-[#d4af37] text-sm overflow-x-auto text-black"
                style={{ width: "160px" }}
                placeholder="Search..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                tabIndex={0}
                autoFocus
              />
              {searchValue && (
                <>
                  <button
                    type="submit"
                    className="ml-2 px-3 py-2 bg-[#d4af37] text-white rounded-full text-xs font-medium"
                  >
                    Go
                  </button>
                  <button
                    type="button"
                    className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-full text-xs font-medium"
                    onClick={() => { setSearchMode(false); setSearchValue(""); }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </form>
            {onCreatePost && (
              <button
                onClick={onCreatePost}
                className="ml-2 px-3 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white font-medium rounded-full transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm"
                aria-label="Create new post"
              >
                <FaPlus className="w-3 h-3" />
                <span className="hidden xs:inline sm:inline">Create Post</span>
                <span className="inline xs:hidden sm:hidden">Create Post</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}