import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import { useDashboard } from "../../context/dashboard";

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
  const [showTabs, setShowTabs] = useState(true);

  const {
    dedupedCommunityPosts: communityPosts,
    cyclingInfo,
    fetchCommunityPosts,
    loadMorePosts,
    loadNewerPosts,
    loadingStates,
    addPostOptimistically,
    updatePost,
    deletePost,
    loadFreshContent
  } = useDashboard();

  // API base URL
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");

  // Auth headers
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  // Extract original ID helper function
  const getOriginalPostId = (postId) => {
    return postId.includes('_cycle_') ? postId.split('_cycle_')[0] : postId;
  };

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
          // No scrollIntoView needed for simplicity
        }
      }, 300);
    }
  }, [location.search, communityPosts]);

  // Scroll handler for tabs visibility and infinite scroll
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = async () => {
      if (!containerRef.current || isLoadingRef.current || ticking) return;
      
      ticking = true;
      
      requestAnimationFrame(async () => {
        if (!containerRef.current) {
          ticking = false;
          return;
        }
        
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;
        const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
        const scrollDelta = Math.abs(scrollTop - lastScrollTop);

        // Only update if there's meaningful scroll movement
        if (scrollDelta > 2) {
          setScrollDirection(currentScrollDirection);
          setLastScrollTop(scrollTop);

          // Improved tab visibility logic - more responsive to direction changes
          if (scrollTop <= 20) {
            // Always show tabs at the very top
            setShowTabs(true);
          } else if (currentScrollDirection === 'up' && scrollDelta > 5) {
            // Show tabs immediately on any meaningful upward scroll
            setShowTabs(true);
          } else if (currentScrollDirection === 'down' && scrollTop > 50 && scrollDelta > 10) {
            // Hide tabs on downward scroll, but with some threshold
            setShowTabs(false);
          }
        }

        // Track upward scroll distance for "Load New Posts" button
        if (currentScrollDirection === 'up') {
          setScrollUpDistance(prev => {
            const newDistance = prev + scrollDelta;
            if (newDistance > 100 && !showLoadNewButton && !isRefreshing && !isLoadingFresh) {
              setShowLoadNewButton(true);
              setTopScrollAttempts(prevAttempts => prevAttempts + 1);
              if (buttonHideTimeout) {
                clearTimeout(buttonHideTimeout);
              }
              const timeout = setTimeout(() => {
                setShowLoadNewButton(false);
                setScrollUpDistance(0);
                setTopScrollAttempts(0);
              }, 8000);
              setButtonHideTimeout(timeout);
            }
            return newDistance;
          });
        } else if (currentScrollDirection === 'down') {
          if (scrollTop > 100 && showLoadNewButton) {
            setShowLoadNewButton(false);
            if (buttonHideTimeout) {
              clearTimeout(buttonHideTimeout);
              setButtonHideTimeout(null);
            }
          }
          setScrollUpDistance(0);
          setTopScrollAttempts(0);
        }

        // Infinite scroll logic (rest remains the same)
        if (scrollBottom < 500 && hasMore && !isLoadingRef.current) {
          isLoadingRef.current = true;
          setIsLoadingMore(true);
          
          const currentScrollHeight = scrollHeight;
          const currentScrollTop = scrollTop;
          
          try {
            const result = await loadMorePosts(currentOffset);
            
            if (result) {
              if (result.hasMore === true) {
                setHasMore(true);
              } else if (!result.hasMore && cyclingInfo?.totalPostsInCycle > 0) {
                console.log('End of posts reached, cycling back to start...');
                setHasMore(true);
                setCurrentOffset(0);
                const cyclingResult = await loadMorePosts(0);
                if (cyclingResult?.posts) {
                  setCurrentOffset(cyclingResult.posts.length);
                }
              } else {
                setHasMore(false);
              }
              
              if (result.posts && result.posts.length > 0) {
                setCurrentOffset(prev => prev + result.posts.length);
                requestAnimationFrame(() => {
                  if (containerRef.current && containerRef.current.scrollHeight > currentScrollHeight) {
                    containerRef.current.scrollTop = currentScrollTop;
                  }
                });
              }
            } else {
              setHasMore(false);
            }
          } catch (error) {
            console.error('Error loading more posts:', error);
          } finally {
            setIsLoadingMore(false);
            isLoadingRef.current = false;
          }
        }
        
        ticking = false;
      });
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
  }, [loadMorePosts, hasMore, cyclingInfo, lastScrollTop, showLoadNewButton, isRefreshing, isLoadingFresh, buttonHideTimeout]);

  // Touch handling for pull-to-refresh
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = async () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > 100;
    const container = containerRef.current;
    
    if (isDownSwipe && container && container.scrollTop < 50) {
      setIsRefreshing(true);
      try {
        const result = await loadNewerPosts();
        setCurrentOffset(20);
        setHasMore(true);
      } catch (error) {
        console.error('Error refreshing feed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

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

    addPostOptimistically(optimisticPost);
    setActiveTab("forYou");
    setShowCreate(false);

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ content, image, video }),
      });
      
      if (res.ok) {
        const newPost = await res.json();
        updatePost(tempId, { ...newPost, sending: false, isOptimistic: false });
        console.log('Post created successfully:', newPost);
      } else {
        const errorData = await res.json();
        console.error("Failed to create post:", errorData);
        updatePost(tempId, { 
          ...optimisticPost, 
          sending: false, 
          failed: true, 
          error: errorData.message || "Failed to post" 
        });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      updatePost(tempId, { 
        ...optimisticPost, 
        sending: false, 
        failed: true, 
        error: "Network error. Check your connection." 
      });
    }
  };

  // FIXED: Comment handler with proper original post ID extraction
  const handleComment = useCallback(async (postId, commentContent) => {
    const originalPostId = getOriginalPostId(postId);
    
    try {
      console.log('Adding comment to post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/comments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ content: commentContent }),
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        console.log('Comment added successfully:', updatedPost);
        
        // Update with server response, preserving display ID
        updatePost(postId, { 
          ...updatedPost, 
          _id: postId, // Keep the display ID for React rendering
          _originalId: originalPostId 
        });
        return updatedPost;
      } else {
        const errorData = await res.json();
        console.error("Failed to add comment:", errorData);
        return null;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  }, [API_BASE, authHeaders, updatePost]);

  // FIXED: Reply handler with proper original post ID extraction
  const handleReply = useCallback(async (postId, replyContent, commentId) => {
    const originalPostId = getOriginalPostId(postId);
    
    try {
      console.log('Adding reply to comment:', commentId, 'on post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/comments/${commentId}/replies`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ content: replyContent }),
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        console.log('Reply added successfully:', updatedPost);
        
        // Update with server response, preserving display ID
        updatePost(postId, { 
          ...updatedPost, 
          _id: postId, // Keep the display ID for React rendering
          _originalId: originalPostId 
        });
        return updatedPost;
      } else {
        const errorData = await res.json();
        console.error("Failed to add reply:", errorData);
        return null;
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      return null;
    }
  }, [API_BASE, authHeaders, updatePost]);

  // FIXED: Like handler with optimistic updates and proper toggle logic
  const handleLike = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    
    // Get current post to check if it's already liked
    const currentPost = communityPosts.find(p => p._id === postId);
    if (!currentPost || !user) return;
    
    const currentUserId = user._id || user.id;
    const isCurrentlyLiked = currentPost.likes?.some(likeId => String(likeId) === String(currentUserId));
    
    // Optimistic update - toggle the like immediately
    const optimisticUpdate = {
      ...currentPost,
      likes: isCurrentlyLiked 
        ? (currentPost.likes || []).filter(likeId => String(likeId) !== String(currentUserId))
        : [...(currentPost.likes || []), currentUserId]
    };
    
    updatePost(postId, optimisticUpdate);

    try {
      console.log('Toggling like for post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        console.log('Like toggled successfully:', updatedPost);
        
        // Update with server response, preserving display ID
        updatePost(postId, { 
          ...updatedPost, 
          _id: postId, // Keep the display ID for React rendering
          _originalId: originalPostId 
        });
      } else {
        const errorData = await res.json();
        console.error("Failed to toggle like:", errorData);
        // Revert optimistic update on error
        updatePost(postId, currentPost);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      updatePost(postId, currentPost);
    }
  }, [API_BASE, communityPosts, updatePost, user]);

  // FIXED: View handler with proper session tracking and original post ID
  const handleView = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    if (!originalPostId) return;

    // Use session storage to track views per browser session
    const viewKey = `viewed_post_${originalPostId}`;
    if (sessionStorage.getItem(viewKey)) {
      return; // Already viewed in this session
    }

    // Mark as viewed in this session
    sessionStorage.setItem(viewKey, 'true');

    // Optimistic update for immediate UI feedback
    const post = communityPosts.find(p => p._id === postId);
    if (post) {
      updatePost(postId, { ...post, views: (post.views || 0) + 1 });
    }

    try {
      console.log('Tracking view for post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      
      if (res.ok) {
        const result = await res.json();
        console.log('View tracked successfully:', result);
      } else {
        console.error("Failed to track view:", res.status);
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  }, [communityPosts, updatePost, API_BASE]);

  // FIXED: Delete handler with proper original post ID extraction
  const handleDeletePost = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    
    // Optimistic update - remove from UI immediately
    deletePost(postId);
    
    try {
      console.log('Deleting post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      
      if (res.ok) {
        console.log('Post deleted successfully');
      } else {
        console.error("Failed to delete post on server:", res.status);
        // Note: We don't revert the optimistic update here since the post is already gone from UI
        // In a production app, you might want to add error handling to restore the post
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  }, [API_BASE, deletePost]);

  const handleLoadFreshPosts = async () => {
    setIsLoadingFresh(true);
    setShowLoadNewButton(false);
    setScrollUpDistance(0);
    
    if (buttonHideTimeout) {
      clearTimeout(buttonHideTimeout);
      setButtonHideTimeout(null);
    }
    
    try {
      const result = await loadFreshContent();
      setCurrentOffset(result?.nextOffset || 20);
      setHasMore(true);
      
      // Clear view tracking for fresh content
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('viewed_post_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
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

  const preserveScrollPosition = useCallback((callback) => {
    const container = containerRef.current;
    if (!container) return callback();
    
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    
    callback();
    
    requestAnimationFrame(() => {
      if (container.scrollHeight !== scrollHeight) {
        container.scrollTop = scrollTop;
      }
    });
  }, []);

  const showLoading = loadingStates.posts && communityPosts.length === 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const currentScrollTop = container.scrollTop;
    
    const timeoutId = setTimeout(() => {
      if (container && currentScrollTop > 0) {
        container.scrollTop = currentScrollTop;
      }
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [communityPosts.length]);

  return (
    <div 
      className="w-full h-full flex flex-col overflow-x-hidden overflow-y-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800"
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
      {/* Enhanced tabs container with Tailwind glassmorphism */}
      <div 
        className={`flex-shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-20 transition-all duration-300 ${
          showTabs ? "opacity-100 translate-y-0 h-auto py-2" : "opacity-0 -translate-y-full h-0 overflow-hidden pointer-events-none"
        }`}
        style={{ willChange: "transform, opacity, height" }}
      >
        {/* Use same container structure as posts */}
        <div className="w-full max-w-full overflow-x-hidden px-4 sm:max-w-2xl sm:mx-auto">
          <CommunityTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreatePost={() => setShowCreate(true)}
            visible={showTabs}
          />
        </div>
      </div>

      {/* Modern posts container with Tailwind gradients */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden py-6 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 dark:from-gray-800 dark:via-gray-900/90 dark:to-slate-900 hide-scrollbar"
        style={{ 
          minHeight: 0,
          maxHeight: '100%',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          willChange: 'scroll-position'
        }}
      >
        {showCreate && (
          <CreatePostBox
            onPost={handleNewPost}
            onClose={() => setShowCreate(false)}
          />
        )}

        {showLoading ? (
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
            <div className="w-full max-w-full overflow-x-hidden px-4 sm:max-w-2xl sm:mx-auto">
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
            
            {isLoadingMore && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
              </div>
            )}
            
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
      
      {/* Mobile-only floating create post button */}
      <button
        className="fixed bottom-14 right-6 z-50 sm:hidden flex items-center justify-center w-14 h-14 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
        onClick={() => setShowCreate(true)}
        aria-label="Create new post"
      >
        <FaPlus className="text-xl" />
      </button>
      
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

      {isLoadingFresh && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white flex-shrink-0"></div>
            <span className="text-xs sm:text-sm font-medium">Loading fresh posts...</span>
          </div>
        </div>
      )}
    </div>
  );
}