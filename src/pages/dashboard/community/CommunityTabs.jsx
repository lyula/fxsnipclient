import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function CommunityTabs({ activeTab, setActiveTab, onCreatePost, visible = true, newPostsCount = 0 }) {
  const [touchStart, setTouchStart] = useState(0);

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
      <div className="flex items-center justify-between">
        {/* Tab Buttons */}
        <div className="flex gap-8">
          <button
            className={`pb-2 text-base font-semibold border-b-2 transition-all duration-200 ${
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
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {newPostsCount > 99 ? "99+" : newPostsCount}
              </span>
            )}
          </button>
          
          <button
            className={`pb-2 text-base font-semibold border-b-2 transition-all duration-200 ${
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
        </div>
        
        {/* Create Post Button with mobile spacing */}
        {onCreatePost && (
          <button
            onClick={onCreatePost}
            className="ml-4 sm:ml-0 px-3 sm:px-4 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white font-medium rounded-full transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm"
            aria-label="Create new post"
          >
            <FaPlus className="w-3 h-3" />
            <span className="hidden xs:inline sm:inline">Create Post</span>
            <span className="inline xs:hidden sm:hidden">Create Post</span>
          </button>
        )}
      </div>
    </div>
  );
}