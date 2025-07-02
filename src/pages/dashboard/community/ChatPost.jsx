import React, { useState, useEffect, useRef } from "react";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaUser, FaEdit, FaTrash, FaEllipsisV, FaSave, FaTimes, FaSort, FaSpinner } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import VerifiedBadge from "../../../components/VerifiedBadge";
import MediaDisplay from '../../../components/media/MediaDisplay';
import { addCommentToPost, likePost, likeComment, likeReply, editPost, deletePost, editComment, deleteComment, editReply, deleteReply } from "../../../utils/api";
import { formatPostDate } from '../../../utils/formatDate';

// Dummy MentionInput component (replace with your actual implementation)
function MentionInput({ value, onChange, onSubmit, loading, placeholder, disabled, onClose }) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2 w-full max-w-full flex-wrap">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border rounded px-2 py-1 text-sm sm:text-base min-w-0 box-border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        disabled={disabled}
        style={{ maxWidth: "100%" }}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 shrink-0 transition-colors"
      >
        {loading ? "Sending..." : "Send"}
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ×
        </button>
      )}
    </form>
  );
}

function ReplyInput({ onSubmit, loading, postId, commentId }) {
  const [reply, setReply] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await onSubmit(postId, reply, commentId);
    setReply("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-full flex-wrap">
      <input
        type="text"
        value={reply}
        onChange={e => setReply(e.target.value)}
        placeholder="Write a reply..."
        className="flex-1 border rounded px-2 py-1 text-sm sm:text-base min-w-0 box-border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        disabled={loading}
        style={{ maxWidth: "100%" }}
      />
      <button
        type="submit"
        disabled={loading || !reply.trim()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 shrink-0 transition-colors"
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
      ? <span key={i} className="text-blue-600 dark:text-blue-400">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// Helper function to check if content was actually edited
const isContentEdited = (item) => {
  // Method 1: Check for dedicated editedAt field (recommended backend approach)
  if (item.editedAt) {
    return true;
  }
  
  // Method 2: Check for isEdited boolean field
  if (item.isEdited === true) {
    return true;
  }
  
  // Method 3: Check for contentUpdatedAt field (separate from updatedAt)
  if (item.contentUpdatedAt && item.createdAt) {
    const created = new Date(item.createdAt);
    const contentUpdated = new Date(item.contentUpdatedAt);
    return (contentUpdated.getTime() - created.getTime()) > 60000;
  }
  
  // Fallback: If none of the above, don't show edited
  return false;
};

// Component to display edit indicator
const EditedIndicator = ({ item, size = "xs" }) => {
  if (!isContentEdited(item)) return null;
  
  return (
    <span className={`text-gray-400 dark:text-gray-500 italic text-${size} ml-1`}>
      (edited)
    </span>
  );
};

// Comment sorting functions
const sortComments = (comments, sortType) => {
  const sortedComments = [...comments];
  
  switch (sortType) {
    case 'newest':
      return sortedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'oldest':
      return sortedComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'most_liked':
      return sortedComments.sort((a, b) => {
        const aLikes = Array.isArray(a.likes) ? a.likes.length : 0;
        const bLikes = Array.isArray(b.likes) ? bLikes.length : 0;
        return bLikes - aLikes;
      });
    case 'most_replies':
      return sortedComments.sort((a, b) => {
        const aReplies = Array.isArray(a.replies) ? a.replies.length : 0;
        const bReplies = Array.isArray(b.replies) ? b.replies.length : 0;
        return bReplies - aReplies;
      });
    default:
      return sortedComments;
  }
};

export default function ChatPost({
  post,
  onReply,
  onComment,
  onLike,
  onView,
  onDelete,
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
  const [loadingCommentLike, setLoadingCommentLike] = useState({});
  const [loadingReplyLike, setLoadingReplyLike] = useState({});
  const [localPost, setLocalPost] = useState(post);
  const [error, setError] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(true);
  const [editingPost, setEditingPost] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");
  const [editReplyContent, setEditReplyContent] = useState("");
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showCommentMenus, setShowCommentMenus] = useState({});
  const [showReplyMenus, setShowReplyMenus] = useState({});
  
  // Pagination and sorting states
  const [commentSortType, setCommentSortType] = useState('newest'); // 'newest', 'oldest', 'most_liked', 'most_replies'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [commentsPerPage, setCommentsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  
  const commentsRef = useRef(null);
  const postRef = useRef();
  const previousContentRef = useRef(post.content); // Store previous content for reversion

  const { search } = useLocation();

  useEffect(() => {
    setLocalPost(post);
    previousContentRef.current = post.content; // Update previous content on post change
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
            onView(post._id);
            hasViewed = true;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [post, onView]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("commentId") || params.get("replyId") || params.get("commentUserId")) {
      setShowComments(true);
    }
  }, [search]);

  // Reset pagination when sort type changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMoreComments(true);
  }, [commentSortType]);

  const liked = Array.isArray(localPost.likes) && currentUserId
    ? localPost.likes.map(String).includes(String(currentUserId))
    : false;

  // Get sorted and paginated comments
  const sortedComments = sortComments(localPost.comments || [], commentSortType);
  const totalComments = sortedComments.length;
  const startIndex = 0;
  const endIndex = currentPage * commentsPerPage;
  const displayedComments = sortedComments.slice(startIndex, endIndex);
  const hasMore = endIndex < totalComments;

  // Load more comments
  const loadMoreComments = async () => {
    if (!hasMore || loadingMoreComments) return;
    
    setLoadingMoreComments(true);
    
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setLoadingMoreComments(false);
      setHasMoreComments(endIndex + commentsPerPage < totalComments);
    }, 500);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoadingComment(true);
    setError(null);

    const tempComment = {
      _id: `temp-comment-${Date.now()}`,
      content: comment,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified },
      createdAt: new Date().toISOString(),
      replies: [],
      likes: [], // Initialize likes array
    };

    setLocalPost(prev => ({
      ...prev,
      comments: [tempComment, ...(prev.comments || [])],
    }));

    try {
      const res = await addCommentToPost(localPost._id, comment);
      if (res && res.comment && !res.error) {
        setLocalPost(prev => ({
          ...prev,
          comments: [res.comment, ...prev.comments.filter(c => !c._id.startsWith('temp-comment'))],
        }));
      } else {
        if (onComment) {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("Network Error")) {
        setError("Network error: Failed to post comment");
      }
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        } catch (fetchError) {}
      }
    } finally {
      setLoadingComment(false);
      setComment("");
    }
  };

  const handleReply = async (postId, replyText, commentId) => {
    setLoadingReply(prev => ({ ...prev, [commentId]: true }));
    setError(null);

    const tempReply = {
      _id: `temp-reply-${Date.now()}`,
      content: replyText,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified },
      createdAt: new Date().toISOString(),
      likes: [], // Initialize likes array
    };

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
        const updatedPost = await onReply(postId, replyText, commentId);
        if (updatedPost) setLocalPost(updatedPost);
      }
    } catch (e) {
      if (e.message && e.message.includes("Network Error")) {
        setError("Network error: Failed to post reply");
      }
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        } catch (fetchError) {}
      }
    } finally {
      setLoadingReply(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLike = async () => {
    setError(null);
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

    try {
      await likePost(localPost._id);
      if (onLike) onLike(localPost._id);
    } catch (e) {
      if (e.message && e.message.includes("Network Error")) {
        setError("Network error: Failed to like post");
        setLocalPost(prev => ({
          ...prev,
          likes: prev.likes.filter(like => String(like) !== String(currentUserId)),
        }));
      }
    }
  };

  const handleLikeComment = async (commentId) => {
    setLoadingCommentLike(prev => ({ ...prev, [commentId]: true }));
    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c => {
        if (c._id !== commentId) return c;
        const alreadyLiked = Array.isArray(c.likes) && currentUserId
          ? c.likes.map(String).includes(String(currentUserId))
          : false;
        let newLikes;
        if (alreadyLiked) {
          newLikes = c.likes.filter(like => String(like) !== String(currentUserId));
        } else {
          newLikes = [...(c.likes || []), currentUserId];
        }
        return { ...c, likes: newLikes };
      }),
    }));
    try {
      await likeComment(localPost._id, commentId);
    } catch (error) {
      console.error("Error liking comment:", error);
    }
    setLoadingCommentLike(prev => ({ ...prev, [commentId]: false }));
  };

  const handleLikeReply = async (commentId, replyId) => {
    setLoadingReplyLike(prev => ({ ...prev, [replyId]: true }));
    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c => {
        if (c._id !== commentId) return c;
        return {
          ...c,
          replies: c.replies.map(r => {
            if (r._id !== replyId) return r;
            const alreadyLiked = Array.isArray(r.likes) && currentUserId
              ? r.likes.map(String).includes(String(currentUserId))
              : false;
            let newLikes;
            if (alreadyLiked) {
              newLikes = r.likes.filter(like => String(like) !== String(currentUserId));
            } else {
              newLikes = [...(r.likes || []), currentUserId];
            }
            return { ...r, likes: newLikes };
          }),
        };
      }),
    }));
    try {
      await likeReply(localPost._id, commentId, replyId);
    } catch (error) {
      console.error("Error liking reply:", error);
    }
    setLoadingReplyLike(prev => ({ ...prev, [replyId]: false }));
  };

  const handleEditPost = () => {
    setEditPostContent(localPost.content);
    setEditingPost(true);
    setShowPostMenu(false);
  };

  const handleSavePostEdit = async () => {
    if (!editPostContent.trim()) {
      setError("Post content cannot be empty");
      return;
    }

    // Store the current content for reversion in case of failure
    const previousContent = localPost.content;

    // Optimistically update the UI
    setLocalPost(prev => ({
      ...prev,
      content: editPostContent,
      editedAt: new Date().toISOString(), // Update editedAt for EditedIndicator
    }));

    try {
      const updatedPost = await editPost(localPost._id, editPostContent, localPost.image);
      // Validate server response
      if (updatedPost && updatedPost.content) {
        setLocalPost(prev => ({
          ...prev,
          ...updatedPost, // Merge server response, preserving client-side state
        }));
        previousContentRef.current = updatedPost.content;
      } else {
        // Revert on invalid response
        setLocalPost(prev => ({
          ...prev,
          content: previousContent,
          editedAt: updatedPost.editedAt || prev.editedAt,
        }));
        setError("Invalid response from server. Changes not saved.");
      }
    } catch (error) {
      // Revert on error
      setLocalPost(prev => ({
        ...prev,
        content: previousContent,
        editedAt: prev.editedAt,
      }));
      setError("Failed to save post edits. Please try again.");
      console.error("Error editing post:", error);
    } finally {
      setEditingPost(false);
      setEditPostContent("");
    }
  };

  const handleCancelPostEdit = () => {
    setEditingPost(false);
    setEditPostContent("");
    setError(null); // Clear any existing errors
  };

  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(localPost._id);
        if (onDelete) onDelete(localPost._id);
      } catch (error) {
        console.error("Error deleting post:", error);
        setError("Failed to delete post. Please try again.");
      }
    }
    setShowPostMenu(false);
  };

  const handleEditComment = (commentId, content) => {
    setEditCommentContent(content);
    setEditingComment(commentId);
    setShowCommentMenus(prev => ({ ...prev, [commentId]: false }));
  };

  const handleSaveCommentEdit = async (commentId) => {
    try {
      const updatedPost = await editComment(localPost._id, commentId, editCommentContent);
      setLocalPost(updatedPost);
      setEditingComment(null);
      setEditCommentContent("");
    } catch (error) {
      console.error("Error editing comment:", error);
      setError("Failed to edit comment. Please try again.");
    }
  };

  const handleCancelCommentEdit = () => {
    setEditingComment(null);
    setEditCommentContent("");
    setError(null);
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const updatedPost = await deleteComment(localPost._id, commentId);
        setLocalPost(updatedPost);
      } catch (error) {
        console.error("Error deleting comment:", error);
        setError("Failed to delete comment. Please try again.");
      }
    }
    setShowCommentMenus(prev => ({ ...prev, [commentId]: false }));
  };

  const handleEditReply = (commentId, replyId, content) => {
    setEditReplyContent(content);
    setEditingReply(`${commentId}-${replyId}`);
    setShowReplyMenus(prev => ({ ...prev, [`${commentId}-${replyId}`]: false }));
  };

  const handleSaveReplyEdit = async (commentId, replyId) => {
    try {
      const updatedPost = await editReply(localPost._id, commentId, replyId, editReplyContent);
      setLocalPost(updatedPost);
      setEditingReply(null);
      setEditReplyContent("");
    } catch (error) {
      console.error("Error editing reply:", error);
      setError("Failed to edit reply. Please try again.");
    }
  };

  const handleCancelReplyEdit = () => {
    setEditingReply(null);
    setEditReplyContent("");
    setError(null);
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (window.confirm("Are you sure you want to delete this reply?")) {
      try {
        const updatedPost = await deleteReply(localPost._id, commentId, replyId);
        setLocalPost(updatedPost);
      } catch (error) {
        console.error("Error deleting reply:", error);
        setError("Failed to delete reply. Please try again.");
      }
    }
    setShowReplyMenus(prev => ({ ...prev, [`${commentId}-${replyId}`]: false }));
  };

  const canEditDelete = (authorId) => {
    return String(authorId) === String(currentUserId);
  };

  const canDeleteAsPostOwner = (authorId) => {
    return String(localPost.author._id || localPost.author) === String(currentUserId);
  };

  const getSortLabel = (sortType) => {
    switch (sortType) {
      case 'newest': return 'Newest first';
      case 'oldest': return 'Oldest first';
      case 'most_liked': return 'Most liked';
      case 'most_replies': return 'Most replies';
      default: return 'Sort by';
    }
  };

  if (error) {
    return (
      <div className="text-red-500 p-6">
        {error}. Please try again later.
      </div>
    );
  }

  return (
    <>
      {/* HR and Username above media (with bold dot and timestamp) */}
      {(post.image || post.video) && (
        <>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <div className="px-2 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <FaUser className="text-gray-400 text-lg" />
              </span>
              <Link
                to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                className="font-bold text-gray-800 dark:text-white hover:underline"
              >
                {post.author?.username || post.user}
                {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                  <VerifiedBadge />
                )}
              </Link>
              <span className="font-bold text-gray-800 dark:text-white">•</span>
              <span className="text-xs text-gray-400 flex items-center">
                {formatPostDate(post.createdAt)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Media */}
      {(post.image || post.video) && (
        <div
          ref={postRef}
          className="border-x border-t border-b-0 border-gray-200 dark:border-gray-700 overflow-hidden flex justify-center items-center"
          style={{ maxWidth: "100%", maxHeight: "60vh", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          <MediaDisplay 
            imageUrl={post.image} 
            videoUrl={post.video}
            altText={`${post.author?.username || 'User'}'s post media`}
            className="max-w-full max-h-[60vh] object-contain w-auto h-auto"
          />
        </div>
      )}

      {/* Card wrapper for the rest */}
      <div
        className={`p-6 shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all overflow-x-hidden max-w-full ${
          post.image || post.video ? "rounded-none rounded-b-xl" : "rounded-xl"
        }`}
        style={{ maxWidth: "100%" }}
      >
        {/* Username, EditedIndicator, and three-dot menu below media (before caption) */}
        {(post.image || post.video) && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link
                to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                className="font-bold text-gray-800 dark:text-white flex items-center hover:underline"
              >
                {post.author?.username || post.user}
                {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                  <VerifiedBadge />
                )}
              </Link>
              <EditedIndicator item={localPost} />
            </div>
            {(canEditDelete(post.author?._id || post.author) || canDeleteAsPostOwner()) && (
              <div className="relative">
                <button
                  onClick={() => setShowPostMenu(!showPostMenu)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FaEllipsisV />
                </button>
                {showPostMenu && (
                  <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-48 py-2">
                    {canEditDelete(post.author?._id || post.author) && (
                      <button
                        onClick={handleEditPost}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit Post
                      </button>
                    )}
                    <button
                      onClick={handleDeletePost}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                    >
                      <FaTrash className="text-red-500 dark:text-red-400" /> Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Caption/content for media posts (with edit mode) */}
        {(post.image || post.video) && (
          <div className="mb-2">
            {editingPost ? (
              <div className="space-y-3">
                <textarea
                  value={editPostContent}
                  onChange={e => setEditPostContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Edit your post..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleSavePostEdit}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs disabled:opacity-50 transition-colors"
                    disabled={loadingComment || !editPostContent.trim()}
                  >
                    <FaSave size={10} /> Save
                  </button>
                  <button
                    onClick={handleCancelPostEdit}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                  >
                    <FaTimes size={10} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <span className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words">
                {renderHighlightedContent(localPost.content || '')}
              </span>
            )}
          </div>
        )}

        {/* Card header for posts without media (with icon and edit mode) */}
        {!(post.image || post.video) && (
          <div className="flex items-center mb-3">
            <Link 
              to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 mr-3 hover:opacity-80 transition-opacity"
            >
              <FaUser className="text-gray-400 text-lg" />
            </Link>
            <Link
              to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
              className="font-bold text-gray-800 dark:text-white flex items-center hover:underline"
            >
              {post.author?.username || post.user}
              {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                <VerifiedBadge />
              )}
            </Link>
            <span className="ml-3 text-xs text-gray-400 flex items-center">
              {formatPostDate(post.createdAt)}
              <EditedIndicator item={localPost} />
            </span>
            {/* Add post status indicator */}
            {post.postStatus && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                post.postStatus === 'viral' 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : post.postStatus === 'trending'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                  : post.postStatus === 'hot'
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                  : ''
              }`}>
                {post.postStatus === 'viral' && (
                  <>
                    <span>🔥</span>
                    <span>Viral</span>
                  </>
                )}
                {post.postStatus === 'trending' && (
                  <>
                    <span>📈</span>
                    <span>Trending</span>
                  </>
                )}
                {post.postStatus === 'hot' && (
                  <>
                    <span>🔥</span>
                    <span>Hot</span>
                  </>
                )}
              </span>
            )}
            
            {/* Post menu */}
            {(canEditDelete(post.author?._id || post.author) || canDeleteAsPostOwner()) && (
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowPostMenu(!showPostMenu)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FaEllipsisV />
                </button>
                {showPostMenu && (
                  <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-48 py-2">
                    {canEditDelete(post.author?._id || post.author) && (
                      <button
                        onClick={handleEditPost}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit Post
                      </button>
                    )}
                    <button
                      onClick={handleDeletePost}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                    >
                      <FaTrash className="text-red-500 dark:text-red-400" /> Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Caption/content for posts without media (with edit mode) */}
        {!(post.image || post.video) && (
          <div className="mb-3">
            {editingPost ? (
              <div className="space-y-3">
                <textarea
                  value={editPostContent}
                  onChange={e => setEditPostContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Edit your post..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleSavePostEdit}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs disabled:opacity-50 transition-colors"
                    disabled={loadingComment || !editPostContent.trim()}
                  >
                    <FaSave size={10} /> Save
                  </button>
                  <button
                    onClick={handleCancelPostEdit}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                  >
                    <FaTimes size={10} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <span className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words">
                {renderHighlightedContent(localPost.content || '')}
              </span>
            )}
          </div>
        )}

        {/* Feature bar */}
        <div className="flex items-center gap-4 sm:gap-6 text-base mb-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${
              liked ? "text-red-500" : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
            }`}
            aria-label="Like"
          >
            {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
            <span className={liked ? "text-red-500" : ""}>
              {Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0}
            </span>
          </button>

          <button
            onClick={() => setShowComments((prev) => !prev)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
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

          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 ml-auto">
            <FaChartBar /> {localPost.views || 0}
          </span>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 relative w-full max-w-full overflow-x-hidden" ref={commentsRef}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                  Comments ({totalComments})
                </div>
                
                {/* Sort dropdown */}
                {totalComments > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <FaSort size={10} />
                      {getSortLabel(commentSortType)}
                    </button>
                    {showSortMenu && (
                      <div className="absolute left-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-40 py-2">
                        {[
                          { value: 'newest', label: 'Newest first' },
                          { value: 'oldest', label: 'Oldest first' },
                          { value: 'most_liked', label: 'Most liked' },
                          { value: 'most_replies', label: 'Most replies' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setCommentSortType(option.value);
                              setShowSortMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              commentSortType === option.value 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                className="mobile-touch-target text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-xl font-bold px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowComments(false)}
                aria-label="Close comments"
                type="button"
              >
                ×
              </button>
            </div>
            
            {activeReply === null && showCommentInput && (
              <div className="w-full mt-2 max-w-full">
                <div className="flex gap-2 w-full max-w-full flex-wrap">
                  <input
                    type="text"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="mobile-comment-input flex-1 border rounded px-2 py-1 text-sm sm:text-base min-w-0 box-border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={loadingComment}
                    style={{ maxWidth: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={handleCommentSubmit}
                    disabled={loadingComment || !comment.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {loadingComment ? "Sending..." : "Send"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCommentInput(false)} 
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mobile-only"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            {activeReply === null && !showCommentInput && (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-sm transition-colors"
                  onClick={() => setShowCommentInput(true)}
                >
                  Add a comment
                </button>
              </div>
            )}
            
            <div className="w-full max-w-full">
              {displayedComments && displayedComments.length > 0 ? (
                <>
                  {displayedComments.map((comment, idx) => {
                    const replies = comment.replies || [];
                    const isExpanded = expandedReplies === (comment._id || idx);
                    const repliesToShow = isExpanded ? replies.slice(0, 20) : replies.slice(0, 1);
                    return (
                      <div
                        key={comment._id || comment.user || idx}
                        id={`comment-${comment._id || comment.user || idx}`}
                        className="mb-4 pl-3 border-l-2 border-blue-100 dark:border-blue-900"
                        data-id={comment._id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
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
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                              {formatPostDate(comment.createdAt || comment.timestamp)}
                              <EditedIndicator item={comment} />
                            </span>
                          </div>
                          {(canEditDelete(comment.author?._id || comment.author) || canDeleteAsPostOwner()) && (
                            <div className="relative">
                              <button
                                onClick={() => setShowCommentMenus(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <FaEllipsisV size={12} />
                              </button>
                              {showCommentMenus[comment._id] && (
                                <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-48 py-2">
                                  {canEditDelete(comment.author?._id || comment.author) && (
                                    <button
                                      onClick={() => handleEditComment(comment._id, comment.content)}
                                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                                    >
                                      <FaEdit size={10} className="text-blue-500 dark:text-blue-400" /> Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                                  >
                                    <FaTrash size={10} className="text-red-500 dark:text-red-400" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 text-gray-700 dark:text-gray-200 text-sm break-words">
                          {editingComment === comment._id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editCommentContent}
                                onChange={e => setEditCommentContent(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="3"
                                placeholder="Edit your comment..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleSaveCommentEdit(comment._id)}
                                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs disabled:opacity-50 transition-colors"
                                  disabled={loadingComment}
                                >
                                  <FaSave size={10} /> Save
                                </button>
                                <button
                                  onClick={handleCancelCommentEdit}
                                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                                >
                                  <FaTimes size={10} /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            renderHighlightedContent(comment.content)
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleLikeComment(comment._id)}
                            className={`flex items-center gap-1 transition-colors ${
                              Array.isArray(comment.likes) && comment.likes.map(String).includes(String(currentUserId)) 
                                ? "text-red-500" 
                                : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                            }`}
                            disabled={loadingCommentLike[comment._id]}
                            aria-label="Like comment"
                            type="button"
                          >
                            {Array.isArray(comment.likes) && comment.likes.map(String).includes(String(currentUserId)) 
                              ? <FaHeart /> 
                              : <FaRegHeart />}
                            <span>{Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
                          </button>
                        </div>
                        <div className="ml-4 mt-3">
                          {repliesToShow.map((reply, ridx) => (
                            <div key={reply._id || ridx} className="mb-3 pl-3 border-l border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between gap-1 text-xs mb-1">
                                <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                                  Replied to{" "}
                                  <Link
                                    to={`/dashboard/community/user/${encodeURIComponent(comment.author?.username || comment.user)}`}
                                    className="hover:underline text-blue-600 dark:text-blue-400 font-medium"
                                  >
                                    {comment.author?.username || comment.user}
                                  </Link>
                                </div>
                                {(canEditDelete(reply.author?._id || reply.author) || canDeleteAsPostOwner()) && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setShowReplyMenus(prev => ({ ...prev, [`${comment._id}-${reply._id}`]: !prev[`${comment._id}-${reply._id}`] }))}
                                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      <FaEllipsisV size={10} />
                                    </button>
                                    {showReplyMenus[`${comment._id}-${reply._id}`] && (
                                      <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-48 py-2">
                                        {canEditDelete(reply.author?._id || reply.author) && (
                                          <button
                                            onClick={() => handleEditReply(comment._id, reply._id, reply.content)}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-xs text-gray-700 dark:text-gray-300 transition-colors"
                                          >
                                            <FaEdit size={8} className="text-blue-500 dark:text-blue-400" /> Edit
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteReply(comment._id, reply._id)}
                                          className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-xs text-red-600 dark:text-red-400 transition-colors"
                                        >
                                          <FaTrash size={8} className="text-red-500 dark:text-red-400" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Link
                                  to={`/dashboard/community/user/${encodeURIComponent(reply.author?.username || reply.user)}`}
                                  className="font-bold text-gray-700 dark:text-gray-300 hover:underline text-sm"
                                >
                                  {reply.author?.username || reply.user}
                                  {(reply.author?.verified === true ||
                                    reply.author?.verified === "blue" ||
                                    reply.author?.verified === "grey" ||
                                    reply.verified === true ||
                                    reply.verified === "blue" ||
                                    reply.verified === "grey") && <VerifiedBadge />}
                                </Link>
                                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                                  {formatPostDate(reply.createdAt || reply.timestamp)}
                                  <EditedIndicator item={reply} />
                                </span>
                              </div>
                              <div className="text-gray-700 dark:text-gray-200 text-sm break-words mb-2">
                                {editingReply === `${comment._id}-${reply._id}` ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={editReplyContent}
                                      onChange={e => setEditReplyContent(e.target.value)}
                                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows="2"
                                      placeholder="Edit your reply..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => handleSaveReplyEdit(comment._id, reply._id)}
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs disabled:opacity-50 transition-colors"
                                        disabled={loadingComment}
                                      >
                                        <FaSave size={8} /> Save
                                      </button>
                                      <button
                                        onClick={handleCancelReplyEdit}
                                        className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                                      >
                                        <FaTimes size={8} /> Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  renderHighlightedContent(reply.content)
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLikeReply(comment._id, reply._id)}
                                  className={`flex items-center gap-1 transition-colors ${
                                    Array.isArray(reply.likes) && reply.likes.map(String).includes(String(currentUserId)) 
                                      ? "text-red-500" 
                                      : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                                  }`}
                                  disabled={loadingReplyLike[reply._id]}
                                  aria-label="Like reply"
                                  type="button"
                                >
                                  {Array.isArray(reply.likes) && reply.likes.map(String).includes(String(currentUserId)) 
                                    ? <FaHeart /> 
                                    : <FaRegHeart />}
                                  <span>{Array.isArray(reply.likes) ? reply.likes.length : 0}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          {replies.length > 1 && !isExpanded && (
                            <button
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-xs mt-2 transition-colors"
                              onClick={() => setExpandedReplies(comment._id || idx)}
                            >
                              View more replies ({replies.length - 1} more)
                            </button>
                          )}
                          {isExpanded && (
                            <button
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-xs mt-2 transition-colors"
                              onClick={() => setExpandedReplies(null)}
                            >
                              Hide replies
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {activeReply === comment._id ? (
                            <>
                              <ReplyInput
                                onSubmit={handleReply}
                                loading={loadingReply[comment._id] || false}
                                postId={localPost._id}
                                commentId={comment._id}
                              />
                              <button
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xs transition-colors"
                                onClick={() => setActiveReply(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-xs transition-colors"
                              onClick={() => setActiveReply(comment._id)}
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                
                  {/* Load More Comments Button */}
                  {hasMore && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={loadMoreComments}
                        disabled={loadingMoreComments}
                        className="flex items-center gap-2 mx-auto px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        {loadingMoreComments ? (
                          <>
                            <FaSpinner className="animate-spin" size={12} />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load more comments ({totalComments - displayedComments.length} remaining)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                
                  {/* End of comments indicator */}
                  {!hasMore && totalComments > commentsPerPage && (
                    <div className="mt-4 text-center">
                      <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                        You've seen all comments
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">No comments yet. Be the first to comment!</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}