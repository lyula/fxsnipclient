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
    <div className={`flex items-center gap-3 sm:gap-6 text-base mb-4 ${localPost.image || localPost.video ? 'w-full max-w-full px-2' : 'px-2 sm:px-4'} py-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-indigo-50/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/30 shadow-sm transition-all duration-300 overflow-x-hidden`}>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          className={`transition-all duration-300 hover:scale-110 active:scale-95 ${
            likeAnimating ? 'scale-110' : ''
          } ${
            liked ? "text-red-500" : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
          }`}
          aria-label="Like"
        >
          {liked ? (
            <FaHeart className="text-red-500 drop-shadow-sm" />
          ) : (
            <FaRegHeart className="transition-transform duration-200 hover:scale-110" />
          )}
        </button>
        <button
          className={`font-semibold hover:underline transition-colors ${liked ? "text-red-500" : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"}`}
          onClick={async (e) => {
            e.stopPropagation();
            const likesCount = normalizedLikes.length;
            if (likesCount > 0) {
              setShowLikes(!showLikes);
              if (!showLikes && likesUsers.length === 0 && getPostLikes) {
                // Optionally fetch likes if needed
                // setLoadingLikes(true); // Not handled here, pass loadingLikes prop if needed
                try {
                  const response = await getPostLikes(localPost._id, 100);
                  if (response.likes) {
                    setLikesUsers(response.likes);
                  }
                } catch (error) {
                  // Handle error if needed
                } finally {
                  // setLoadingLikes(false);
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
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 active:scale-95"
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
        className="flex items-center gap-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-all duration-300 hover:scale-105 active:scale-95"
        aria-label="Share"
      >
        <LuShare2 className="transition-transform duration-200 hover:scale-110" />
        <span className="font-semibold">{localPost.shares ?? 0}</span>
      </button>
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 ml-auto">
        <FaChartBar className="transition-transform duration-200 hover:scale-110" />
        <span className="font-semibold">{localPost.views || 0}</span>
      </div>
    </div>
  );
}
