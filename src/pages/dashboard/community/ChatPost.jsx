import React, { useState, useEffect, useRef } from "react";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaUser, FaEdit, FaTrash, FaEllipsisV, FaSave, FaTimes, FaSort, FaSpinner } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import VerifiedBadge from "../../../components/VerifiedBadge";
import MediaDisplay from '../../../components/media/MediaDisplay';
import { addCommentToPost, likePost, likeComment, likeReply, editPost, deletePost, editComment, deleteComment, editReply, deleteReply, getPostLikes, searchUsers } from "../../../utils/api";
import { formatPostDate } from '../../../utils/formatDate';

// Enhanced MentionInput component with full mention functionality
function MentionInput({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  placeholder, 
  disabled, 
  onClose,
  initialMention = "",
  className = ""
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const inputRef = useRef(null);

  // Initialize with mention if provided
  useEffect(() => {
    if (initialMention && !value) {
      const mentionText = `@${initialMention} `;
      onChange({ target: { value: mentionText } });
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.selectionEnd = mentionText.length;
        }
      }, 0);
    }
  }, [initialMention, value, onChange]);

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    onChange(e);

    const caret = e.target.selectionStart;
    const textUpToCaret = inputValue.slice(0, caret);
    const mentionMatch = textUpToCaret.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStart(caret - mentionMatch[1].length - 1);
      setShowSuggestions(true);
      try {
        const users = await searchUsers(mentionMatch[1]);
        setSuggestions(users.users || []);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
      setMentionStart(null);
    }
  };

  const handleSuggestionClick = (username) => {
    if (mentionStart === null) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(inputRef.current.selectionStart);
    const newContent = `${before}@${username} ${after}`;
    onChange({ target: { value: newContent } });
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    setMentionStart(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPosition = (before + "@" + username + " ").length;
        inputRef.current.selectionStart = inputRef.current.selectionEnd = newPosition;
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault();
      onSubmit(e);
    } else if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
      setMentionStart(null);
    }
  };

  return (
    <div className="relative w-full max-w-full overflow-x-hidden">
      <form onSubmit={onSubmit} className="flex gap-2 items-center w-full max-w-full">
        <div className="flex-1 relative min-w-0 max-w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={`w-full max-w-full min-w-0 border rounded px-2 py-1 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${className}`}
          />
          
          {/* Mention suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto max-w-full">
              {suggestions.slice(0, 5).map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => handleSuggestionClick(user.username)}
                  className="w-full max-w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-600 dark:text-gray-400 text-xs" />
                  </div>
                  <div className="flex-1 min-w-0 max-w-full flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white break-words">
                      @{user.username}
                    </span>
                    {user.verified && <VerifiedBadge />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !value.trim()} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {loading ? "Sending..." : "Send"}
        </button>
        
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            ×
          </button>
        )}
      </form>
    </div>
  );
}

function ReplyInput({ onSubmit, loading, postId, commentId, replyToUsername = "" }) {
  const [replyText, setReplyText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmit(postId, replyText, commentId);
    setReplyText("");
  };

  const handleChange = (e) => {
    setReplyText(e.target.value);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <MentionInput
        value={replyText}
        onChange={handleChange}
        onSubmit={handleSubmit}
        loading={loading}
        placeholder={`Reply to @${replyToUsername}...`}
        initialMention={replyToUsername}
        className="text-sm"
      />
    </div>
  );
}

function renderHighlightedContent(content) {
  if (!content) return "";
  
  // Basic mention highlighting
  return content.replace(/@(\w+)/g, '<span class="text-blue-600 dark:text-blue-400 font-medium">@$1</span>');
}

// Helper function to check if content was actually edited
function isContentEdited(item) {
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
}

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
function sortComments(comments, sortType) {
  const sortedComments = [...comments];
  
  switch (sortType) {
    case 'newest':
      return sortedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'oldest':
      return sortedComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'most_liked':
      return sortedComments.sort((a, b) => {
        const aLikes = Array.isArray(a.likes) ? a.likes.length : 0;
        const bLikes = Array.isArray(b.likes) ? b.likes.length : 0;
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
}

// Get sort label
function getSortLabel(sortType) {
  switch (sortType) {
    case 'newest': return 'Newest first';
    case 'oldest': return 'Oldest first';
    case 'most_liked': return 'Most liked';
    case 'most_replies': return 'Most replies';
    default: return 'Sort';
  }
}

// Floating heart animation component using Tailwind
const FloatingHeart = ({ x, y, onAnimationEnd }) => {
  return (
    <div 
      className="fixed z-50 pointer-events-none animate-ping"
      style={{ 
        left: x - 15, 
        top: y - 15,
        animationDuration: '1s',
        animationFillMode: 'forwards',
        animationTimingFunction: 'ease-out'
      }}
      onAnimationEnd={onAnimationEnd}
    >
      <FaHeart className="text-red-500 text-2xl drop-shadow-lg" />
    </div>
  );
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
  const [commentSortType, setCommentSortType] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [commentsPerPage, setCommentsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  
  // New state for animations
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const postContainerRef = useRef(null);
  
  // New state for likes
  const [showLikes, setShowLikes] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  
  const commentsRef = useRef(null);
  const postRef = useRef(null);
  const previousContentRef = useRef(post.content);

  const { search } = useLocation();

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

  // Check permissions
  const canEditDelete = (authorId) => {
    return String(authorId) === String(currentUserId);
  };

  const canDeleteAsPostOwner = () => {
    return String(post.author?._id || post.author) === String(currentUserId);
  };

  useEffect(() => {
    setLocalPost(prev => ({ ...prev, ...post }));
    previousContentRef.current = post.content;
  }, [post]);

  useEffect(() => {
    if (!post || !post._id) return;
    const node = postRef.current;
    if (!node) return;

    // Extract original post ID for tracking
    const originalPostId = post._originalId || post._id.split('_cycle_')[0] || post._id;
    
    // Check if we've already viewed this post in this session
    const viewKey = `viewed_post_${originalPostId}`;
    if (sessionStorage.getItem(viewKey)) {
      return; // Already viewed in this session
    }

    let hasViewed = false;
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasViewed) {
            // Mark as viewed in this session
            sessionStorage.setItem(viewKey, 'true');
            onView(post._id); // Pass the display ID to the handler
            hasViewed = true;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5, rootMargin: '0px 0px -10% 0px' }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [post._id, onView]);

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
      likes: [],
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
      likes: [],
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
      setActiveReply(null); // Close reply input after submission
    }
  };

  // Enhanced like handler with animation
  const handleLike = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Trigger pulse animation
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    
    // Create floating heart effect
    if (e && !liked) {
      const rect = e.currentTarget.getBoundingClientRect();
      const heartId = Date.now();
      const newHeart = {
        id: heartId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      setFloatingHearts(prev => [...prev, newHeart]);
      
      // Remove heart after animation
      setTimeout(() => {
        setFloatingHearts(prev => prev.filter(heart => heart.id !== heartId));
      }, 1000);
    }

    // Update liked state optimistically
    const newLiked = !liked;
    setLocalPost(prev => ({
      ...prev,
      likes: newLiked 
        ? (Array.isArray(prev.likes) ? [...prev.likes, currentUserId] : [currentUserId])
        : (Array.isArray(prev.likes) ? prev.likes.filter(id => String(id) !== String(currentUserId)) : [])
    }));

    try {
      await onLike(post._id);
    } catch (error) {
      console.error("Error in handleLike:", error);
      // Revert on error
      setLocalPost(prev => ({
        ...prev,
        likes: post.likes
      }));
    }
  };

  // Double-tap to like handler
  const handleDoubleTap = (e) => {
    const now = Date.now();
    const tapLength = now - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected
      e.preventDefault();
      if (!liked) {
        handleLike(e);
      }
    }
    
    setLastTap(now);
  };

  // Handler functions for editing
  const handleEditPost = () => {
    setEditingPost(true);
    setEditPostContent(localPost.content || '');
    setShowPostMenu(false);
  };

  const handleSavePostEdit = async () => {
    if (!editPostContent.trim()) return;
    
    try {
      await editPost(localPost._id, editPostContent);
      setLocalPost(prev => ({ ...prev, content: editPostContent }));
      setEditingPost(false);
    } catch (error) {
      console.error('Failed to edit post:', error);
    }
  };

  const handleCancelPostEdit = () => {
    setEditingPost(false);
    setEditPostContent('');
  };

  const handleDeletePost = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(localPost._id);
        if (onDelete) onDelete(localPost._id);
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
    setShowPostMenu(false);
  };

  // Comment handlers
  const handleEditComment = (commentId, content) => {
    setEditingComment(commentId);
    setEditCommentContent(content);
    setShowCommentMenus({});
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editCommentContent.trim()) return;
    
    try {
      await editComment(localPost._id, commentId, editCommentContent);
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => 
          c._id === commentId ? { ...c, content: editCommentContent } : c
        )
      }));
      setEditingComment(null);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleCancelCommentEdit = () => {
    setEditingComment(null);
    setEditCommentContent('');
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(localPost._id, commentId);
        setLocalPost(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c._id !== commentId)
        }));
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
    setShowCommentMenus({});
  };

  // Reply handlers
  const handleEditReply = (commentId, replyId, content) => {
    setEditingReply(`${commentId}-${replyId}`);
    setEditReplyContent(content);
    setShowReplyMenus({});
  };

  const handleSaveReplyEdit = async (commentId, replyId) => {
    if (!editReplyContent.trim()) return;
    
    try {
      await editReply(localPost._id, commentId, replyId, editReplyContent);
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => 
          c._id === commentId 
            ? {
                ...c,
                replies: c.replies.map(r => 
                  r._id === replyId ? { ...r, content: editReplyContent } : r
                )
              }
            : c
        )
      }));
      setEditingReply(null);
    } catch (error) {
      console.error('Failed to edit reply:', error);
    }
  };

  const handleCancelReplyEdit = () => {
    setEditingReply(null);
    setEditReplyContent('');
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        await deleteReply(localPost._id, commentId, replyId);
        setLocalPost(prev => ({
          ...prev,
          comments: prev.comments.map(c => 
            c._id === commentId 
              ? { ...c, replies: c.replies.filter(r => r._id !== replyId) }
              : c
          )
        }));
      } catch (error) {
        console.error('Failed to delete reply:', error);
      }
    }
    setShowReplyMenus({});
  };

  // Like handlers
  const handleLikeComment = async (commentId) => {
    setLoadingCommentLike(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await likeComment(localPost._id, commentId);
      // Update local state optimistically
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c._id === commentId) {
            const currentLikes = Array.isArray(c.likes) ? c.likes : [];
            const userLiked = currentLikes.map(String).includes(String(currentUserId));
            return {
              ...c,
              likes: userLiked 
                ? currentLikes.filter(id => String(id) !== String(currentUserId))
                : [...currentLikes, currentUserId]
            };
          }
          return c;
        })
      }));
    } catch (error) {
      console.error('Failed to like comment:', error);
    } finally {
      setLoadingCommentLike(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    setLoadingReplyLike(prev => ({ ...prev, [replyId]: true }));
    
    try {
      await likeReply(localPost._id, commentId, replyId);
      // Update local state optimistically
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c._id === commentId) {
            return {
              ...c,
              replies: c.replies.map(r => {
                if (r._id === replyId) {
                  const currentLikes = Array.isArray(r.likes) ? r.likes : [];
                  const userLiked = currentLikes.map(String).includes(String(currentUserId));
                  return {
                    ...r,
                    likes: userLiked 
                      ? currentLikes.filter(id => String(id) !== String(currentUserId))
                      : [...currentLikes, currentUserId]
                  };
                }
                return r;
              })
            };
          }
          return c;
        })
      }));
    } catch (error) {
      console.error('Failed to like reply:', error);
    } finally {
      setLoadingReplyLike(prev => ({ ...prev, [replyId]: false }));
    }
  };

  // Add this state near the other state declarations
  const [hiddenReplies, setHiddenReplies] = useState({}); // commentId -> boolean (true = hidden by default)

  // Add toggle function
  const toggleRepliesVisibility = (commentId) => {
    setHiddenReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  return (
    <>
      {/* Floating hearts */}
      {floatingHearts.map(heart => (
        <FloatingHeart
          key={heart.id}
          x={heart.x}
          y={heart.y}
          onAnimationEnd={() => {
            setFloatingHearts(prev => prev.filter(h => h.id !== heart.id));
          }}
        />
      ))}
      
      {/* Modern post wrapper */}
      <div 
        ref={postContainerRef}
        data-post-id={post._id}
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto mb-6 rounded-2xl overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/50 shadow-xl transition-all duration-300 ease-out"
        onTouchStart={handleDoubleTap}
        onDoubleClick={handleDoubleTap}
      >
        {/* HR and Username above media */}
        {(post.image || post.video) && (
          <>
            <hr className="border-gray-200/50 dark:border-gray-700/50" />
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />
                </div>
                <Link
                  to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                  className="font-bold text-gray-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {post.author?.username || post.user}
                </Link>
                {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                  <VerifiedBadge />
                )}
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
            className="overflow-hidden flex justify-center items-center"
            style={{ maxWidth: "100%", maxHeight: "60vh" }}
          >
            <MediaDisplay 
              imageUrl={post.image} 
              videoUrl={post.video}
              altText={`${post.author?.username || 'User'}'s post media`}
              className="max-w-full max-h-[60vh] object-contain w-auto h-auto"
            />
          </div>
        )}

        {/* Main content wrapper */}
        <div
          className={`p-6 backdrop-blur-sm transition-all overflow-x-hidden max-w-full ${
            post.image || post.video ? "rounded-none rounded-b-2xl" : "rounded-2xl"
          }`}
          style={{ maxWidth: "100%" }}
        >
          {/* Username and timestamp for non-media posts */}
          {!(post.image || post.video) && (
            <div className="flex items-center mb-4 gap-3">
              <Link 
                to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-opacity flex-shrink-0"
              >
                <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />
              </Link>
              <Link
                to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                className="font-bold text-gray-800 dark:text-white flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {post.author?.username || post.user}
                {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                  <VerifiedBadge />
                )}
              </Link>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                {formatPostDate(post.createdAt)}
                <EditedIndicator item={localPost} />
              </span>
              
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

          {/* Content section */}
          <div className="mb-4">
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
              <span 
                className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words break-all overflow-wrap-anywhere w-full max-w-full"
                dangerouslySetInnerHTML={{ __html: renderHighlightedContent(localPost.content || '') }}
              />
            )}
          </div>

          {/* Modern engagement bar */}
          <div className="flex items-center gap-6 text-base mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-indigo-50/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/30 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2">
              {/* Like icon button */}
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
              
              {/* Likes count button */}
              <button
                className={`font-semibold hover:underline transition-colors ${liked ? "text-red-500" : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  const likesCount = Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0;
                  if (likesCount > 0) {
                    setShowLikes(!showLikes);
                    
                    // Load likes if not already loaded and showing likes
                    if (!showLikes && likesUsers.length === 0) {
                      setLoadingLikes(true);
                      try {
                        const response = await getPostLikes(localPost._id, 100);
                        if (response.likes) {
                          setLikesUsers(response.likes);
                        }
                      } catch (error) {
                        console.error('Error fetching likes:', error);
                      } finally {
                        setLoadingLikes(false);
                      }
                    }
                  }
                }}
                disabled={Array.isArray(localPost.likes) ? localPost.likes.length === 0 : (localPost.likes || 0) === 0}
              >
                {Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0}
              </button>
            </div>

            <button
              onClick={() => {
                setShowLikes(false); // Close likes list first
                setShowComments((prev) => !prev);
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 active:scale-95"
              aria-label="Show comments"
            >
              <FaRegCommentDots className="transition-transform duration-200 hover:scale-110" />
              <span className="font-semibold">
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

            <span className="flex items-center gap-2 text-gray-400 dark:text-gray-500 ml-auto">
              <FaChartBar className="transition-transform duration-200 hover:scale-110" />
              <span className="font-semibold">{localPost.views || 0}</span>
            </span>
          </div>

          {/* Likes section */}
          {showLikes && (
            <div className="mt-4 relative w-full max-w-full overflow-x-hidden">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-sm text-red-600 dark:text-red-400">
                  Liked by {Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0} {(Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0) === 1 ? 'person' : 'people'}
                </div>
                
                <button
                  className="mobile-touch-target text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-xl font-bold px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowLikes(false)}
                  aria-label="Close likes"
                  type="button"
                >
                  ×
                </button>
              </div>
              
              <div className="w-full max-w-full">
                {loadingLikes ? (
                  <div className="flex items-center justify-center py-4">
                    <FaSpinner className="animate-spin text-gray-400" />
                  </div>
                ) : likesUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    No likes yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {likesUsers.map((user) => (
                      <div key={user._id} className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-gray-600 dark:text-gray-400 text-sm" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
                          >
                            {user.username}
                          </Link>
                          {user.verified && <VerifiedBadge />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments section - Only show if likes are NOT showing */}
          {showComments && !showLikes && (
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
                          {['newest', 'oldest', 'most_liked', 'most_replies'].map((sortOption) => (
                            <button
                              key={sortOption}
                              onClick={() => {
                                setCommentSortType(sortOption);
                                setShowSortMenu(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                commentSortType === sortOption 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {getSortLabel(sortOption)}
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
              
              {/* Switch to comment input link - show when reply input is active */}
              {activeReply !== null && (
                <div className="w-full mt-2 mb-3 max-w-full">
                  <span
                    onClick={() => setActiveReply(null)}
                    className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                  >
                    ← Add a comment to the post
                  </span>
                </div>
              )}
              
              {/* Comment input */}
              {activeReply === null && showCommentInput && (
                <div className="w-full mt-2 max-w-full overflow-x-hidden">
                  <MentionInput
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onSubmit={handleCommentSubmit}
                    loading={loadingComment}
                    placeholder="Write a comment..."
                    className="mobile-comment-input text-sm sm:text-base"
                  />
                </div>
              )}
              
              {/* Comments list */}
              <div className="w-full max-w-full overflow-x-hidden">
                {displayedComments.map((comment) => (
                  <div key={comment._id} data-comment-id={comment._id} className="mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4 w-full max-w-full overflow-x-hidden">
                    <div className="flex items-start gap-3 w-full max-w-full">
                      <Link 
                        to={`/dashboard/community/user/${encodeURIComponent(comment.author.username)}`}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"
                      >
                        <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />
                      </Link>
                      <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/dashboard/community/user/${encodeURIComponent(comment.author.username)}`}
                            className="font-semibold text-sm text-gray-900 dark:text-white hover:underline"
                          >
                            {comment.author.username}
                          </Link>
                          {comment.author.verified && <VerifiedBadge />}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPostDate(comment.createdAt)}
                          </span>
                          <EditedIndicator item={comment} />
                          
                          {/* Comment menu */}
                          {(canEditDelete(comment.author?._id || comment.user) || canDeleteAsPostOwner()) && (
                            <div className="relative ml-auto">
                              <button
                                onClick={() => setShowCommentMenus(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                              >
                                <FaEllipsisV size={10} />
                              </button>
                              {showCommentMenus[comment._id] && (
                                <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-40 py-1">
                                  {canEditDelete(comment.author?._id || comment.user) && (
                                    <button
                                      onClick={() => handleEditComment(comment._id, comment.content)}
                                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                                    >
                                      <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                                  >
                                    <FaTrash className="text-red-500 dark:text-red-400" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Comment content */}
                        {editingComment === comment._id ? (
                          <div className="space-y-2 w-full max-w-full">
                            <textarea
                              value={editCommentContent}
                              onChange={e => setEditCommentContent(e.target.value)}
                              className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              rows="2"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveCommentEdit(comment._id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelCommentEdit}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p 
                            className="text-sm text-gray-900 dark:text-gray-100 break-words break-all overflow-wrap-anywhere mb-2 w-full max-w-full"
                            dangerouslySetInnerHTML={{ __html: renderHighlightedContent(comment.content) }}
                          />
                        )}
                        
                        {/* Reply button */}
                        <div className="flex items-center gap-4 text-xs">
                          <button
                            onClick={() => setActiveReply(activeReply === comment._id ? null : comment._id)}
                            className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                          >
                            Reply
                          </button>
                          
                          {/* Like button for comments */}
                          <button
                            onClick={() => handleLikeComment(comment._id)}
                            disabled={loadingCommentLike[comment._id]}
                            className={`flex items-center gap-1 transition-colors ${
                              Array.isArray(comment.likes) && currentUserId && comment.likes.map(String).includes(String(currentUserId))
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                            }`}
                            aria-label="Like comment"
                          >
                            {Array.isArray(comment.likes) && currentUserId && comment.likes.map(String).includes(String(currentUserId))
                              ? <FaHeart /> 
                              : <FaRegHeart />
                            }
                            <span>{Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
                          </button>
                        </div>
                        
                        {/* Reply input - Show when activeReply matches comment ID */}
                        {activeReply === comment._id && (
                          <div className="mt-2 w-full max-w-full overflow-x-hidden">
                            <ReplyInput
                              onSubmit={handleReply}
                              loading={loadingReply[comment._id]}
                              postId={localPost._id}
                              commentId={comment._id}
                              replyToUsername={comment.author.username}
                            />
                          </div>
                        )}
                        
                        {/* Replies section with hide/show functionality */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 w-full max-w-full overflow-x-hidden">
                            {/* Show/Hide replies link */}
                            <span
                              onClick={() => toggleRepliesVisibility(comment._id)}
                              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                            >
                              {hiddenReplies[comment._id] === false ? `hide replies (${comment.replies.length})` : `show replies (${comment.replies.length})`}
                            </span>
                            
                            {/* Replies list - only show if not hidden */}
                            {hiddenReplies[comment._id] === false && (
                              <div className="mt-2 space-y-3 w-full max-w-full overflow-x-hidden">
                                {comment.replies.map((reply) => (
                                  <div key={reply._id} data-reply-id={reply._id} className="w-full max-w-full overflow-x-hidden">
                                    <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <Link
                                          to={`/dashboard/community/user/${encodeURIComponent(reply.author.username)}`}
                                          className="font-semibold text-sm text-gray-900 dark:text-white hover:underline break-words"
                                        >
                                          {reply.author.username}
                                        </Link>
                                        {reply.author.verified && <VerifiedBadge />}
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                          {formatPostDate(reply.createdAt)}
                                        </span>
                                        <EditedIndicator item={reply} />
                                        
                                        {/* Reply menu */}
                                        {(canEditDelete(reply.author?._id || reply.user) || canDeleteAsPostOwner()) && (
                                          <div className="relative ml-auto flex-shrink-0">
                                            <button
                                              onClick={() => setShowReplyMenus(prev => ({ ...prev, [`${comment._id}-${reply._id}`]: !prev[`${comment._id}-${reply._id}`] }))}
                                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                                            >
                                              <FaEllipsisV size={10} />
                                            </button>
                                            {showReplyMenus[`${comment._id}-${reply._id}`] && (
                                              <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-40 py-1">
                                                {canEditDelete(reply.author?._id || reply.user) && (
                                                  <button
                                                    onClick={() => handleEditReply(comment._id, reply._id, reply.content)}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-xs text-gray-700 dark:text-gray-300 transition-colors"
                                                  >
                                                    <FaEdit size={10} /> Edit
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleDeleteReply(comment._id, reply._id)}
                                                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-xs text-red-600 dark:text-red-400 transition-colors"
                                                >
                                                  <FaTrash size={10} /> Delete
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Reply content */}
                                      {editingReply === `${comment._id}-${reply._id}` ? (
                                        <div className="space-y-2 w-full max-w-full">
                                          <textarea
                                            value={editReplyContent}
                                            onChange={e => setEditReplyContent(e.target.value)}
                                            className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            rows="2"
                                          />
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleSaveReplyEdit(comment._id, reply._id)}
                                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                            >
                                              <FaSave size={10} />
                                            </button>
                                            <button
                                              onClick={handleCancelReplyEdit}
                                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                            >
                                              <FaTimes size={10} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p 
                                          className="text-sm text-gray-900 dark:text-gray-100 break-words break-all overflow-wrap-anywhere w-full max-w-full"
                                          dangerouslySetInnerHTML={{ __html: renderHighlightedContent(reply.content) }}
                                        />
                                      )}
                                      
                                      {/* Reply actions */}
                                      <div className="flex items-center gap-4 mt-1">
                                        <button
                                          onClick={() => handleLikeReply(comment._id, reply._id)}
                                          disabled={loadingReplyLike[reply._id]}
                                          className={`flex items-center gap-1 transition-colors ${
                                            Array.isArray(reply.likes) && currentUserId && reply.likes.map(String).includes(String(currentUserId))
                                              ? 'text-red-500'
                                              : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                                          }`}
                                          aria-label="Like reply"
                                        >
                                          {Array.isArray(reply.likes) && currentUserId && reply.likes.map(String).includes(String(currentUserId))
                                            ? <FaHeart /> 
                                            : <FaRegHeart />
                                          }
                                          <span>{Array.isArray(reply.likes) ? reply.likes.length : 0}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Load more comments button */}
                {hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMoreComments}
                      disabled={loadingMoreComments}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      {loadingMoreComments ? 'Loading...' : 'Show more comments'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}