import React from "react";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar } from "react-icons/fa";
import { LuShare2 } from "react-icons/lu";

export default function PostInteractionBar({
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
  ...props
}) {
  return (
    <div className={`flex items-center gap-4 sm:gap-8 text-base mb-3 ${localPost.image || localPost.video ? 'w-full max-w-full px-1' : 'px-1 sm:px-2'} py-2 rounded-2xl bg-gradient-to-r from-white/80 to-indigo-50/60 dark:from-gray-900/60 dark:to-indigo-900/40 backdrop-blur-lg border border-gray-200/40 dark:border-gray-700/30 shadow-md transition-all duration-300 overflow-x-auto`}>
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleLike}
          className={`transition-all duration-200 rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 ${likeAnimating ? 'scale-110' : ''} ${liked ? "text-red-500" : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"}`}
          aria-label="Like"
        >
          {liked ? (
            <FaHeart className="text-red-500 drop-shadow-sm" />
          ) : (
            <FaRegHeart className="transition-transform duration-200 hover:scale-110" />
          )}
        </button>
        <button
          className={`font-semibold px-1 py-1 rounded-lg transition-colors duration-200 ${liked ? "text-red-500" : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"}`}
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
      <button
        onClick={() => {
          setShowLikes(false);
          setShowComments((prev) => !prev);
        }}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900 dark:hover:text-blue-400 transition-all duration-200 active:scale-95"
      >
        <FaRegCommentDots className="transition-transform duration-200 hover:scale-110" />
        <span className="font-semibold">
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
        className="flex items-center gap-1 rounded-full px-2 py-1 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900 dark:hover:text-red-400 transition-all duration-200 active:scale-95"
        aria-label="Share"
      >
        <LuShare2 className="transition-transform duration-200 hover:scale-110" />
        <span className="font-semibold">{localPost.shares ?? 0}</span>
      </button>
      <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 ml-auto px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-900/40">
        <FaChartBar className="transition-transform duration-200 hover:scale-110" />
        <span className="font-semibold">{localPost.views || 0}</span>
      </div>
    </div>
  );
}
