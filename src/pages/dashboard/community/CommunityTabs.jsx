import { FaPlus } from "react-icons/fa";

export default function CommunityTabs({ activeTab, setActiveTab, onCreatePost }) {
  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 flex items-center justify-between px-2 sm:px-6 py-2">
      <div className="flex gap-8">
        <button
          className={`font-bold text-base px-2 py-1 rounded transition ${
            activeTab === "forYou"
              ? "text-[#1E3A8A] dark:text-[#a99d6b] border-b-2 border-[#a99d6b]"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={() => setActiveTab("forYou")}
        >
          For you
        </button>
        <button
          className={`font-bold text-base px-2 py-1 rounded transition ${
            activeTab === "following"
              ? "text-[#1E3A8A] dark:text-[#a99d6b] border-b-2 border-[#a99d6b]"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={() => setActiveTab("following")}
        >
          Following
        </button>
      </div>
    </div>
  );
}