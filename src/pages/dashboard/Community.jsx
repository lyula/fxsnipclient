import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import { incrementPostViews } from "../../utils/api";
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
    const handleScroll = async () => {
      if (!containerRef.current || isLoadingRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';

      // Update scroll direction and tabs visibility
      setScrollDirection(currentScrollDirection);
      setLastScrollTop(scrollTop);

      // Show tabs at topmost content or immediately on any upward scroll
      if (scrollTop <= 10 || currentScrollDirection === 'up') {
        setShowTabs(true);
      } else if (currentScrollDirection === 'down' && scrollTop > 10) {
        setShowTabs(false);
      }

      // Track upward scroll distance for "Load New Posts" button
      if (currentScrollDirection === 'up') {
        setScrollUpDistance(prev => {
          const newDistance = prev + Math.abs(scrollTop - lastScrollTop);
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

      // Infinite scroll logic
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
  }, [loadMorePosts, hasMore, cyclingInfo]);

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
        updatePost(postId, data);
        return data;
      } else {
        console.error("Failed to add comment");
        return null;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  };

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
        updatePost(postId, data);
        return data;
      } else {
        console.error("Failed to add reply");
        return null;
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      return null;
    }
  };

  const handleLike = async (postId) => {
    return;
  };

  const handleView = async (postId) => {
    if (!postId) return;

    const viewedPosts = JSON.parse(localStorage.getItem("viewedPosts") || "[]");
    if (!viewedPosts.includes(postId)) {
      viewedPosts.push(postId);
      localStorage.setItem("viewedPosts", JSON.stringify(viewedPosts));

      const post = communityPosts.find(p => p._id === postId);
      if (post) {
        updatePost(postId, { ...post, views: (post.views || 0) + 1 });
      }

      try {
        await incrementPostViews(postId);
      } catch (error) {
        console.error("Error incrementing post views:", error);
      }
    }
  };

  const handleDeletePost = async (postId) => {
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
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

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
      
      localStorage.removeItem("viewedPosts");
      
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
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white flex-shrink-0"></div>
            <span className="text-xs sm:text-sm font-medium">Loading fresh content...</span>
          </div>
        </div>
      )}

      <div 
        className={`flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-all duration-200 ${
          showTabs ? "opacity-100 translate-y-0 h-auto py-4" : "opacity-0 -translate-y-full h-0 overflow-hidden pointer-events-none"
        }`}
        style={{ willChange: "transform, opacity, height" }}
      >
        <div className="flex w-full max-w-full overflow-x-auto no-scrollbar px-4">
          <CommunityTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreatePost={() => setShowCreate(true)}
            visible={showTabs}
          />
        </div>
      </div>

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