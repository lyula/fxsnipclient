import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaEllipsisV, FaEdit, FaTrash, FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaSave, FaTimes, FaSort, FaSpinner } from "react-icons/fa";
import FloatingMenu from "../../../components/common/FloatingMenu";
import VerifiedBadge from "../../../components/VerifiedBadge";
import MediaDisplay from '../../../components/media/MediaDisplay';
import { addCommentToPost, likePost, likeComment, likeReply, editPost, deletePost, editComment, deleteComment, editReply, deleteReply, getPostLikes, searchUsers } from "../../../utils/api";
import { formatPostDate } from '../../../utils/formatDate';
import MentionInput from "../../../components/common/MentionInput"; 

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
  
  return content.replace(/@(\w+)/g, '<span class="text-blue-600 dark:text-blue-400 font-medium">@$1</span>');
}

function hasMoreThanThreeLines(content) {
  if (!content) return false;
  const lineCount = content.split('\n').length;
  return lineCount > 3;
}

function getFirstLine(content) {
  if (!content) return "";
  return content.split('\n')[0];
}

function isContentEdited(item) {
  if (item.editedAt) {
    return true;
  }
  
  if (item.isEdited === true) {
    return true;
  }
  
  if (item.contentUpdatedAt && item.createdAt) {
    const created = new Date(item.createdAt);
    const contentUpdated = new Date(item.contentUpdatedAt);
    return (contentUpdated.getTime() - created.getTime()) > 60000;
  }
  
  return false;
}

const EditedIndicator = ({ item, size = "xs" }) => {
  if (!isContentEdited(item)) return null;
  
  return (
    <span className={`text-gray-400 dark:text-gray-500 italic text-${size} ml-1`}>
      (edited)
    </span>
  );
};

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

function getSortLabel(sortType) {
  switch (sortType) {
    case 'newest': return 'Newest first';
    case 'oldest': return 'Oldest first';
    case 'most_liked': return 'Most liked';
    case 'most_replies': return 'Most replies';
    default: return 'Sort';
  }
}

