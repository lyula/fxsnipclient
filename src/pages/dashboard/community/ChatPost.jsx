import React, { useState, useEffect, useRef } from "react";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaUser } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import VerifiedBadge from "../../../components/VerifiedBadge";
import { addCommentToPost, likePost, searchUsers } from "../../../utils/api"; // Adjust path if needed
import { formatPostDate } from '../../../utils/formatDate'; // Adjust path if needed

function ReplyInput({ onSubmit, loading, postId, commentId }) {
  const [reply, setReply] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await onSubmit(postId, reply, commentId);
    setReply("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={reply}
        onChange={e => setReply(e.target.value)}
        placeholder="Write a reply..."
        className="flex-1 border rounded px-2 py-1"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !reply.trim()}
        className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

function renderHighlightedContent(content) {
  const parts = (content || "").split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="text-blue-600">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function ChatPost({
  post,
  onReply,
  onComment,
  onLike,
  onView,
  currentUserId,
  currentUsername,
  currentUserVerified
}) {
  const [showComments, setShowComments] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(null);
  const [comment, setComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [loadingReply, setLoadingReply] = useState({});
  const [localPost, setLocalPost] = useState(post); // Local state for optimistic updates
  const [error, setError] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(true);
  const [replyInputs, setReplyInputs] = useState({});
  const commentsRef = useRef(null);
  const postRef = useRef();

  useEffect(() => {
    setLocalPost(post); // Sync with prop if post changes
  }, [post]);

  useEffect(() => {
    if (!post || !post._id) return;
    const node = postRef.current;
    if (!node) return;

    let hasViewed = false;
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasViewed) {
            console.log(`View recorded for post: ${post._id}`);
            onView(post._id);
            hasViewed = true;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 } // 50% visible
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [post, onView]);

  const liked = Array.isArray(localPost.likes) && currentUserId
    ? localPost.likes.map(String).includes(String(currentUserId))
    : false;

  // Optimistic comment submit
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoadingComment(true);
    setError(null);

    // Create a temporary comment object with user data
    const tempComment = {
      _id: `temp-comment-${Date.now()}`,
      content: comment,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified },
      createdAt: new Date().toISOString(),
      replies: [],
    };

    // Optimistically update local state
    setLocalPost(prev => ({
      ...prev,
      comments: [tempComment, ...(prev.comments || [])],
    }));

    try {
      const res = await addCommentToPost(localPost._id, comment);
      // Even if backend returns 500, assume comment is saved (since it appears after refresh)
      if (res && res.comment && !res.error) {
        // Update with actual comment from backend if available
        setLocalPost(prev => ({
          ...prev,
          comments: [res.comment, ...prev.comments.filter(c => !c._id.startsWith('temp-comment'))],
        }));
      } else {
        // If backend fails (e.g., 500), try to fetch updated post via onComment
        if (onComment) {
          const updatedPost = await onComment();
          if (updatedPost) {
            setLocalPost(updatedPost); // Update with backend data
          }
        }
        // Keep optimistic comment in UI since backend saves it
      }
    } catch (e) {
      console.error("Error adding comment:", e);
      // Only set error for critical failures (e.g., network errors), not 500
      if (e.message.includes("Network Error")) {
        setError("Network error: Failed to post comment");
      }
      // Try to fetch updated post to get actual comment
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) {
            setLocalPost(updatedPost); // Update with backend data
          }
        } catch (fetchError) {
          console.error("Error fetching updated post:", fetchError);
          // Keep optimistic comment since backend likely saved it
        }
      }
    }
  };

  // Optimistic reply submit
  const handleReply = async (postId, replyText, commentId) => {
    setLoadingReply(prev => ({ ...prev, [commentId]: true }));
    setError(null);

    // Create a temporary reply object with user data
    const tempReply = {
      _id: `temp-reply-${Date.now()}`,
      content: replyText,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified }, // <-- CORRECT
      createdAt: new Date().toISOString(),
    };

    // Optimistically update local state
    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c =>
        c._id === commentId
          ? { ...c, replies: [tempReply, ...(c.replies || [])] }
          : c
      ),
    }));

    try {
      if (onReply) {
        const updatedPost = await onReply(postId, replyText, commentId); // Assume onReply returns updated post
        if (updatedPost) {
          setLocalPost(updatedPost); // Update with backend data
        }
      }
    } catch (e) {
      console.error("Error adding reply:", e);
      if (e.message.includes("Network Error")) {
        setError("Network error: Failed to post reply");
      }
      // Keep optimistic reply in UI since backend likely saves it
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) {
            setLocalPost(updatedPost); // Update with backend data
          }
        } catch (fetchError) {
          console.error("Error fetching updated post:", fetchError);
        }
      }
    } finally {
      setLoadingReply(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // Optimistic like handler
  const handleLike = async () => {
    setError(null);
    // Optimistically update local state
    setLocalPost(prev => {
      const alreadyLiked = Array.isArray(prev.likes) && currentUserId
        ? prev.likes.map(String).includes(String(currentUserId))
        : false;
      let newLikes;
      if (alreadyLiked) {
        newLikes = prev.likes.filter(like => String(like) !== String(currentUserId));
      } else {
        newLikes = [...(prev.likes || []), currentUserId];
      }
      return { ...prev, likes: newLikes };
    });

    // Send to backend
    try {
      await likePost(localPost._id);
      if (onLike) onLike(localPost._id);
    } catch (e) {
      console.error("Error liking post:", e);
      if (e.message.includes("Network Error")) {
        setError("Network error: Failed to like post");
      }
      // Revert optimistic update only for critical errors
      if (e.message.includes("Network Error")) {
        setLocalPost(prev => ({
          ...prev,
          likes: prev.likes.filter(like => String(like) !== String(currentUserId)),
        }));
      }
    }
  };

  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("commentId") || params.get("replyId") || params.get("commentUserId")) {
      setShowComments(true);
    }
  }, [search]);

  console.log("Views for post", localPost._id, localPost.views);

  if (error) {
    return (
      <div className="text-red-500 p-6">
        {error}. Please try again later.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 transition-all overflow-x-hidden"
      ref={postRef}
      style={{ maxWidth: "100%" }}
    >
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
        <span className="ml-3 text-xs text-gray-400">{formatPostDate(post.createdAt)}</span>
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
          onClick={handleLike}
          className={`flex items-center gap-1 transition-colors ${
            liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
          }`}
          aria-label="Like"
        >
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
          <span className={liked ? "text-red-500" : ""}>
            {Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0}
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
            {Array.isArray(localPost.comments)
              ? localPost.comments.reduce(
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
          <FaChartBar /> {localPost.views || 0}
        </span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 relative" ref={commentsRef}>
          {/* Close button */}
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold text-sm text-blue-700">Comments</div>
            <button
              className="text-gray-500 hover:text-red-500 text-xl font-bold px-2 py-0.5 rounded transition"
              onClick={() => setShowComments(false)}
              aria-label="Close comments"
              type="button"
            >
              ×
            </button>
          </div>
          {/* Add new comment input at the top */}
          {activeReply === null && showCommentInput && (
            <form
              onSubmit={handleCommentSubmit}
              className="w-full mt-2"
              style={{ maxWidth: "100%" }}
            >
              <MentionInput
                value={comment}
                onChange={setComment}
                onSubmit={handleCommentSubmit}
                loading={loadingComment}
                placeholder="Write a comment..."
                disabled={loadingComment}
                onClose={() => setShowCommentInput(false)}
              />
            </form>
          )}
          {activeReply === null && !showCommentInput && (
            <div className="mt-2">
              <button
                type="button"
                className="text-blue-600 hover:underline text-sm"
                onClick={() => setShowCommentInput(true)}
              >
                Add a comment
              </button>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto pr-2 hide-scrollbar w-full" style={{ maxWidth: "100%" }}>
            {localPost.comments && localPost.comments.length > 0 ? (
              localPost.comments.slice(0, 5).map((comment, idx) => {
                const replies = comment.replies || [];
                const isExpanded = expandedReplies === (comment._id || idx);
                const repliesToShow = isExpanded ? replies.slice(0, 20) : replies.slice(0, 1);

                return (
                  <div
                    key={comment._id || comment.user || idx}
                    id={`comment-${comment._id || comment.user || idx}`}
                    className="mb-3 pl-2 border-l-2 border-blue-100 dark:border-gray-700"
                    data-id={comment._id}
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
                      <span className="text-xs text-gray-400">{formatPostDate(comment.createdAt || comment.timestamp)}</span>
                    </div>
                    <div className="text-gray-900 dark:text-gray-100 break-words w-full">
                      {renderHighlightedContent(comment.text || comment.content)}
                    </div>
                    {/* Replies to this comment */}
                    {repliesToShow.length > 0 && (
                      <div className="mt-1">
                        {repliesToShow.map((reply, ridx) => (
                          <div key={reply._id || reply.user || ridx} id={`reply-${reply._id || reply.user || ridx}`} className="mb-1 w-full">
                            <div className="flex flex-col w-full">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-blue-500 mr-1">
                                  Replied to 
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
                                <span className="font-bold mx-1 text-gray-400">·</span>
                                <span className="text-xs text-gray-400">{formatPostDate(reply.createdAt || reply.timestamp)}</span>
                              </div>
                              <div className="text-gray-900 dark:text-gray-100 break-words w-full">
                                {renderHighlightedContent(reply.content)}
                              </div>
                            </div>
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
                      <form
                        className="ml-4 mt-2 w-full"
                        onSubmit={e => {
                          e.preventDefault();
                          handleReply(localPost._id, replyInputs[idx] || "", comment._id || idx);
                          setReplyInputs(inputs => ({ ...inputs, [idx]: "" }));
                        }}
                      >
                        <MentionInput
                          value={replyInputs[idx] || ""}
                          onChange={val => setReplyInputs(inputs => ({ ...inputs, [idx]: val }))}
                          onSubmit={e => {
                            e.preventDefault();
                            handleReply(localPost._id, replyInputs[idx] || "", comment._id || idx);
                            setReplyInputs(inputs => ({ ...inputs, [idx]: "" }));
                          }}
                          loading={loadingReply[comment._id || idx] || false}
                          placeholder="Write a reply..."
                          disabled={loadingReply[comment._id || idx] || false}
                        />
                        <button
                          type="button"
                          className="mt-2 text-xs text-blue-600 hover:underline"
                          onClick={() => setActiveReply(null)}
                        >
                          Write a comment instead
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 text-sm">No comments yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MentionInput({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
  disabled,
  onClose,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [caretPos, setCaretPos] = useState(0);
  const inputRef = useRef();

  // Detect @mention pattern and fetch suggestions
  useEffect(() => {
    const match = value.slice(0, caretPos).match(/@(\w*)$/);
    if (match && match[1].length > 0) {
      setMentionQuery(match[1]);
      searchUsers(match[1]).then(result => {
        const userList = Array.isArray(result) ? result : result.users;
        setSuggestions((userList || []).slice(0, 5));
        setShowSuggestions(true);
      });
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [value, caretPos]);

  // Insert mention
  const handleSelect = (username) => {
    const before = value.slice(0, caretPos).replace(/@\w*$/, `@${username} `);
    const after = value.slice(caretPos);
    const newValue = before + after;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery(""); // Ensures suggestions don't reappear until new @
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setCaretPos(e.target.selectionStart);
          }}
          onClick={e => setCaretPos(e.target.selectionStart)}
          onKeyUp={e => setCaretPos(e.target.selectionStart)}
          placeholder={placeholder}
          className="flex-1 border rounded px-2 py-1 min-w-0"
          disabled={disabled}
          style={{ maxWidth: "100%" }}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
        {onClose && (
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 text-lg font-bold px-2 py-1 rounded transition"
            aria-label="Close comment input"
            onClick={onClose}
            title="Hide comment input"
            tabIndex={0}
          >
            ×
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 mt-1 w-full bg-white border rounded shadow max-h-40 overflow-y-auto">
          {suggestions.map(user => (
            <li
              key={user._id}
              className="px-3 py-1 cursor-pointer hover:bg-blue-50 text-blue-600"
              onMouseDown={() => handleSelect(user.username)}
            >
              @{user.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}