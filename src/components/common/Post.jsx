import React, { useState, useEffect, useRef } from "react";
import { FaHeart, FaComment, FaEye, FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import VerifiedBadge from "../VerifiedBadge";
import { incrementPostViews } from "../../utils/api";
import MediaDisplay from "../media/MediaDisplay"; // Import MediaDisplay component

export default function Post({ post, onLike, onComment, trackViews = true }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [views, setViews] = useState(post.views || 0);
  const postRef = useRef(null);

  // Intersection Observer for proper view tracking (Instagram/X style)
  useEffect(() => {
    if (!trackViews || !post?._id) return;
    
    const node = postRef.current;
    if (!node) return;

    let hasViewed = false;
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasViewed) {
            // Check if this post has already been viewed by this user in this browser session
            const viewedPosts = JSON.parse(localStorage.getItem("viewedPosts") || "[]");
            
            if (!viewedPosts.includes(post._id)) {
              // Mark as viewed for this browser session
              viewedPosts.push(post._id);
              localStorage.setItem("viewedPosts", JSON.stringify(viewedPosts));
              
              // Optimistic update - increment view count immediately
              setViews(prev => prev + 1);
              
              // Call API in background to increment server-side count
              incrementPostViews(post._id)
                .then((data) => {
                  // Update with actual server count if available
                  if (data && typeof data.views === 'number') {
                    setViews(data.views);
                  }
                })
                .catch((error) => {
                  console.error('Failed to increment post views:', error);
                  // Revert optimistic update on error
                  setViews(prev => prev - 1);
                });
            }
            
            hasViewed = true;
            observer.disconnect();
          }
        });
      },
      { 
        threshold: 0.5, // 50% of post must be visible (Instagram/X style)
        rootMargin: '0px' // No margin around root
      }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [post._id, trackViews]);

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      onComment(post._id, comment);
      setComment("");
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden break-words border rounded-lg p-0 sm:p-4 mb-4 bg-white dark:bg-gray-800 mobile-post-card">
      <div className="flex items-center gap-2 mb-2">
        {/* Clickable user avatar */}
        <Link 
          to={`/dashboard/community/user/${encodeURIComponent(post.author.username)}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <FaUser className="text-sm text-gray-400 dark:text-gray-500" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white hover:underline">
            {post.author.username}
          </span>
        </Link>
        {post.author.verified && <VerifiedBadge />}
      </div>
      {/* Conditionally render content or media */}
      {!(post.image || post.video) && (
        <>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <p className="text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
        </>
      )}
      {(post.image || post.video) && (
        <MediaDisplay 
          imageUrl={post.image} 
          videoUrl={post.video}
          caption={post.content} // Content appears below media
          forceMobileLayout={true} // Ensures video covers full width on mobile
        />
      )}
      <div className="flex items-center gap-4">
        <button
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-red-500"
          onClick={() => onLike(post._id)}
        >
          <FaHeart />
          <span>{post.likes.length}</span>
        </button>
        <button
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-500"
          onClick={() => setShowComments(!showComments)}
        >
          <FaComment />
          <span>{post.comments.length}</span>
        </button>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <FaEye />
          <span>{views}</span>
        </div>
      </div>
      {showComments && (
        <div className="mt-4">
          <div className="mb-2 space-y-2">
            {post.comments.map((comment) => (
              <div key={comment._id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                {/* Clickable comment author avatar */}
                <Link 
                  to={`/dashboard/community/user/${encodeURIComponent(comment.author.username)}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <FaUser className="text-xs text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className="font-bold hover:underline">{comment.author.username}</span>
                </Link>
                <span>: {comment.content}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="border rounded-lg p-2 flex-grow dark:bg-gray-700 dark:text-white dark:border-gray-600 bg-white text-gray-900"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              onClick={handleCommentSubmit}
            >
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}