const FloatingHeart = ({ x, y, onAnimationEnd }) => {
  return (
    <div 
      className="fixed z-50 pointer-events-none animate-ping"
      style={{ 
        left: Math.min(Math.max(x - 15, 10), window.innerWidth - 40), 
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
  const [showFullContent, setShowFullContent] = useState(false);
  const [commentSortType, setCommentSortType] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [commentsPerPage, setCommentsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [showLikes, setShowLikes] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [hiddenReplies, setHiddenReplies] = useState({});
  const postContainerRef = useRef(null);
  const commentsRef = useRef(null);
  const postRef = useRef(null);
  const previousContentRef = useRef(post.content);
  const commentMenuRefs = useRef({});
  const replyMenuRefs = useRef({});
  const { search } = useLocation();

  const liked = Array.isArray(localPost.likes) && currentUserId
    ? localPost.likes.map(String).includes(String(currentUserId))
    : false;

  const sortedComments = sortComments(localPost.comments || [], commentSortType);
  const totalComments = sortedComments.length;
  const startIndex = 0;
  const endIndex = currentPage * commentsPerPage;
  const displayedComments = sortedComments.slice(startIndex, endIndex);
  const hasMore = endIndex < totalComments;

  const canEditDelete = (authorId) => {
    return String(authorId) === String(currentUserId);
  };

  const canDeleteAsPostOwner = () => {
    return String(post.author?._id || post.author) === String(currentUserId);
  };

  useEffect(() => {
    setLocalPost(prev => ({ ...prev, ...post }));
    previousContentRef.current = post.content;
    setShowFullContent(false);
  }, [post]);

  useEffect(() => {
  console.log('Setting up IntersectionObserver for post:', post._id);
  
  if (!post || !post._id) {
    console.log('No post or post._id, skipping view tracking');
    return;
  }
  
  const node = postContainerRef.current;
  if (!node) {
    return;
  }

  const originalPostId = post._originalId || post._id.split('_cycle_')[0] || post._id;
  const viewKey = `viewed_post_${originalPostId}`;
  if (sessionStorage.getItem(viewKey)) {
    return;
  }

  let hasViewed = false;
  let timeoutId = null;
  
  const observer = new window.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasViewed) {
          // Add a small delay to prevent immediate triggering when browser regains focus
          timeoutId = setTimeout(() => {
            if (!hasViewed && entry.target && entry.isIntersecting) {
              sessionStorage.setItem(viewKey, 'true');
              onView(post._id);
              hasViewed = true;
              observer.disconnect();
            }
          }, 100); // 100ms delay
        }
      });
    },
    { 
      threshold: 0.5, // Increase threshold to 50% for more reliable detection
      rootMargin: '0px', // Remove negative bottom margin to prevent scroll adjustments
      // Add root to ensure we're using the correct scroll container
      root: null // Uses the viewport as root
    }
  );
  
  observer.observe(node);
  return () => {
    observer.disconnect();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [post._id, onView, postContainerRef]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("commentId") || params.get("replyId") || params.get("commentUserId")) {
      setShowComments(true);
    }
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMoreComments(true);
  }, [commentSortType]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideCommentMenus = Object.values(commentMenuRefs.current).every(
        (ref) => ref && !ref.contains(event.target)
      );
      const isOutsideReplyMenus = Object.values(replyMenuRefs.current).every(
        (ref) => ref && !ref.contains(event.target)
      );

      if (isOutsideCommentMenus) {
        setShowCommentMenus({});
      }
      if (isOutsideReplyMenus) {
        setShowReplyMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMoreComments = async () => {
    if (!hasMore || loadingMoreComments) return;
    
    setLoadingMoreComments(true);
    
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
    setActiveReply(null);
  }
};

  const handleLike = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    
    if (e && !liked) {
      const rect = e.currentTarget.getBoundingClientRect();
      const heartId = Date.now();
      const newHeart = {
        id: heartId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      setFloatingHearts(prev => [...prev, newHeart]);
      
      setTimeout(() => {
        setFloatingHearts(prev => prev.filter(heart => heart.id !== heartId));
      }, 1000);
    }

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
      setLocalPost(prev => ({
        ...prev,
        likes: post.likes
      }));
    }
  };

  const handleDoubleTap = (e) => {
    const now = Date.now();
    const tapLength = now - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      e.preventDefault();
      if (!liked) {
        handleLike(e);
      }
    }
    
    setLastTap(now);
  };

  const handleEditPost = () => {
    setEditingPost(true);
    setEditPostContent(localPost.content || '');
    setShowPostMenu(false);
  };

  const handleSavePostEdit = async () => {
    if (!editPostContent.trim()) return;
    
    try {
      await editPost(localPost._id, editPostContent);
      setLocalPost(prev => ({ 
        ...prev, 
        content: editPostContent,
        editedAt: new Date().toISOString()
      }));
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

  const handleEditComment = (commentId, content) => {
  console.log('handleEditComment called:', commentId, content); // Debug
  setEditingComment(commentId);
  setEditCommentContent(content);
};

  // Fixed handleSaveCommentEdit function
  const handleSaveCommentEdit = async (commentId) => {
  if (!editCommentContent.trim()) return;
  
  try {
    const response = await editComment(localPost._id, commentId, editCommentContent);
    
    // Check if response has error field, or if it's a successful response (has _id)
    if (response && !response.error && response._id) {
      // Update with the response from server which has the updated comments
      setLocalPost(response);
      setEditingComment(null);
      setEditCommentContent('');
    } else {
      console.error('Failed to edit comment:', response?.error || 'Unknown error');
      alert('Failed to edit comment. Please try again.');
    }
  } catch (error) {
    console.error('Failed to edit comment:', error);
    alert('Failed to edit comment. Please try again.');
  }
};

  const handleDeleteComment = async (commentId) => {
  console.log('handleDeleteComment called:', commentId); // Debug
  if (window.confirm('Are you sure you want to delete this comment?')) {
    try {
      const response = await deleteComment(localPost._id, commentId);
      
      if (response && !response.error && response._id) {
        setLocalPost(response);
        console.log('Comment deleted successfully'); // Debug
      } else {
        console.error('Failed to delete comment:', response?.error || 'Unknown error');
        alert('Failed to delete comment. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  }
};

  const handleEditReply = (commentId, replyId, content) => {
  console.log('handleEditReply called:', commentId, replyId, content); // Debug
  setEditingReply(`${commentId}-${replyId}`);
  setEditReplyContent(content);
};

  // Fixed handleSaveReplyEdit function
  const handleSaveReplyEdit = async (commentId, replyId) => {
  if (!editReplyContent.trim()) return;
  
  try {
    const response = await editReply(localPost._id, commentId, replyId, editReplyContent);
    
    if (response && !response.error && response._id) {
      // Update with the response from server which has the updated comments/replies
      setLocalPost(response);
      setEditingReply(null);
      setEditReplyContent('');
    } else {
      console.error('Failed to edit reply:', response?.error || 'Unknown error');
      alert('Failed to edit reply. Please try again.');
    }
  } catch (error) {
    console.error('Failed to edit reply:', error);
    alert('Failed to edit reply. Please try again.');
  }
};

  const handleCancelCommentEdit = () => {
  setEditingComment(null);
  setEditCommentContent('');
  // Don't manipulate menu state here
};

  const handleCancelReplyEdit = () => {
  setEditingReply(null);
  setEditReplyContent('');
  // Don't manipulate menu state here
};

  const handleDeleteReply = async (commentId, replyId) => {
  console.log('handleDeleteReply called:', commentId, replyId); // Debug
  if (window.confirm('Are you sure you want to delete this reply?')) {
    try {
      const response = await deleteReply(localPost._id, commentId, replyId);
      
      if (response && !response.error && response._id) {
        setLocalPost(response);
        console.log('Reply deleted successfully'); // Debug
      } else {
        console.error('Failed to delete reply:', response?.error || 'Unknown error');
        alert('Failed to delete reply. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
      alert('Failed to delete reply. Please try again.');
    }
  }
  // Don't close menu here - let the onClick handler do it
};

  const handleLikeComment = async (commentId) => {
    setLoadingCommentLike(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await likeComment(localPost._id, commentId);
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

  const toggleRepliesVisibility = (commentId) => {
    setHiddenReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  return (
    <>
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

      <div
        ref={postContainerRef}
        data-post-id={post._id}
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto mb-6 rounded-2xl overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/50 shadow-xl transition-all duration-300 ease-out"
        onTouchStart={handleDoubleTap}
        onDoubleClick={handleDoubleTap}
      >
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
                  className="font-bold text-gray-800 dark:text-white flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[120px] sm:max-w-none"
                >
                  {post.author?.username || post.user}
                </Link>
                {(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (
                  <VerifiedBadge />
                )}
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {formatPostDate(post.createdAt)}
                  <EditedIndicator item={localPost} />
                </span>
                
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
            </div>
          </>
        )}

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

        <div
          className={`p-6 backdrop-blur-sm transition-all overflow-x-hidden max-w-full ${
            post.image || post.video ? "rounded-none rounded-b-2xl" : "rounded-2xl"
          }`}
          style={{ maxWidth: "100%" }}
        >
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
                className="font-bold text-gray-800 dark:text-white flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[120px] sm:max-w-none"
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
              <div className="block text-base font-normal text-gray-900 dark:text-gray-100 break-words hyphens-auto w-full max-w-full overflow-wrap-anywhere">
                {hasMoreThanThreeLines(localPost.content || '') && !showFullContent ? (
                  <>
                    <span 
                      dangerouslySetInnerHTML={{ __html: renderHighlightedContent(getFirstLine(localPost.content || '')) }}
                    />
                    <button
                      onClick={() => setShowFullContent(true)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
                    >
                      read more
                    </button>
                  </>
                ) : (
                  <>
                    <span 
                      dangerouslySetInnerHTML={{ __html: renderHighlightedContent(localPost.content || '') }}
                    />
                    {hasMoreThanThreeLines(localPost.content || '') && showFullContent && (
                      <button
                        onClick={() => setShowFullContent(false)}
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
                      >
                        read less
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-base mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-indigo-50/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/30 shadow-sm transition-all duration-300">
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
                  const likesCount = Array.isArray(localPost.likes) ? localPost.likes.length : localPost.likes || 0;
                  if (likesCount > 0) {
                    setShowLikes(!showLikes);
                    
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
                setShowLikes(false);
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

          {showComments && !showLikes && (
            <div className="mt-4 relative w-full max-w-full overflow-x-hidden" ref={commentsRef}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                    Comments ({totalComments})
                  </div>
                  
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
              
              <div className="w-full max-w-full overflow-x-hidden">
                {displayedComments.map((comment) => (
                  <div key={comment._id} data-comment-id={comment._id} className="mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4 w-full max-w-full overflow-x-hidden">
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <Link
                        to={`/dashboard/community/user/${encodeURIComponent(comment.author.username)}`}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"
                      >
                        <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />
                      </Link>
                      <div className="flex-1 min-w-0 overflow-hidden">
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
                          
                          {(canEditDelete(comment.author?._id || comment.user) || canDeleteAsPostOwner()) && (
                            <div className="relative ml-auto">
                              <button
                                data-comment-menu={comment._id}
                                ref={el => (commentMenuRefs.current[comment._id] = el)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowCommentMenus(prev => ({ 
                                    ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
                                    [comment._id]: !prev[comment._id] 
                                  }));
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                              >
                                <FaEllipsisV size={10} />
                              </button>
                              <FloatingMenu
  anchorRef={{ current: commentMenuRefs.current[comment._id] }}
  open={!!showCommentMenus[comment._id]}
  onClose={() => setShowCommentMenus(prev => ({ ...prev, [comment._id]: false }))}
>
  {canEditDelete(comment.author?._id || comment.user) && (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Edit comment button clicked:', comment._id);
        handleEditComment(comment._id, comment.content);
        setShowCommentMenus({});
      }}
      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
    >
      <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit
    </button>
  )}
  <button
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Delete comment button clicked:', comment._id);
      setShowCommentMenus({});
      // Use requestAnimationFrame to ensure menu closes first
      requestAnimationFrame(() => {
        handleDeleteComment(comment._id);
      });
    }}
    className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
  >
    <FaTrash className="text-red-500 dark:text-red-400" /> Delete
  </button>
</FloatingMenu>
                            </div>
                          )}
                        </div>
                        
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
                            className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal mb-2 w-full max-w-full"
                            dangerouslySetInnerHTML={{ __html: renderHighlightedContent(comment.content) }}
                          />
                        )}
                        
                        <div className="flex items-center gap-4 text-xs">
                          <button
                            onClick={() => setActiveReply(activeReply === comment._id ? null : comment._id)}
                            className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                          >
                            Reply
                          </button>
                          
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
                        
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 w-full max-w-full overflow-x-hidden">
                            <span
                              onClick={() => toggleRepliesVisibility(comment._id)}
                              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                            >
                              {hiddenReplies[comment._id] === false ? `hide replies (${comment.replies.length})` : `show replies (${comment.replies.length})`}
                            </span>
                            
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
                                        
                                        {(canEditDelete(reply.author?._id || reply.user) || canDeleteAsPostOwner()) && (
                                          <div className="relative ml-auto flex-shrink-0">
                                            <button
                                              ref={el => (replyMenuRefs.current[`${comment._id}-${reply._id}`] = el)}
                                              onClick={() => setShowReplyMenus(prev => ({ 
                                                ...prev, 
                                                [`${comment._id}-${reply._id}`]: !prev[`${comment._id}-${reply._id}`] 
                                              }))}
                                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                                            >
                                              <FaEllipsisV size={10} />
                                            </button>
                                         <FloatingMenu
  anchorRef={{ current: replyMenuRefs.current[`${comment._id}-${reply._id}`] }}
  open={!!showReplyMenus[`${comment._id}-${reply._id}`]}
  onClose={() => setShowReplyMenus(prev => ({ ...prev, [`${comment._id}-${reply._id}`]: false }))}
>
  {canEditDelete(reply.author?._id || reply.user) && (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Edit reply button clicked:', reply._id);
        handleEditReply(comment._id, reply._id, reply.content);
        setShowReplyMenus({});
      }}
      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
    >
      <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit
    </button>
  )}
  <button
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Delete reply button clicked:', reply._id);
      setShowReplyMenus({});
      // Use requestAnimationFrame to ensure menu closes first
      requestAnimationFrame(() => {
        handleDeleteReply(comment._id, reply._id);
      });
    }}
    className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
  >
    <FaTrash className="text-red-500 dark:text-red-400" /> Delete
  </button>
</FloatingMenu>
                                          </div>
                                        )}
                                      </div>
                                      
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
                                          className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal w-full max-w-full"
                                          dangerouslySetInnerHTML={{ __html: renderHighlightedContent(reply.content) }}
                                        />
                                      )}
                                      
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