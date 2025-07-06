import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaEllipsisV, FaEdit, FaTrash, FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaSave, FaTimes, FaSort, FaSpinner } from "react-icons/fa";
import FloatingMenu from "../../../components/common/FloatingMenu";
import VerifiedBadge from "../../../components/VerifiedBadge";
import MediaDisplay from '../../../components/media/MediaDisplay';
import { addCommentToPost, likePost, likeComment, likeReply, editPost, deletePost, editComment, deleteComment, editReply, deleteReply, getPostLikes, searchUsers } from "../../../utils/api";
import { formatPostDate } from '../../../utils/formatDate';
import MentionInput from "../../../components/common/MentionInput";
import { usePostViewTracking } from '../../../hooks/usePostViewTracking'; 
import { useComments } from '../../../hooks/useComments';
import { useReplies } from '../../../hooks/useReplies';
import { renderHighlightedContent } from '../../../utils/renderHighlight.jsx';

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
  currentUserVerified,
  showComments: forceShowComments = false,
  highlightedCommentId = null,
  highlightedReplyId = null
}) {
  // Keep existing state that's not comment/reply related
  const [showComments, setShowComments] = useState(forceShowComments);
  const [activeReply, setActiveReply] = useState(null);
  const [comment, setComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [error, setError] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(true);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [commentSortType, setCommentSortType] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [showLikes, setShowLikes] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  
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

  const commentHook = useComments(localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified);
  const replyHook = useReplies(localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified);

  // Use hook functions and state
  const displayedComments = commentHook.getDisplayedComments(commentSortType, sortComments);
  const commentDisplayInfo = commentHook.getCommentDisplayInfo();
  const totalComments = localPost.comments?.length || 0;
  const hasMore = commentDisplayInfo.hasMoreComments;

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

  // Use the new post view tracking hook
  const { attachObserver } = usePostViewTracking(post, onView, {
    threshold: 0.5,
    rootMargin: '0px',
    enableOnFocus: false,
    debounceDelay: 150
  });

  // Attach observer when component mounts and container is ready
  useEffect(() => {
    if (postContainerRef.current && post._id) {
      attachObserver(postContainerRef.current);
    }
  }, [post._id, attachObserver]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("commentId") || params.get("replyId") || params.get("commentUserId")) {
      setShowComments(true);
    }
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideCommentMenus = Object.values(commentMenuRefs.current).every(
        (ref) => ref && !ref.contains(event.target)
      );
      const isOutsideReplyMenus = Object.values(replyMenuRefs.current).every(
        (ref) => ref && !ref.contains(event.target)
      );

      if (isOutsideCommentMenus) {
        commentHook.setShowCommentMenus({});
      }
      if (isOutsideReplyMenus) {
        replyHook.setShowReplyMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commentHook, replyHook]);

  // Use hook functions for comment operations
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    commentHook.handleCommentSubmit(e, comment, setComment, loadingComment, setLoadingComment, setError, onComment);
  };

  // Use hook functions for reply operations
  const handleReply = (postId, replyText, commentId) => {
    replyHook.handleReply(postId, replyText, commentId, onReply, onComment, setError);
    setActiveReply(null);
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
    
    // Update the likes count optimistically
    setLocalPost(prev => ({
      ...prev,
      likes: newLiked 
        ? (Array.isArray(prev.likes) ? [...prev.likes, currentUserId] : [currentUserId])
        : (Array.isArray(prev.likes) ? prev.likes.filter(id => String(id) !== String(currentUserId)) : [])
    }));

    // Update the likers list optimistically if it's loaded
    if (likesUsers.length > 0) {
      if (newLiked) {
        // Add current user to the likers list
        const currentUser = {
          _id: currentUserId,
          username: currentUsername,
          verified: currentUserVerified
        };
        setLikesUsers(prev => {
          // Don't add if already exists
          if (prev.some(user => String(user._id) === String(currentUserId))) {
            return prev;
          }
          return [currentUser, ...prev];
        });
      } else {
        // Remove current user from the likers list
        setLikesUsers(prev => prev.filter(user => String(user._id) !== String(currentUserId)));
      }
    }

    try {
      await onLike(post._id);
      console.log('Post like API success');
    } catch (error) {
      console.error("Error in handleLike:", error);
      // Revert the optimistic updates on error
      setLocalPost(prev => ({
        ...prev,
        likes: post.likes
      }));
      
      // Revert the likers list on error
      if (likesUsers.length > 0) {
        if (newLiked) {
          // Remove the user we optimistically added
          setLikesUsers(prev => prev.filter(user => String(user._id) !== String(currentUserId)));
        } else {
          // Add back the user we optimistically removed
          const currentUser = {
            _id: currentUserId,
            username: currentUsername,
            verified: currentUserVerified
          };
          setLikesUsers(prev => {
            if (prev.some(user => String(user._id) === String(currentUserId))) {
              return prev;
            }
            return [currentUser, ...prev];
          });
        }
      }
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

  useEffect(() => {
    if (typeof forceShowComments === 'boolean') setShowComments(forceShowComments);
  }, [forceShowComments]);

  // Scroll to highlighted comment/reply if provided
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
  }, [highlightedCommentId, highlightedReplyId, showComments]);

  // Ensure correct comment/reply is visible and expanded for notifications
  useEffect(() => {
    // For comments: ensure the correct page is shown
    if (highlightedCommentId && commentHook && localPost.comments) {
      setShowComments(true);
      const idx = localPost.comments.findIndex(c => String(c._id) === String(highlightedCommentId));
      if (idx !== -1 && commentHook.commentsPerPage) {
        const page = Math.floor(idx / commentHook.commentsPerPage);
        if (typeof commentHook.setCurrentCommentPage === 'function') {
          commentHook.setCurrentCommentPage(page);
        }
      }
    }
    // For replies: ensure the parent comment is expanded and the correct reply page is shown
    if (highlightedReplyId && replyHook && localPost.comments) {
      setShowComments(true);
      const parentComment = localPost.comments.find(c => c.replies.some(r => String(r._id) === String(highlightedReplyId)));
      if (parentComment && replyHook.setExpandedReplies) {
        replyHook.setExpandedReplies(prev => ({ ...prev, [parentComment._id]: true }));
        // Find the reply index and set the correct reply page
        const replyIdx = parentComment.replies.findIndex(r => String(r._id) === String(highlightedReplyId));
        if (replyIdx !== -1 && replyHook.repliesPerComment) {
          const replyPage = Math.floor(replyIdx / replyHook.repliesPerComment) + 1;
          if (typeof replyHook.setReplyPages === 'function') {
            replyHook.setReplyPages(prev => ({ ...prev, [parentComment._id]: replyPage }));
          }
        }
      }
    }
  }, [highlightedCommentId, highlightedReplyId, localPost.comments]);

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
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto mb-6 rounded-2xl overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/50 shadow-xl transition-all duration-300 ease-out"
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
            className="overflow-hidden flex justify-center items-center w-full"
            style={{ maxWidth: "100%", maxHeight: "60vh", width: "100%" }}
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
                    <span>
                      {renderHighlightedContent(getFirstLine(localPost.content || ''))}
                    </span>
                    <button
                      onClick={() => setShowFullContent(true)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
                    >
                      read more
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      {renderHighlightedContent(localPost.content || '')}
                    </span>
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

          {/* Interaction Bar */}
          <div className="flex items-center gap-3 sm:gap-6 text-base mb-4 px-2 sm:px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-indigo-50/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/30 shadow-sm transition-all duration-300 w-full max-w-full overflow-x-hidden">
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

            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 ml-auto">
              <FaChartBar className="transition-transform duration-200 hover:scale-110" />
              <span className="font-semibold">{localPost.views || 0}</span>
            </div>
          </div>

          {/* Likes Display */}
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

          {/* Comments Section */}
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
              
              {/* Navigation controls for comments pagination - moved to top for better UX */}
              {(commentDisplayInfo.hasPreviousComments || commentDisplayInfo.hasMoreComments) && (
                <div className="flex items-center justify-between gap-2 mb-3">
                  {commentDisplayInfo.hasPreviousComments && (
                    <button
                      onClick={commentHook.loadPreviousComments}
                      disabled={commentHook.loadingMoreComments}
                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      {commentHook.loadingMoreComments ? 'Loading...' : '← Previous 10'}
                    </button>
                  )}
                  
                  {/* Show current page info */}
                  {commentDisplayInfo.totalComments > commentHook.commentsPerPage && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Page {commentDisplayInfo.currentPage} of {Math.ceil(commentDisplayInfo.totalComments / commentHook.commentsPerPage)}
                    </span>
                  )}
                  
                  {commentDisplayInfo.hasMoreComments && (
                    <button
                      onClick={commentHook.loadMoreComments}
                      disabled={commentHook.loadingMoreComments}
                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      {commentHook.loadingMoreComments ? 'Loading...' : 'Next 10 →'}
                    </button>
                  )}
                </div>
              )}

              <div className="w-full max-w-full overflow-x-hidden">
                {displayedComments.map((comment) => {
                  const replyInfo = replyHook.getReplyDisplayInfo(comment);
                  const displayedReplies = replyHook.getDisplayedReplies(comment);
                  
                  return (
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
                                  ref={el => (commentMenuRefs.current[comment._id] = el)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    commentHook.setShowCommentMenus(prev => ({
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
                                  open={!!commentHook.showCommentMenus[comment._id]}
                                  onClose={() => commentHook.setShowCommentMenus(prev => ({ ...prev, [comment._id]: false }))}
                                >
                                  {canEditDelete(comment.author?._id || comment.user) && (
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Edit comment button clicked:', comment._id);
                                        commentHook.handleEditComment(comment._id, comment.content);
                                        commentHook.setShowCommentMenus({});
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
                                      commentHook.setShowCommentMenus({});
                                      requestAnimationFrame(() => {
                                        commentHook.handleDeleteComment(comment._id);
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
                          
                          {commentHook.editingComment === comment._id ? (
                            <div className="space-y-2 w-full max-w-full">
                              <textarea
                                value={commentHook.editCommentContent}
                                onChange={e => commentHook.setEditCommentContent(e.target.value)}
                                className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                rows="2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => commentHook.handleSaveCommentEdit(comment._id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                >
                                  <FaSave size={10} />
                                </button>
                                <button
                                  onClick={commentHook.handleCancelCommentEdit}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                >
                                  <FaTimes size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p 
                              className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal mb-2 w-full max-w-full"
                            >
                              {renderHighlightedContent(comment.content)}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs">
                            <button
                              onClick={() => setActiveReply(activeReply === comment._id ? null : comment._id)}
                              className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                            >
                              Reply
                            </button>
                            
                            <button
                              onClick={() => commentHook.handleLikeComment(comment._id)}
                              disabled={commentHook.loadingCommentLike[comment._id]}
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
                                loading={replyHook.loadingReply[comment._id]}
                                postId={localPost._id}
                                commentId={comment._id}
                                replyToUsername={comment.author.username}
                              />
                            </div>
                          )}
                          
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2 w-full max-w-full overflow-x-hidden">
                              {/* Reply toggle and navigation buttons */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span
                                  onClick={() => replyHook.toggleReplyExpansion(comment._id)}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
                                >
                                  {replyInfo.isExpanded 
                                    ? `Hide replies (${replyInfo.totalReplies})`
                                    : replyInfo.totalReplies > replyHook.repliesPerComment
                                      ? `View all ${replyInfo.totalReplies} replies`
                                      : `View ${replyInfo.totalReplies} ${replyInfo.totalReplies === 1 ? 'reply' : 'replies'}`
                                  }
                                </span>
                                
                                {/* Show current position when expanded */}
                                {replyInfo.isExpanded && replyInfo.totalReplies > replyHook.repliesPerComment && (
                                  <span className="text-xs text-gray-400">
                                    (showing replies {replyInfo.startIndex + 1}-{Math.min(replyInfo.endIndex, replyInfo.totalReplies)} of {replyInfo.totalReplies})
                                  </span>
                                )}
                              </div>
                              
                              {/* Navigation controls when expanded */}
                              {replyInfo.isExpanded && (replyInfo.showLoadPrevious || replyInfo.showLoadMore) && (
                                <div className="flex items-center gap-2 mb-2">
                                  {replyInfo.showLoadPrevious && (
                                    <button
                                      onClick={() => replyHook.loadPreviousReplies(comment._id)}
                                      disabled={replyHook.loadingMoreReplies[comment._id]}
                                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded"
                                    >
                                      {replyHook.loadingMoreReplies[comment._id] ? 'Loading...' : '← Previous'}
                                    </button>
                                  )}
                                  
                                  {replyInfo.showLoadMore && (
                                    <button
                                      onClick={() => replyHook.loadMoreReplies(comment._id)}
                                      disabled={replyHook.loadingMoreReplies[comment._id]}
                                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded"
                                    >
                                      {replyHook.loadingMoreReplies[comment._id] ? 'Loading...' : 'Next →'}
                                    </button>
                                  )}
                                  
                                  {/* Show all option */}
                                  {replyInfo.totalReplies > replyHook.repliesPerComment && (
                                    <button
                                      onClick={() => {
                                        replyHook.setExpandedReplies(prev => ({ ...prev, [comment._id]: false }));
                                        setTimeout(() => replyHook.showAllReplies(comment._id), 100);
                                      }}
                                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded"
                                    >
                                      Show All
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* Display replies - only when explicitly expanded */}
                              {replyInfo.isExpanded && (
                                <div className="space-y-3 w-full max-w-full overflow-x-hidden">
                                  {displayedReplies.map((reply, index) => (
                                    <div 
                                      key={reply._id} 
                                      data-reply-id={reply._id} 
                                      className="w-full max-w-full overflow-x-hidden transition-all duration-300 ease-in-out"
                                    >
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
                                                onClick={() => replyHook.setShowReplyMenus(prev => ({ 
                                                  ...prev, 
                                                  [`${comment._id}-${reply._id}`]: !prev[`${comment._id}-${reply._id}`] 
                                                }))}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                                              >
                                                <FaEllipsisV size={10} />
                                              </button>
                                              <FloatingMenu
                                                anchorRef={{ current: replyMenuRefs.current[`${comment._id}-${reply._id}`] }}
                                                open={!!replyHook.showReplyMenus[`${comment._id}-${reply._id}`]}
                                                onClose={() => replyHook.setShowReplyMenus(prev => ({ ...prev, [`${comment._id}-${reply._id}`]: false }))}
                                              >
                                                {canEditDelete(reply.author?._id || reply.user) && (
                                                  <button
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      console.log('Edit reply button clicked:', reply._id);
                                                      replyHook.handleEditReply(comment._id, reply._id, reply.content);
                                                      replyHook.setShowReplyMenus({});
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
                                                    replyHook.setShowReplyMenus({});
                                                    requestAnimationFrame(() => {
                                                      replyHook.handleDeleteReply(comment._id, reply._id);
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
                                        
                                        {replyHook.editingReply === `${comment._id}-${reply._id}` ? (
                                          <div className="space-y-2 w-full max-w-full">
                                            <textarea
                                              value={replyHook.editReplyContent}
                                              onChange={e => replyHook.setEditReplyContent(e.target.value)}
                                              className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              rows="2"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => replyHook.handleSaveReplyEdit(comment._id, reply._id)}
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                              >
                                                <FaSave size={10} />
                                              </button>
                                              <button
                                                onClick={replyHook.handleCancelReplyEdit}
                                                className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                                              >
                                                <FaTimes size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p 
                                            className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal mb-2 w-full max-w-full"
                                          >
                                            {renderHighlightedContent(reply.content)}
                                          </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 text-xs">
                                          <button
                                            onClick={() => replyHook.handleLikeReply(comment._id, reply._id)}
                                            disabled={replyHook.loadingReplyLike[reply._id]}
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
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
