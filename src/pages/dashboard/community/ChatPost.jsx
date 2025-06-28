import React, { useState, useEffect } from "react";
import ChatReply from "./ChatReply";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import VerifiedBadge from "../../../components/VerifiedBadge";

export default function ChatPost({ post, onReply, onComment, onLike, onView, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(null); // Track which comment's replies are expanded

  useEffect(() => {
    onView(post.id);
    // Only count view once per mount
    // eslint-disable-next-line
  }, []);

  const liked = Array.isArray(post.likes) && currentUserId
    ? post.likes.map(String).includes(String(currentUserId))
    : false;

  return (
    <div className={`rounded-xl p-6 shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 transition-all`}>
      {/* Header */}
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{post.avatar}</span>
        <Link
          to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
          className="font-bold text-gray-800 dark:text-white flex items-center gap-1 hover:underline"
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <FaUser className="text-gray-400 text-lg" />
          </span>
          {post.author?.username || post.user}
          {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
            <VerifiedBadge />
          )}
        </Link>
        <span className="ml-3 text-xs text-gray-400">{post.timestamp}</span>
        {post.isAd && <span className="ml-3 px-2 py-0.5 bg-yellow-300 text-xs rounded">Ad</span>}
      </div>

      {/* Content */}
      <div className="mb-3">
        <span className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words">
          {post.content}
        </span>
      </div>
      {post.image && (
        <div className="mb-3">
          <img
            src={post.image}
            alt="Ad"
            className="rounded-lg w-full max-h-60 object-cover border"
          />
        </div>
      )}

      {/* Feature bar */}
      <div className="flex items-center gap-6 text-base mb-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm">
        {/* Like */}
        <button
          onClick={() => {
            if (!liked) {
              onLike(post._id); // Use _id, not id
            }
          }}
          className={`flex items-center gap-1 transition-colors ${
            liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
          }`}
          aria-label="Like"
        >
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
          <span className={liked ? "text-red-500" : ""}>
            {Array.isArray(post.likes) ? post.likes.length : post.likes || 0}
          </span>
        </button>

        {/* Comments */}
        <button
          onClick={() => setShowComments((prev) => !prev)}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
          aria-label="Show comments"
        >
          <FaRegCommentDots />
          <span>
            {Array.isArray(post.comments)
              ? post.comments.reduce(
                  (total, comment) =>
                    total +
                    1 +
                    (Array.isArray(comment.replies) ? comment.replies.length : 0),
                  0
                )
              : 0}
          </span>
        </button>

        {/* Views */}
        <span className="flex items-center gap-1 text-gray-400 ml-auto">
          <FaChartBar /> {post.views || 0}
        </span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 relative">
          {/* Close button */}
          <button
            className="absolute top-0 right-0 text-gray-400 hover:text-red-500 text-lg font-bold px-2 py-1 z-10"
            onClick={() => setShowComments(false)}
            aria-label="Close comments"
            type="button"
          >
            ×
          </button>
          <div className="font-semibold text-sm text-blue-700 mb-2 pr-6">Comments</div>
          <div className="max-h-80 overflow-y-auto pr-2">
            {post.comments && post.comments.length > 0 ? (
              post.comments.slice(0, 5).map((comment, idx) => {
                const replies = comment.replies || [];
                const isExpanded = expandedReplies === (comment._id || idx);
                const repliesToShow = isExpanded ? replies.slice(0, 20) : replies.slice(0, 1);

                return (
                  <div
                    key={comment._id || comment.id || idx}
                    className="mb-3 pl-2 border-l-2 border-blue-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 dark:text-white flex items-center gap-1">
                        <Link
                          to={`/dashboard/community/user/${encodeURIComponent(comment.author?.username || comment.user)}`}
                          className="font-bold text-gray-800 dark:text-white flex items-center gap-1 hover:underline"
                        >
                          {comment.author?.username || comment.user}
                          {(comment.author?.verified === true ||
                            comment.author?.verified === "blue" ||
                            comment.author?.verified === "grey" ||
                            comment.verified === true ||
                            comment.verified === "blue" ||
                            comment.verified === "grey") && <VerifiedBadge />}
                        </Link>
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">{comment.text || comment.content}</span>
                      <span className="text-xs text-gray-400">{comment.timestamp}</span>
                    </div>
                    {/* Replies to this comment */}
                    {repliesToShow.length > 0 && (
                      <div className="ml-4 mt-1">
                        {repliesToShow.map((reply, ridx) => (
                          <div key={ridx} className="flex items-center gap-2 text-sm mb-1">
                            <span className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                              {/* Replying to label */}
                              <span className="text-xs text-blue-500 mr-1">
                                Replying to&nbsp;
                                <Link
                                  to={`/dashboard/community/user/${encodeURIComponent(comment.author?.username || comment.user)}`}
                                  className="hover:underline text-blue-600"
                                >
                                  {comment.author?.username || comment.user}
                                </Link>
                              </span>
                              <Link
                                to={`/dashboard/community/user/${encodeURIComponent(reply.author?.username || reply.user)}`}
                                className="hover:underline text-blue-600"
                              >
                                {reply.author?.username || reply.user}
                                {reply.author?.verified && <VerifiedBadge />}
                              </Link>
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">{reply.content}</span>
                            <span className="text-xs text-gray-400 ml-2">{reply.timestamp}</span>
                          </div>
                        ))}
                        {/* Show more/less replies link */}
                        {replies.length > 1 && !isExpanded && (
                          <button
                            className="text-xs text-blue-600 hover:underline mt-1"
                            onClick={() => setExpandedReplies(comment._id || idx)}
                          >
                            Show more replies ({Math.min(replies.length, 20)})
                          </button>
                        )}
                        {isExpanded && replies.length > 1 && (
                          <button
                            className="text-xs text-blue-600 hover:underline mt-1"
                            onClick={() => setExpandedReplies(null)}
                          >
                            Hide replies
                          </button>
                        )}
                      </div>
                    )}
                    {/* Reply button for this comment */}
                    <button
                      className="text-xs text-blue-600 hover:underline mt-1"
                      onClick={() => setActiveReply(activeReply === idx ? null : idx)}
                    >
                      Reply
                    </button>
                    {/* Reply input for this comment */}
                    {activeReply === idx && (
                      <div className="ml-4 mt-2">
                        <ChatReply
                          onSubmit={reply => {
                            onReply(post._id, reply, comment._id);
                            setActiveReply(null);
                          }}
                          placeholder="Write a reply..."
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 text-sm">No comments yet.</div>
            )}
          </div>
          {/* Add new comment */}
          <div className="mt-2">
            <ChatReply
              onSubmit={comment => {
                onComment(post._id, comment);
              }}
              placeholder="Add a comment..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

