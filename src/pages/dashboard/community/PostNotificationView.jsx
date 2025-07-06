import React, { useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import ChatPost from "./ChatPost";
import { useDashboard } from "../../../context/dashboard";
import { useAuth } from "../../../context/auth";
import { FaArrowLeft } from "react-icons/fa";

export default function PostNotificationView() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { search } = useLocation();
  const { communityPosts } = useDashboard();
  const { user } = useAuth();
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [openComments, setOpenComments] = React.useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = React.useState(null);
  const [highlightedReplyId, setHighlightedReplyId] = React.useState(null);

  // Parse query params
  useEffect(() => {
    const params = new URLSearchParams(search);
    const commentId = params.get("commentId");
    const replyId = params.get("replyId");
    if (commentId) {
      setOpenComments(true);
      setHighlightedCommentId(commentId);
    }
    if (replyId) {
      setHighlightedReplyId(replyId);
    }
  }, [search]);

  // Fetch the post (from context or API)
  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      let found = communityPosts.find((p) => String(p._id) === String(postId));
      if (!found) {
        // Try to fetch from API
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
        const res = await fetch(`${API_BASE}/posts/${postId}`);
        if (res.ok) {
          found = await res.json();
        }
      }
      setPost(found || null);
      setLoading(false);
    }
    fetchPost();
  }, [postId, communityPosts]);

  // Scroll to or highlight the relevant comment/reply after render
  useEffect(() => {
    if (highlightedCommentId) {
      const el = document.querySelector(`[data-comment-id='${highlightedCommentId}']`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-blue-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-blue-400"), 2000);
      }
    }
    if (highlightedReplyId) {
      const el = document.querySelector(`[data-reply-id='${highlightedReplyId}']`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-blue-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-blue-400"), 2000);
      }
    }
  }, [highlightedCommentId, highlightedReplyId, loading]);

  // Like handler for single post view
  async function handleLike(postId) {
    if (!user) return; // Optionally, redirect to login
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const updated = await res.json();
        setPost((prev) => ({ ...prev, likes: updated.likes }));
      }
    } catch (e) {
      // Optionally show error
    }
  }

  // Theme-responsive wrapper for the whole page, no extra white space
  return (
    <div className="absolute inset-0 flex flex-col min-h-0 h-full overflow-y-auto w-full max-w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col px-2 min-h-0">
        {/* Top bar with back and feed link */}
        <div className="w-full flex items-center mb-4 gap-2">
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={() => navigate("/dashboard/notifications")}
            aria-label="Back to notifications"
          >
            <FaArrowLeft className="text-lg text-blue-700 dark:text-blue-200" />
          </button>
          <Link
            to="/dashboard/community"
            className="ml-auto font-semibold text-base"
            style={{ color: '#a99d6b', textDecoration: 'none', background: 'none', padding: 0 }}
          >
            Proceed to posts feed
          </Link>
        </div>
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">Loading post...</div>
        ) : post ? (
          <ChatPost
            post={post}
            showComments={openComments}
            highlightedCommentId={highlightedCommentId}
            highlightedReplyId={highlightedReplyId}
            onLike={handleLike}
            currentUserId={user?._id}
            currentUsername={user?.username}
            currentUserVerified={user?.verified}
          />
        ) : (
          <div className="text-center text-red-500 py-12">Post not found.</div>
        )}
      </div>
    </div>
  );
}
