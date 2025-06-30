import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import { incrementPostViews } from "../../utils/api";
import { useDashboard } from "../../context/dashboard";

// Enhanced Community Component with Infinite Scroll
export default function Community({ user }) {
  const [activeTab, setActiveTab] = useState("forYou");
  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showLoadNewButton, setShowLoadNewButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down');
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollUpDistance, setScrollUpDistance] = useState(0);
  const [buttonHideTimeout, setButtonHideTimeout] = useState(null);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [topScrollAttempts, setTopScrollAttempts] = useState(0);
  const location = useLocation();
  const postRefs = useRef({});
  const containerRef = useRef(null);
  const isLoadingRef = useRef(false);

  const {
    communityPosts,
    cyclingInfo,  // Add this
    fetchCommunityPosts,
    loadMorePosts,
    loadNewerPosts,
    loadingStates,
    addPostOptimistically,
    updatePost,
    deletePost,
    loadFreshContent // New function for loading fresh content
  } = useDashboard();

  // Initial load
  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        const result = await fetchCommunityPosts(false, 0, 'down');
        setCurrentOffset(result?.nextOffset || 20);
        setHasMore(result?.hasMore !== false);
      } catch (error) {
        console.error('Error loading initial posts:', error);
        setHasMore(false);
        // Optionally show an error message to user
      }
    };
    
    loadInitialPosts();
  }, [fetchCommunityPosts]);

  // Scroll to post if postId is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("postId");
    if (postId) {
      setActiveTab("forYou");
      setTimeout(() => {
        if (postRefs.current[postId]) {
          postRefs.current[postId].scrollIntoView({ behavior: "auto", block: "center" });
        }
      }, 300);
    }
  }, [location.search, communityPosts]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = async () => {
      if (isLoadingRef.current || !hasMore) return;
      
      const container = containerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      
      // Detect scroll direction and distance
      const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
      const scrollDistance = Math.abs(scrollTop - lastScrollTop);
      
      setScrollDirection(currentScrollDirection);
      setLastScrollTop(scrollTop);
      
      // Track upward scroll distance for "Load new posts" button
      if (currentScrollDirection === 'up' && scrollDistance > 3) {
        // Only track upward scroll distance when NOT at the very top
        if (scrollTop > 20) {
          setScrollUpDistance(prev => prev + scrollDistance);
        }
        
        // Detect overscroll at the top - user is at top and trying to scroll up
        const isAtVeryTop = scrollTop <= 5;
        const isOverscrollAttempt = isAtVeryTop && lastScrollTop <= 5 && scrollDistance > 5;
        
        // Show button in two scenarios:
        // 1. User is cycling through content and scrolling up significantly
        // 2. User tries to overscroll at the very top
        const shouldShowForCycling = cyclingInfo?.isRepeatingContent && scrollUpDistance > 300;
        const shouldShowForOverscroll = isOverscrollAttempt && !isRefreshing && !isLoadingFresh;
        
        if (shouldShowForCycling || shouldShowForOverscroll) {
          setShowLoadNewButton(true);
          setTopScrollAttempts(prev => prev + 1);
          
          // Clear existing timeout and set new one
          if (buttonHideTimeout) {
            clearTimeout(buttonHideTimeout);
          }
          
          const timeout = setTimeout(() => {
            setShowLoadNewButton(false);
            setScrollUpDistance(0);
            setTopScrollAttempts(0);
          }, 8000); // Hide after 8 seconds of no interaction
          
          setButtonHideTimeout(timeout);
        }
      } else if (currentScrollDirection === 'down') {
        // Reset tracking when scrolling down
        setScrollUpDistance(0);
        setTopScrollAttempts(0);
        
        // Hide button when scrolling down from top
        if (scrollTop > 50 && showLoadNewButton) {
          setShowLoadNewButton(false);
          if (buttonHideTimeout) {
            clearTimeout(buttonHideTimeout);
            setButtonHideTimeout(null);
          }
        }
      }
      
      // Load more when within 500px of bottom
      if (scrollBottom < 500) {
        isLoadingRef.current = true;
        setIsLoadingMore(true);
        
        try {
          const result = await loadMorePosts(currentOffset);
          setCurrentOffset(prev => prev + 20);
        } catch (error) {
          console.error('Error loading more posts:', error);
        } finally {
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
      
      // Load newer content when at top and scrolling up
      if (scrollTop < 100) {
        const scrollUpVelocity = container.dataset.lastScrollTop 
          ? parseInt(container.dataset.lastScrollTop) - scrollTop 
          : 0;
        
        if (scrollUpVelocity > 50 && !isRefreshing) {
          setIsRefreshing(true);
          
          try {
            const result = await loadNewerPosts();
            setCurrentOffset(20);
            setHasMore(true);
          } catch (error) {
            console.error('Error loading newer posts:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
      }
      
      container.dataset.lastScrollTop = scrollTop;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (buttonHideTimeout) {
          clearTimeout(buttonHideTimeout);
        }
      };
    }
  }, [currentOffset, loadMorePosts, lastScrollTop, scrollUpDistance, cyclingInfo, buttonHideTimeout]);

  // Enhanced touch handling for pull-to-refresh (SINGLE DECLARATION)
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = async () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 100;
    const container = containerRef.current;
    
    if (isUpSwipe && container && container.scrollTop < 50) {
      setIsRefreshing(true);
      
      try {
        const result = await loadNewerPosts();
        setCurrentOffset(20);
        setHasMore(true);
      } catch (error) {
        console.error('Error refreshing feed:', error);
        // Optionally show user-friendly error message
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Create a new post with optimistic updates
  const handleNewPost = async (content, image) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticPost = {
      _id: tempId,
      content,
      image,
      author: {
        _id: user._id,
        username: user.username,
        verified: user.verified,
        countryFlag: user.countryFlag
      },
      likes: [],
      comments: [],
      views: 0,
      createdAt: new Date().toISOString(),
      sending: true
    };

    // Add optimistically
    addPostOptimistically(optimisticPost);
    setActiveTab("forYou");
    setShowCreate(false);

    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, image }),
      });
      
      if (res.ok) {
        const newPost = await res.json();
        // Replace optimistic post with real post
        updatePost(tempId, { ...newPost, sending: false });
      } else {
        // Mark as failed
        updatePost(tempId, { ...optimisticPost, sending: false, failed: true });
        console.error("Failed to create post");
      }
    } catch (error) {
      // Mark as failed
      updatePost(tempId, { ...optimisticPost, sending: false, failed: true });
      console.error("Error creating post:", error);
    }
  };

  // Add a comment to a post
  const handleComment = async (postId, commentContent) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentContent }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update cached post
        updatePost(postId, data);
        return data; // Return the updated post
      } else {
        console.error("Failed to add comment");
        return null;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  };

  // Add a reply to a comment
  const handleReply = async (postId, replyContent, commentId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update cached post
        updatePost(postId, data);
        return data; // Return the updated post
      } else {
        console.error("Failed to add reply");
        return null;
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      return null;
    }
  };

  // Like a post (Let ChatPost handle optimistic updates)
  const handleLike = async (postId) => {
    // Don't do optimistic updates here - let ChatPost handle it
    // Just call the API - ChatPost already handles the optimistic updates
    return; // ChatPost handles everything
  };

  // View a post (local state only)
  const handleView = async (postId) => {
    if (!postId) return;

    // Use localStorage to track viewed posts
    const viewedPosts = JSON.parse(localStorage.getItem("viewedPosts") || "[]");
    if (!viewedPosts.includes(postId)) {
      viewedPosts.push(postId);
      localStorage.setItem("viewedPosts", JSON.stringify(viewedPosts));

      // Update view count in cache
      const post = communityPosts.find(p => p._id === postId);
      if (post) {
        updatePost(postId, { ...post, views: (post.views || 0) + 1 });
      }

      // Call API in background
      try {
        await incrementPostViews(postId);
      } catch (error) {
        console.error("Error incrementing post views:", error);
      }
    }
  };

  // Delete a post
  const handleDeletePost = async (postId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        // Remove from cache
        deletePost(postId);
      } else {
        console.error("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  // Load fresh posts when button is clicked
  const handleLoadFreshPosts = async () => {
    setIsLoadingFresh(true);
    setShowLoadNewButton(false);
    setScrollUpDistance(0);
    
    if (buttonHideTimeout) {
      clearTimeout(buttonHideTimeout);
      setButtonHideTimeout(null);
    }
    
    try {
      // Load truly fresh content using the new function
      const result = await loadFreshContent(); // Use the new function from context
      setCurrentOffset(result?.nextOffset || 20);
      setHasMore(true);
      
      // Scroll to top to show fresh content
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } catch (error) {
      console.error('Error loading fresh posts:', error);
    } finally {
      setIsLoadingFresh(false);
    }
  };

  // Show cached data immediately with background refresh indicator
  const showLoading = loadingStates.posts && communityPosts.length === 0;

  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden community-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        height: '100%',
        maxHeight: '100%',
        overflowY: 'hidden',
        overscrollBehavior: 'none'
      }}
    >
      {/* Fresh content indicator */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Loading fresh content...
          </div>
        </div>
      )}

      {/* Tabs Section - Fixed at top */}
      <div className="flex-shrink-0 px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <CommunityTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCreatePost={() => setShowCreate(true)}
        />
      </div>

      {/* Scrollable Posts Section - Takes remaining space */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 bg-gray-50 dark:bg-gray-800 hide-scrollbar community-posts-section"
        style={{ 
          minHeight: 0,
          maxHeight: '100%',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {showCreate && (
          <CreatePostBox
            onPost={handleNewPost}
            onClose={() => setShowCreate(false)}
          />
        )}

        {/* Loading indicator for initial load */}
        {loadingStates.posts && communityPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading posts...
          </div>
        ) : activeTab === "following" ? (
          <UserSearch currentUser={user} />
        ) : communityPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No posts yet. Be the first to share something!
          </div>
        ) : (
          <>
            <ChatList
              posts={communityPosts}
              postRefs={postRefs}
              onReply={handleReply}
              onComment={handleComment}
              onLike={handleLike}
              onView={handleView}
              onDelete={handleDeletePost}
              currentUserId={user?._id}
              currentUsername={user?.username}
              currentUserVerified={user?.verified}
            />
            
            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
              </div>
            )}
            
            {/* Cycling indicator at bottom */}
            {!isLoadingMore && communityPosts.length > 0 && (
              <div className="p-6 text-center">
                {cyclingInfo?.isRepeatingContent ? (
                  <p className="text-blue-400 dark:text-blue-300 text-xs">
                    🔄 Cycling through posts (Round {cyclingInfo.completedCycles + 1})
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    ∞ Scroll for more content ∞
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating "Load New Posts" Button - Near bottom */}
      {showLoadNewButton && !isLoadingFresh && (
        <button
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-full font-medium shadow-lg hover:bg-blue-600 transition-all duration-300 animate-pulse whitespace-nowrap text-xs sm:text-sm sm:px-4 sm:py-2.5 sm:gap-1.5"
          onClick={handleLoadFreshPosts}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
          <span className="font-medium">Load New Posts</span>
        </button>
      )}

      {/* Loading fresh posts indicator - Near bottom */}
      {isLoadingFresh && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg z-50 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white flex-shrink-0"></div>
            <span className="text-xs sm:text-sm font-medium">Loading fresh posts...</span>
          </div>
        </div>
      )}

      {/* Floating Create Post Button */}
      <button
        className="fixed bottom-20 sm:bottom-8 right-8 md:right-24 z-50 flex items-center gap-2 px-5 py-3 bg-[#a99d6b] text-white rounded-full font-semibold shadow-lg hover:bg-[#c2b77a] transition"
        onClick={() => setShowCreate(true)}
      >
        <FaPlus className="text-lg" />
        <span className="hidden sm:inline">Create Post</span>
      </button>
    </div>
  );
}