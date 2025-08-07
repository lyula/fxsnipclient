import React from "react";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar } from "react-icons/fa";
import { LuShare2 } from "react-icons/lu";

export default function AdsInteractionBar({
  liked,
  likeAnimating,
  handleLike,
  normalizedLikes,
  likesUsers,
  setShowLikes,
  showLikes,
  setShowComments,
  localPost,
  loadingLikes,
  getPostLikes,
  setLikesUsers,
  currentUserId,
  currentUsername,
  currentUserVerified,
  onShare, // <-- new prop
  views, // <-- new prop for robust view count
  ...props
}) {
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 mt-3 mx-0 mb-3 bg-slate-100 dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 transition-all duration-300 w-full max-w-full shadow-sm`}>
      {/* Left side - Main interactions */}
      <div className="flex items-center gap-4">
        {/* Like button */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className={`transition-all duration-200 rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 ${likeAnimating ? 'scale-110' : ''} ${liked ? "text-red-500" : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"}`}
            aria-label="Like"
          >
            {liked ? (
              <FaHeart className="text-red-500 drop-shadow-sm w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <FaRegHeart className="transition-transform duration-200 hover:scale-110 w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
          <button
            className={`text-sm sm:text-base font-semibold px-1 py-1 rounded-lg transition-colors duration-200 ${liked ? "text-red-500" : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"}`}
            onClick={async (e) => {
              e.stopPropagation();
              const likesCount = normalizedLikes.length;
              if (likesCount > 0) {
                setShowLikes(!showLikes);
                if (!showLikes && likesUsers.length === 0 && getPostLikes) {
                  try {
                    const response = await getPostLikes(localPost._id, 100);
                    if (response.likes) {
                      setLikesUsers(response.likes);
                    }
                  } catch (error) {
                    // Handle error if needed
                  }
                }
              }
            }}
            disabled={normalizedLikes.length === 0}
          >
            {normalizedLikes.length}
          </button>
        </div>

        {/* Comment button */}
        <button
          onClick={() => {
            setShowLikes(false);
            setShowComments((prev) => !prev);
          }}
          className="flex items-center gap-1 rounded-full px-1 py-0.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-400 transition-all duration-200 active:scale-95"
        >
          <FaRegCommentDots className="transition-transform duration-200 hover:scale-110 w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-sm sm:text-base font-semibold">
            {localPost.comments?.reduce(
              (total, comment) =>
                total + 1 + (Array.isArray(comment.replies) ? comment.replies.length : 0),
              0
            ) || 0}
          </span>
        </button>

        {/* Share button */}
        <button
          onClick={onShare}
          className="flex items-center gap-1 rounded-full px-1 py-0.5 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:text-gray-400 dark:hover:bg-green-900/50 dark:hover:text-green-400 transition-all duration-200 active:scale-95"
          aria-label="Share"
        >
          <LuShare2 className="transition-transform duration-200 hover:scale-110 w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-sm sm:text-base font-semibold">{localPost.shares ?? 0}</span>
        </button>
      </div>

      {/* Right side - Views */}
      <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 px-1 py-0.5 rounded-lg bg-gray-100/60 dark:bg-gray-900/40">
        <FaChartBar className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base font-semibold">{typeof views === 'number' ? views : (localPost.views || 0)}</span>
      </div>
    </div>
  );
}
