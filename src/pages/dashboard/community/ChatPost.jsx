import React, { useState, useEffect } from "react";
import ChatReply from "./ChatReply";
import { FaHeart, FaRegHeart, FaChartBar, FaCheckCircle, FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import VerifiedBadge from "../../../components/VerifiedBadge";

// Remove the liked state entirely
export default function ChatPost({ post, onReply, onComment, onLike, onView, currentUserId }) {
  const [activeInput, setActiveInput] = useState(null);

  useEffect(() => {
    onView(post.id);
    // Only count view once per mount
    // eslint-disable-next-line
  }, []);

  // Always compute liked from props
  const liked = Array.isArray(post.likes) && currentUserId
    ? post.likes.map(String).includes(String(currentUserId))
    : false;

  return (
    <div
      className={`rounded-lg p-4 shadow ${post.isAd ? "bg-yellow-100 dark:bg-yellow-900" : "bg-white dark:bg-gray-800"}`}
    >
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">{post.avatar}</span>
        <Link
          to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
          className="font-bold text-gray-800 dark:text-white flex items-center gap-1 hover:underline"
        >
          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <FaUser className="text-gray-400 text-base" />
          </span>
          {post.author?.username || post.user}
          {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
            <VerifiedBadge />
          )}
        </Link>
        <span className="ml-2 text-xs text-gray-400">{post.timestamp}</span>
        {post.isAd && <span className="ml-2 px-2 py-0.5 bg-yellow-300 text-xs rounded">Ad</span>}
      </div>
      <div className="mb-2">
        <span className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words">
          {post.content}
        </span>
      </div>
      {post.image && (
        <div className="mb-2">
          <img
            src={post.image}
            alt="Ad"
            className="rounded-lg w-full max-h-60 object-cover border"
          />
        </div>
      )}
      {/* Feature bar */}
      <div className="flex items-center gap-4 text-sm mb-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 shadow">
        <button
          onClick={() => {
            if (!liked) {
              onLike(post.id);
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
        <button
          onClick={() => setActiveInput(activeInput === "reply" ? null : "reply")}
          className="hover:underline text-blue-600"
        >
          Reply
        </button>
        <button
          onClick={() => setActiveInput(activeInput === "comment" ? null : "comment")}
          className="hover:underline text-blue-600"
        >
          Comment
        </button>
        <span className="flex items-center gap-1 text-gray-500 ml-auto">
          <FaChartBar /> {post.views || 0}
        </span>
      </div>
      {activeInput === "reply" && (
        <ChatReply
          onSubmit={reply => {
            onReply(post.id, reply);
            setActiveInput(null);
          }}
          placeholder="Write a reply..."
        />
      )}
      {activeInput === "comment" && (
        <ChatReply
          onSubmit={comment => {
            onComment(post.id, comment);
            setActiveInput(null);
          }}
          placeholder="Write a comment..."
        />
      )}
      {post.replies?.length > 0 ? (
        <div className="mt-2 ml-4 border-l pl-2 border-blue-200">
          <div className="font-semibold text-xs text-blue-700 mb-1">Replies:</div>
          {post.replies.map((r, i) => (
            <div key={i} className="text-sm mb-1">
              <span className="font-bold">{r.user}:</span> {r.content} <span className="text-xs text-gray-400">{r.timestamp}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 ml-4 text-sm text-gray-500">
          No replies
        </div>
      )}
      {post.comments && post.comments.length > 0 ? (
        <div className="mt-2 ml-4 border-l pl-2 border-green-200">
          <div className="font-semibold text-xs text-green-700 mb-1">Comments:</div>
          {(post.comments || []).map(comment => (
            <div key={comment._id || comment.id}>{comment.text || comment.content}</div>
          ))}
        </div>
      ) : (
        <div className="mt-2 ml-4 text-sm text-gray-500">
          No comments
        </div>
      )}
    </div>
  );
}

