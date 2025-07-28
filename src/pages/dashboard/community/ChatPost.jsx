// Video component with IntersectionObserver for autoplay/pause
function AutoPlayVideo({ src, className, style, ...props }) {
  const videoRef = React.useRef(null);
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            if (video.paused) video.play().catch(() => {});
          } else {
            if (!video.paused) video.pause();
          }
        },
        { threshold: [0, 0.5, 1] }
      );
      observer.observe(video);
    }
    return () => {
      if (observer && video) observer.unobserve(video);
    };
  }, [src]);
  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={style}
      controls
      playsInline
      preload="metadata"
      {...props}
    />
  );
}
// Header above media for images and for videos not taller than 16:9
function VideoHeaderAboveMedia({ post, setZoomProfile, handleEditPost, handleDeletePost, canEditDelete, canDeleteAsPostOwner, showPostMenu, setShowPostMenu, localPost }) {
  return (
    <div className="flex items-center p-2 gap-3 w-full" style={{ background: 'none' }}>
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-opacity flex-shrink-0 overflow-hidden cursor-pointer ml-2"
        onClick={() => post.author?.profile?.profileImage && setZoomProfile({ profileImage: post.author.profile.profileImage, username: post.author?.username || post.user })}
        title="View profile picture"
      >
        {post.author?.profile?.profileImage
          ? (<img
              src={post.author.profile.profileImage}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
              onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
            />)
          : (<FaUser className="text-gray-400 dark:text-gray-500 text-sm" />)
        }
      </div>
      <Link 
        to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
        className="font-bold text-gray-800 dark:text-white flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[120px] sm:max-w-none"
      >
        <span className="flex items-center">{post.author?.username || post.user}{(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (<VerifiedBadge />)}</span>
      </Link>
      <span className="mx-2 font-bold text-gray-400 dark:text-gray-500">•</span>
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        {typeof formatPostDate === 'function' ? formatPostDate(post.createdAt) : ''}
      </span>
      {(canEditDelete?.(post.author?._id || post.author) || canDeleteAsPostOwner?.()) && (
        <div className="ml-auto relative">
          <button
            onClick={() => setShowPostMenu && setShowPostMenu(!showPostMenu)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FaEllipsisV />
          </button>
          {showPostMenu && setShowPostMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 w-48 py-2">
              {canEditDelete?.(post.author?._id || post.author) && (
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
  );
}
import React, { useState, useRef, useEffect } from "react";
import ConfirmModal from '../../../components/common/ConfirmModal';
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaEllipsisV, FaEdit, FaTrash, FaHeart, FaRegHeart, FaRegCommentDots, FaChartBar, FaSave, FaTimes, FaSort, FaSpinner } from "react-icons/fa";
import { getConversations, addCommentToPost, likePost, likeComment, likeReply, editPost, deletePost, editComment, deleteComment, editReply, deleteReply, getPostLikes, searchUsers, sendMessage, incrementPostShareCount } from "../../../utils/api";
import VerifiedBadge from '../../../components/VerifiedBadge';
import MediaDisplay from '../../../components/media/MediaDisplay';
import { formatPostDate } from '../../../utils/formatDate';
import MentionInput from "../../../components/common/MentionInput";
import { usePostViewTracking } from '../../../hooks/usePostViewTracking'; 
import { useComments } from '../../../hooks/useComments';
import { useReplies } from '../../../hooks/useReplies';
import { renderHighlightedContent } from '../../../utils/renderHighlight.jsx';
import PostComment from "./postComment";
import CommentReplies from "./commentReplies";
import PostInteractionBar from '../../../components/PostInteractionBar';
import SharePostModal from '../../../components/SharePostModal';
import PostLikeListModal from '../../../components/PostLikeListModal';

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

// Utility to extract user IDs from likes array (handles array of IDs or array of user objects)
function extractUserIdsFromLikes(likes) {
  if (!Array.isArray(likes)) return [];
  return likes.map(like =>
    typeof like === 'object' && like !== null && like._id ? String(like._id) : String(like)
  );
}

// Utility to render hashtags as blue, non-clickable links
function renderHashtagsBlue(text) {
  if (!text) return text;
  // Regex: match #hashtags (letters, numbers, underscores, min 1 char, not just #)
  return text.split(/(#[\w\d_]+)/g).map((part, i) => {
    if (/^#[\w\d_]+$/.test(part)) {
      return (
        <span key={i} className="text-blue-600 dark:text-blue-400 font-medium cursor-default select-text">{part}</span>
      );
    }
    return part;
  });
}


// Helper to check if a video is tall (mobile format, i.e. height/width > 16/9)
function isTallVideo(videoUrl) {
  // This function will be used in the VideoUsernameOverlay component
  // We'll use a ref and effect to check the video aspect ratio dynamically
  // Here, just a placeholder for logic in the overlay component
  return false;
}

// Overlay component for username on tall videos
function VideoUsernameOverlay({ post, setZoomProfile, onEditPost, onDeletePost, canEditDelete, canDeleteAsPostOwner }) {

  const videoRef = React.useRef(null);
  const [showPostMenu, setShowPostMenu] = React.useState(false);

  // Autoplay/pause video when visible/invisible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Play if visible
            if (video.paused) video.play().catch(() => {});
          } else {
            if (!video.paused) video.pause();
          }
        },
        { threshold: [0, 0.5, 1] }
      );
      observer.observe(video);
    }
    return () => {
      if (observer && video) observer.unobserve(video);
    };
  }, [post.video]);

  return (
    <div style={{ position: 'relative', width: '100vw', maxWidth: '100vw', minWidth: '100vw', margin: 0, padding: 0 }}>
      <video
        ref={videoRef}
        src={post.video}
        className="w-full h-auto object-contain m-0 p-0"
        style={{
          display: 'block',
          background: 'black',
          width: '100vw',
          maxWidth: '100vw',
          minWidth: '100vw',
          borderRadius: 0,
          margin: 0,
          padding: 0,
          objectFit: 'contain',
        }}
        controls
        playsInline
        preload="metadata"
      />
      {/* Username and avatar, no background */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          padding: 0,
          maxWidth: '80vw',
          minHeight: 40,
        }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 overflow-hidden cursor-pointer border-2 border-white"
          onClick={() => post.author?.profile?.profileImage && setZoomProfile({ profileImage: post.author.profile.profileImage, username: post.author?.username || post.user })}
          title="View profile picture"
          style={{ flexShrink: 0 }}
        >
          {post.author?.profile?.profileImage
            ? (<img
                src={post.author.profile.profileImage}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
              />)
            : (<FaUser className="text-white text-sm" />)
          }
        </div>
        <div className="flex items-center ml-2 truncate" style={{ maxWidth: '60vw' }}>
          <Link
            to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
            className="font-bold flex items-center truncate"
            style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.7)', fontSize: 16 }}
          >
            <span className="flex items-center">{post.author?.username || post.user}{(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (<VerifiedBadge />)}</span>
          </Link>
          <span className="mx-2 font-bold text-gray-200" style={{ fontWeight: 700, fontSize: 18, userSelect: 'none' }}>•</span>
          <span className="text-sm text-gray-200 font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            {typeof formatPostDate === 'function' ? formatPostDate(post.createdAt) : ''}
          </span>
        </div>
      </div>
      {/* Three dots menu at top right */}
      {(canEditDelete?.(post.author?._id || post.author) || canDeleteAsPostOwner?.()) && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setShowPostMenu((v) => !v)}
            className="text-gray-200 hover:text-gray-50 dark:text-gray-300 dark:hover:text-white p-2 rounded-full hover:bg-gray-700/60 dark:hover:bg-gray-900/60 transition-colors"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            <FaEllipsisV />
          </button>
          {showPostMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-30 w-48 py-2">
              {canEditDelete?.(post.author?._id || post.author) && (
                <button
                  onClick={() => { setShowPostMenu(false); onEditPost?.(); }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit Post
                </button>
              )}
              <button
                onClick={() => { setShowPostMenu(false); onDeletePost?.(); }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
              >
                <FaTrash className="text-red-500 dark:text-red-400" /> Delete Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  highlightedReplyId = null,
  scrollable = false, // NEW PROP: only true in notification post view
  loading = false // <-- NEW PROP
}) {
  // For video aspect ratio logic
  const [isTallVideo, setIsTallVideo] = React.useState(undefined);

  // Check aspect ratio for videos
  React.useEffect(() => {
    if (post.video) {
      const video = document.createElement('video');
      video.src = post.video;
      video.onloadedmetadata = () => {
        const aspect = video.videoHeight / video.videoWidth;
        setIsTallVideo(aspect > 16/9);
      };
    } else {
      setIsTallVideo(undefined);
    }
  }, [post.video]);
  // ChatPost component implementation goes here
  // Move localPost state to the very top before any hooks that use it
  const [localPost, setLocalPost] = useState(post);
  // Track if we've already viewed this post in this session
  const [hasViewed, setHasViewed] = useState(false);
  // Remove parent state for editingCommentId and editCommentContent
  // Use only the hook's state for editingCommentId and editCommentContent
  const commentMenuRefs = useRef({});
  const replyMenuRefs = useRef({}); // <-- Add this line
  const commentHook = useComments(localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified, commentMenuRefs);
  const replyHook = useReplies(localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified, replyMenuRefs); // <-- Pass replyMenuRefs

  // Add state for comment editing (move to top)
  const [showComments, setShowComments] = useState(forceShowComments);
  const [activeReply, setActiveReply] = useState(null);
  const [comment, setComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
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
  const [zoomProfile, setZoomProfile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [topPeople, setTopPeople] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  // Add state for like modal
  const [showLikeListModal, setShowLikeListModal] = useState(false);
  const [likeListInitial, setLikeListInitial] = useState([]);

  // Fix: define postContainerRef
  const postContainerRef = useRef(null);
  const postRef = useRef(null); // Fix: define postRef for media container
  const previousContentRef = useRef(); // Fix: define previousContentRef
  const commentsRef = useRef(null); // Add this near other refs

  // Fix: get search from useLocation
  const { search } = useLocation();

  // Example: get top 4 people from your conversation list (replace with real data)
  useEffect(() => {
    async function fetchConversations() {
      setLoadingConversations(true);
      try {
        const data = await getConversations();
        // Assume data is an array of conversations, each with a 'user' object
        // Pick top 4 by recent activity or any logic you want
        const people = (data.conversations || data || []).map(conv => {
          const user = conv.user || conv.otherUser || conv;
          return {
            _id: user._id,
            username: user.username,
            profileImage: user.profileImage || user.profile?.profileImage,
            verified: user.verified || false,
          };
        }).slice(0, 4);
        setTopPeople(people);
      } catch (e) {
        setTopPeople([]);
      } finally {
        setLoadingConversations(false);
      }
    }
    fetchConversations();
  }, []);

  // Search handler for SharePostModal
  const handleUserSearch = async (query) => {
    setSearching(true);
    setSearchQuery(query);
    try {
      const res = await searchUsers(query);
      setSearchResults(res.users || res || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // The link to share (customize as needed)
  const postLink = `${window.location.origin}/post/${localPost._id}`;

  // Handler for sharing to a person
  const handleSendToPerson = async (person) => {
    try {
      await sendMessage(person._id, postLink);
      // Increment share count in DB
      try {
        const res = await incrementPostShareCount(localPost._id);
        console.log('[SHARE] incrementPostShareCount (sendToPerson) response:', res);
        setLocalPost(prev => ({ ...prev, shareCount: res.shareCount }));
      } catch (err) {
        console.error('[SHARE] Error incrementing share count (sendToPerson):', err);
      }
      // No alert, notification handled in SharePostModal
    } catch (e) {
      // Optionally handle error silently or with in-app toast only
    }
    setShowShareModal(false);
  };

  // Handler for share button in interaction bar
  const handleShare = async () => {
    setShowShareModal(true);
    console.log('[SHARE] handleShare called for post', localPost._id);
    // Increment share count in DB (for generic share, e.g. copy link)
    try {
      const res = await incrementPostShareCount(localPost._id);
      console.log('[SHARE] incrementPostShareCount response:', res);
      // Optionally update local share count
      setLocalPost(prev => ({ ...prev, shareCount: res.shareCount }));
    } catch (err) {
      console.error('[SHARE] Error incrementing share count:', err);
    }
  };

  // Normalize likes to always be array of user IDs
  const normalizedLikes = extractUserIdsFromLikes(localPost.likes);
  const liked = currentUserId ? normalizedLikes.includes(String(currentUserId)) : false;

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

// Sync localPost with parent post prop, and reset hasViewed if post._id changes
useEffect(() => {
  setLocalPost(prev => ({ ...prev, ...post }));
  previousContentRef.current = post.content;
  setShowFullContent(false);
  setHasViewed(false); // Reset view tracking if post changes
}, [post._id]);


// Robust handleView: only call once per session, update localPost.views
const handleView = async () => {
  if (hasViewed) return;
  setHasViewed(true);
  console.log('[DEBUG][ChatPost] handleView called for post', localPost._id);
  if (onView) {
    try {
      const updatedPost = await onView(localPost._id);
      console.log('[DEBUG][ChatPost] onView returned:', updatedPost);
      if (updatedPost && typeof updatedPost.views === 'number') {
        setLocalPost(prev => ({ ...prev, views: updatedPost.views }));
        console.log('[DEBUG][ChatPost] localPost.views updated to', updatedPost.views);
      } else if (typeof post.views === 'number' && post.views !== localPost.views) {
        // If parent updated the prop but didn't return updatedPost, sync it
        setLocalPost(prev => ({ ...prev, views: post.views }));
        console.log('[DEBUG][ChatPost] localPost.views synced from prop', post.views);
      }
    } catch (err) {
      setHasViewed(false); // allow retry if needed
      console.error('[DEBUG][ChatPost] handleView error:', err);
    }
  }
};

  // Use the new post view tracking hook
  const { attachObserver } = usePostViewTracking(post, handleView, {
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

  // Use hook-based comment submit (no optimistic update)
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoadingComment(true);
    setError(null);
    try {
      // Use hook's handleCommentSubmit: (e, comment, setComment, loadingComment, setLoadingComment, setError, onComment)
      await commentHook.handleCommentSubmit(e, comment, setComment, loadingComment, setLoadingComment, setError, onComment);
    } catch (error) {
      setError('Failed to post comment. Please try again.');
      console.error('[DEBUG] handleCommentSubmit: Error posting comment', error);
    } finally {
      setLoadingComment(false);
    }
  };

  // Use hook-based reply submit (no optimistic update)
  const handleReply = async (postId, replyText, commentId) => {
    setError(null);
    setActiveReply(null);
    try {
      // Use hook's handleReplySubmit: (postId, replyText, commentId, setError, onReply)
      await replyHook.handleReplySubmit(postId, replyText, commentId, setError, onReply);
    } catch (error) {
      setError('Failed to post reply. Please try again.');
      console.error('[DEBUG] handleReply: Error posting reply', error);
    }
  };

  const handleLike = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);

    const newLiked = !liked;

    // Optimistically update likes (as array of user IDs)
    setLocalPost(prev => {
      const prevLikes = extractUserIdsFromLikes(prev.likes);
      return {
        ...prev,
        likes: newLiked 
          ? [...prevLikes, String(currentUserId)]
          : prevLikes.filter(id => String(id) !== String(currentUserId))
      };
    });

    // Optimistically update likers list if loaded
    if (likesUsers.length > 0) {
      setLikesUsers(prev => newLiked
        ? [...prev, { _id: currentUserId, username: currentUsername, verified: currentUserVerified }]
        : prev.filter(u => String(u._id) !== String(currentUserId))
      );
    }

    try {
      // Call backend to like/unlike
      const response = await onLike?.(localPost._id, newLiked);
      // If backend returns updated post, merge it into localPost
      if (response && response.post) {
        // Normalize likes from backend response
        const backendLikes = extractUserIdsFromLikes(response.post.likes);
        setLocalPost(prev => ({ ...prev, ...response.post, likes: backendLikes }));
      }
    } catch (error) {
      // On error, revert optimistic update
      setLocalPost(prev => {
        const prevLikes = extractUserIdsFromLikes(prev.likes);
        return {
          ...prev,
          likes: liked
            ? [...prevLikes, String(currentUserId)]
            : prevLikes.filter(id => String(id) !== String(currentUserId))
        };
      });
      setError('Failed to update like. Please try again.');
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

  // Delegate delete confirmation to parent (Community.jsx)
  const handleDeletePost = () => {
    setShowPostMenu(false);
    if (onDelete) onDelete(localPost._id);
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

  // Log post author profile image only on mount
  useEffect(() => {
    console.log('Post author:', post.author);
    console.log('Post author profileImage:', post.author?.profile?.profileImage);
  }, []);

  // Show spinner if loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] py-12">
        <FaSpinner className="animate-spin text-3xl text-gray-400 mb-4" />
        <span className="text-lg text-gray-600 dark:text-gray-300 font-medium">Loading posts...</span>
      </div>
    );
  }

  // Add loading spinner if post is not loaded
  if (!post || !post._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] w-full py-10">
        <FaSpinner className="animate-spin text-3xl text-blue-500 mb-3" />
        <span className="text-lg text-gray-700 dark:text-gray-200 font-semibold">Loading posts...</span>
      </div>
    );
  }

  // Patch VideoUsernameOverlay and VideoHeaderAboveMedia to always use handleDeletePost from ChatPost
  // (If they receive handleDeletePost as a prop, it will always be the correct one)

  return (
    <>
      {/* No internal delete modal; confirmation handled by parent */}
      {/* Profile Image Zoom Modal */}
      {zoomProfile && zoomProfile.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity">
          <div className="relative w-full flex flex-col items-center">
            <img
              src={zoomProfile.profileImage}
              alt="Profile Zoom"
              className="shadow-lg border-4 border-white"
              style={{
                background: '#fff',
                width: 'min(90vw, 90vh)',
                height: 'min(90vw, 90vh)',
                maxWidth: '90vw',
                maxHeight: '90vh',
                aspectRatio: '1 / 1',
                display: 'block',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
            <div className="mt-2 flex items-center gap-2 text-white font-semibold text-lg text-center truncate max-w-xs">
              <span className="font-bold">{zoomProfile.username}</span>
              <button
                className="text-white text-2xl font-bold bg-black bg-opacity-40 rounded-full p-1 hover:bg-opacity-70 transition-colors ml-2"
                onClick={() => setZoomProfile(null)}
                aria-label="Close profile image zoom"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

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
    className={`mb-0 transition-all duration-300 ease-out ${scrollable ? 'overflow-y-auto max-h-[80vh]' : ''}`}
    onTouchStart={handleDoubleTap}
    onDoubleClick={handleDoubleTap}
    style={{ background: 'none', border: 'none', boxShadow: 'none', borderRadius: 0, touchAction: 'pan-y', margin: 0, marginLeft: 0, padding: 0, paddingLeft: 0 }}
  >
        {/* Always render VideoUsernameOverlay for videos, and header for images */}
        {post.video ? (
          <>
            <hr className="border-gray-200/50 dark:border-gray-700/50" />
            <VideoUsernameOverlay
              post={post}
              setZoomProfile={setZoomProfile}
              onEditPost={handleEditPost}
              onDeletePost={handleDeletePost}
              canEditDelete={canEditDelete}
              canDeleteAsPostOwner={canDeleteAsPostOwner}
            />
          </>
        ) : post.image ? (
          <>
            <hr className="border-gray-200/50 dark:border-gray-700/50" />
            <VideoHeaderAboveMedia
              post={post}
              setZoomProfile={setZoomProfile}
              handleEditPost={handleEditPost}
              handleDeletePost={handleDeletePost}
              canEditDelete={canEditDelete}
              canDeleteAsPostOwner={canDeleteAsPostOwner}
              showPostMenu={showPostMenu}
              setShowPostMenu={setShowPostMenu}
              localPost={localPost}
              className="mt-0 pt-0" // remove top margin and padding for username row
            />
          </>
        ) : null}



        {/* Only render MediaDisplay for images, not for videos */}
        {post.image && !post.video && (
          <>
            {/* Enforce strict media sizing and overflow for all images in media-container */}
            <style>{`
              .media-container img {
                width: 100vw !important;
                max-width: 100vw !important;
                min-width: 100vw !important;
                max-height: 60vh !important;
                object-fit: cover !important;
                display: block !important;
                overflow: hidden !important;
                border-radius: 0 !important;
                background: var(--post-bg, #fff) !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .media-container {
                overflow: hidden !important;
                width: 100vw !important;
                max-width: 100vw !important;
                min-width: 100vw !important;
                margin: 0 !important;
                padding: 0 !important;
                background: var(--post-bg, #fff) !important;
                border-radius: 0 !important;
                border: none !important;
                box-shadow: none !important;
                position: relative !important;
              }
              @media (prefers-color-scheme: dark) {
                .media-container,
                .media-container img {
                  background: var(--post-bg-dark, #18181b) !important;
                }
              }
            `}</style>
            <div
              ref={postRef}
              className="media-container w-full flex justify-center items-center overflow-hidden p-0 m-0"
              style={{ marginLeft: 0, marginRight: 0 }}
            >
              <MediaDisplay 
                imageUrl={post.image}
                altText={`${post.author?.username || 'User'}'s post media`}
                className={'w-full h-auto object-contain max-h-[60vh] m-0 p-0'}
              />
            </div>
          </>
        )}

        <div
          className={`$${post.image || post.video ? 'w-full max-w-full p-0' : 'p-6'} backdrop-blur-sm transition-all overflow-x-hidden max-w-full ${
            post.image || post.video ? "rounded-none rounded-b-2xl" : "rounded-2xl"
          } px-3`}
          style={{ maxWidth: "100%" }}
        >
          {/* Views count display removed from here; will be shown only in PostInteractionBar */}
          {!(post.image || post.video) && (
            <div className="flex items-center p-2 gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-opacity flex-shrink-0 overflow-hidden cursor-pointer"
                onClick={() => post.author?.profile?.profileImage && setZoomProfile({ profileImage: post.author.profile.profileImage, username: post.author?.username || post.user })}
                title="View profile picture"
              >
                {post.author?.profile?.profileImage
                  ? (<img
                      src={post.author.profile.profileImage}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover"
                      onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                    />)
                  : (<FaUser className="text-gray-400 dark:text-gray-500 text-sm" />)
                }
              </div>

              <Link 
                to={`/dashboard/community/user/${encodeURIComponent(post.author?.username || post.user)}`}
                className="font-bold text-gray-800 dark:text-white flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[120px] sm:max-w-none"
              >
                <span className="flex items-center">{post.author?.username || post.user}{(post.author?.verified || post.verified === true || post.verified === "blue" || post.verified === "grey") && (<VerifiedBadge />)}</span>
              </Link>
              <span className="mx-2 font-bold text-gray-400 dark:text-gray-500">•</span>
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
                      {renderHashtagsBlue(getFirstLine(localPost.content || ''))}
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
                      {renderHashtagsBlue(localPost.content || '')}
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
          <div className="px-0">
            <PostInteractionBar
              liked={liked}
              likeAnimating={likeAnimating}
              handleLike={handleLike}
              normalizedLikes={normalizedLikes}
              likesUsers={likesUsers}
              setShowLikes={(val) => {
                if (window.innerWidth <= 768) {
                  setShowLikeListModal(val);
                  if (val && post.likes) setLikeListInitial(post.likes);
                } else {
                  setShowLikes(val);
                }
              }}
              showLikes={showLikes}
              setShowComments={setShowComments}
              localPost={{ ...localPost, shares: localPost.shareCount || localPost.shares || 0 }}
              loadingLikes={loadingLikes}
              getPostLikes={getPostLikes}
              setLikesUsers={setLikesUsers}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              currentUserVerified={currentUserVerified}
              onShare={handleShare}
              // Add views prop for display in the interaction bar
              views={localPost.views || 0}
            />
          </div>

          {/* Likes Display */}
          {showLikes && window.innerWidth > 768 && (
            <div className="mt-4 relative w-full max-w-full overflow-x-hidden">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-sm text-red-600 dark:text-red-400">
                  Liked by {normalizedLikes.length} {normalizedLikes.length === 1 ? 'person' : 'people'}
                </div>
                <button
                  className="mobile-touch-target text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-xl font-bold px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-red-900 transition-colors"
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
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {user.profile?.profileImage ? (
                            <img
                              src={user.profile.profileImage}
                              alt={user.username + "'s profile"}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                            />
                          ) : (
                            <FaUser className="text-gray-600 dark:text-gray-400 text-sm" />
                          )}
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
                {displayedComments.map((comment) => (
                  <PostComment
                    key={comment._id}
                    comment={comment}
                    currentUserId={currentUserId}
                    canEditDelete={canEditDelete}
                    canDeleteAsPostOwner={canDeleteAsPostOwner}
                    commentHook={commentHook}
                    replyHook={replyHook}
                    replyMenuRefs={replyMenuRefs} // <-- Pass down
                    activeReply={activeReply}
                    setActiveReply={setActiveReply}
                    localPost={localPost}
                    setZoomProfile={setZoomProfile}
                    renderHighlightedContent={renderHighlightedContent}
                    handleReply={handleReply}
                    ReplyInput={ReplyInput}
                    CommentReplies={CommentReplies}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {showShareModal && (
          <SharePostModal
            postLink={postLink}
            topPeople={topPeople}
            loadingConversations={loadingConversations}
            searchResults={searchResults}
            searching={searching}
            onUserSearch={handleUserSearch}
            searchQuery={searchQuery}
            onSendToPerson={handleSendToPerson}
            onClose={() => setShowShareModal(false)}
          />
        )}

        {/* Like List Modal for mobile */}
        <PostLikeListModal
          open={showLikeListModal}
          onClose={() => setShowLikeListModal(false)}
          postId={post._id}
          getPostLikes={getPostLikes}
          initialLikes={likeListInitial}
          maxLikers={100}
        />
      </div>
    </>
  );
}


