import React, { useState, useEffect, useRef, useCallback } from "react";
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
    dedupedCommunityPosts: communityPosts, // Use deduplicated posts
    cyclingInfo,
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

      // Temporary debugging
      console.log('Scroll Debug:', {
        direction: currentScrollDirection,
        distance: scrollDistance,
        upDistance: scrollUpDistance,
        showButton: showLoadNewButton,
        hasMore,
        isLoading: isLoadingMore,
        cycling: cyclingInfo?.isRepeatingContent
      });
      
      // Track upward scroll distance for "Load new posts" button
      if (currentScrollDirection === 'up' && scrollDistance > 5) {
        setScrollUpDistance(prev => {
          const newDistance = prev + scrollDistance;
          
          // Show button when accumulated scroll up distance exceeds threshold
          // Reduced threshold and made conditions less strict
          if (newDistance > 100 && !showLoadNewButton && !isRefreshing && !isLoadingFresh) {
            setShowLoadNewButton(true);
            setTopScrollAttempts(prevAttempts => prevAttempts + 1);
            
            // Clear existing timeout and set new one
            if (buttonHideTimeout) {
              clearTimeout(buttonHideTimeout);
            }
            
            const timeout = setTimeout(() => {
              setShowLoadNewButton(false);
              setScrollUpDistance(0);
              setTopScrollAttempts(0);
            }, 8000); // Reduced timeout for better UX
            
            setButtonHideTimeout(timeout);
          }
          
          return newDistance;
        });
      } else if (currentScrollDirection === 'down') {
        // Reset tracking when scrolling down significantly
        if (scrollDistance > 20) {
          setScrollUpDistance(0);
          setTopScrollAttempts(0);
        }
        
        // Hide button when scrolling down from top
        if (scrollTop > 100 && showLoadNewButton) {
          setShowLoadNewButton(false);
          if (buttonHideTimeout) {
            clearTimeout(buttonHideTimeout);
            setButtonHideTimeout(null);
          }
        }
      }
      
      // Load more when within 500px of bottom OR implement cycling
      if (scrollBottom < 500 && !isLoadingRef.current) {
        isLoadingRef.current = true;
        setIsLoadingMore(true);
        
        // Store current scroll position for restoration
        const currentScrollHeight = container.scrollHeight;
        const currentScrollTop = container.scrollTop;
        
        try {
          const result = await loadMorePosts(currentOffset);
          
          if (result) {
            // Check if we have more posts OR if we should cycle
            if (result.hasMore === true) {
              setHasMore(true);
            } else if (!result.hasMore && cyclingInfo?.totalPostsInCycle > 0) {
              // Implement cycling: restart from beginning
              console.log('End of posts reached, cycling back to start...');
              setHasMore(true); // Keep loading enabled for cycling
              setCurrentOffset(0); // Reset offset to start cycling
              
              // Load posts from the beginning to implement cycling
              const cyclingResult = await loadMorePosts(0);
              if (cyclingResult?.posts) {
                setCurrentOffset(cyclingResult.posts.length);
              }
            } else {
              setHasMore(false);
            }
            
            if (result.posts && result.posts.length > 0) {
              // Update offset based on actual new posts added
              setCurrentOffset(prev => prev + result.posts.length);
              
              // Use requestAnimationFrame to ensure DOM has updated before adjusting scroll
              requestAnimationFrame(() => {
                if (container && container.scrollHeight > currentScrollHeight) {
                  container.scrollTop = currentScrollTop;
                }
              });
            }
          } else {
            // No response - stop loading
            setHasMore(false);
          }
        } catch (error) {
          console.error('Error loading more posts:', error);
          // Don't set hasMore to false on network errors - allow retry
        } finally {
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
      
      // Load newer content when at top and scrolling up
      // if (scrollTop < 100) {
      //   const scrollUpVelocity = container.dataset.lastScrollTop 
      //     ? parseInt(container.dataset.lastScrollTop) - scrollTop 
      //     : 0;
      //   
      //   if (scrollUpVelocity > 50 && !isRefreshing) {
      //     setIsRefreshing(true);
      //     
      //     try {
      //       const result = await loadNewerPosts();
      //       setCurrentOffset(20);
      //       setHasMore(true);
      //     } catch (error) {
      //       console.error('Error loading newer posts:', error);
      //     } finally {
      //       setIsRefreshing(false);
      //     }
      //   }
      // }
      
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
  }, [loadMorePosts, hasMore, cyclingInfo]); // Remove frequently changing dependencies

  // Enhanced touch handling for pull-to-refresh (SINGLE DECLARATION)
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = async () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchEnd - touchStart; // Fixed: should be touchEnd - touchStart for down swipe
    const isDownSwipe = distance > 100; // This is actually a downward swipe (pull down)
    const container = containerRef.current;
    
    // Pull down to refresh when at the top
    if (isDownSwipe && container && container.scrollTop < 50) {
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

3  // Enhanced handleNewPost with proper optimistic updates
  const handleNewPost = async (content, image, video) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticPost = {
      _id: tempId,
      content,
      image,
      video,
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
      sending: true,
      isOptimistic: true
    };

    // Add optimistically first
    addPostOptimistically(optimisticPost);
    setActiveTab("forYou");
    setShowCreate(false);

    // Scroll to top to show the new post
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, image, video }),
      });
      
      if (res.ok) {
        const newPost = await res.json();
        // Replace optimistic post with real post
        updatePost(tempId, { ...newPost, sending: false, isOptimistic: false });
        console.log('Post created successfully:', newPost);
      } else {
        const errorData = await res.json();
        console.error("Failed to create post:", errorData);
        // Mark as failed but keep visible with retry option
        updatePost(tempId, { 
          ...optimisticPost, 
          sending: false, 
          failed: true, 
          error: errorData.message || "Failed to post" 
        });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      // Mark as failed but keep visible with retry option
      updatePost(tempId, { 
        ...optimisticPost, 
        sending: false, 
        failed: true, 
        error: "Network error. Check your connection." 
      });
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

  // Enhanced handleDeletePost with immediate optimistic removal
  const handleDeletePost = async (postId) => {
    // Immediately remove from UI (optimistic delete)
    deletePost(postId);
    
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!res.ok) {
        console.error("Failed to delete post on server");
        // Could re-add the post here if you want to handle failure
        // But for UX, we keep it deleted from UI
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      // Could re-add the post here if you want to handle failure
    }
  };

  // Enhanced fresh content loading with actual database queries
  const handleLoadFreshPosts = async () => {
    setIsLoadingFresh(true);
    setShowLoadNewButton(false);
    setScrollUpDistance(0);
    
    if (buttonHideTimeout) {
      clearTimeout(buttonHideTimeout);
      setButtonHideTimeout(null);
    }
    
    try {
      // Force a completely fresh database query
      const result = await loadFreshContent();
      setCurrentOffset(result?.nextOffset || 20);
      setHasMore(true);
      
      // Reset view tracking for fresh content
      localStorage.removeItem("viewedPosts");
      
      // Scroll to top to show fresh content
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      
      console.log('Fresh content loaded:', result?.posts?.length || 0, 'posts');
    } catch (error) {
      console.error('Error loading fresh posts:', error);
    } finally {
      setIsLoadingFresh(false);
    }
  };

  // Helper function to preserve scroll position during content updates
  const preserveScrollPosition = useCallback((callback) => {
    const container = containerRef.current;
    if (!container) return callback();
    
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    
    callback();
    
    // Use requestAnimationFrame to ensure DOM updates are complete
    requestAnimationFrame(() => {
      if (container.scrollHeight !== scrollHeight) {
        container.scrollTop = scrollTop;
      }
    });
  }, []);

  // Show cached data immediately with background refresh indicator
  const showLoading = loadingStates.posts && communityPosts.length === 0;

  // Scroll position restoration effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Store scroll position when posts change
    const currentScrollTop = container.scrollTop;
    
    // Restore scroll position after a short delay to allow for rendering
    const timeoutId = setTimeout(() => {
      if (container && currentScrollTop > 0) {
        container.scrollTop = currentScrollTop;
      }
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [communityPosts.length]); // Only trigger when the number of posts changes

  return (
    <div 
      className="w-full h-full flex flex-col overflow-x-hidden overflow-y-hidden community-container"
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
      {/* Fresh content indicator - Improved mobile styling */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white flex-shrink-0"></div>
            <span className="text-xs sm:text-sm font-medium">Loading fresh content...</span>
          </div>
        </div>
      )}

      {/* Tabs Section - Keep padding */}
      <div className="flex-shrink-0 px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex w-full max-w-full overflow-x-auto no-scrollbar">
          <CommunityTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreatePost={() => setShowCreate(true)}
          />
        </div>
      </div>

      {/* Posts Section - Remove horizontal padding */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 bg-gray-50 dark:bg-gray-800 hide-scrollbar community-posts-section"
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
            <div className="w-full max-w-full overflow-x-hidden px-0 sm:max-w-2xl sm:mx-auto sm:px-4">
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
            </div>
            
            {/* Loading more indicator - Always show when loading */}
            {isLoadingMore && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
              </div>
            )}
            
            {/* Show appropriate message when not loading */}
            {!isLoadingMore && communityPosts.length > 0 && (
              <div className="p-6 text-center">
                {isLoadingMore ? (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    Loading more content...
                  </p>
                ) : cyclingInfo?.isRepeatingContent ? (
                  <p className="text-blue-400 dark:text-blue-300 text-xs">
                    🔄 Cycling through posts (Round {cyclingInfo.completedCycles + 1})
                  </p>
                ) : hasMore ? (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    ∞ Scroll for more content ∞
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    🔄 Scroll more to see posts again
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating "Load New Posts" Button - Improved mobile styling */}
      {showLoadNewButton && !isLoadingFresh && (
        <button
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-blue-500 text-white rounded-full font-medium shadow-lg hover:bg-blue-600 transition-all duration-300 animate-pulse whitespace-nowrap text-xs sm:text-sm"
          onClick={handleLoadFreshPosts}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
          <span className="font-medium">Load New Posts</span>
        </button>
      )}

      {/* Loading fresh posts indicator - Improved mobile styling */}
      {isLoadingFresh && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white flex-shrink-0"></div>
            <span className="text-xs sm:text-sm font-medium">Loading fresh posts...</span>
          </div>
        </div>
      )}

      {/* Floating Create Post Button */}
      <button
        className="fixed bottom-20 sm:bottom-8 right-8 md:right-24 z-50 flex items-center gap-2 px-5 py-3 bg-[#a99d6b] text-white rounded-full font-semibold shadow-lg hover:bg-[#c2b77a] transition max-w-[95vw] truncate"
        onClick={() => setShowCreate(true)}
      >
        <FaPlus className="text-lg" />
        <span className="hidden sm:inline">Create Post</span>
      </button>
    </div>
  );
}