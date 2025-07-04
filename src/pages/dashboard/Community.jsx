import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import FollowingFeed from "./community/FollowingFeed";
import { useDashboard } from "../../context/dashboard";

export default function Community({ user }) {
  const [activeTab, setActiveTab] = useState("forYou");
  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [horizontalTouchStart, setHorizontalTouchStart] = useState(0);
  const [horizontalTouchEnd, setHorizontalTouchEnd] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showLoadNewButton, setShowLoadNewButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down');
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollUpDistance, setScrollUpDistance] = useState(0);
  const [buttonHideTimeout, setButtonHideTimeout] = useState(null);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [topScrollAttempts, setTopScrollAttempts] = useState(0);

  // Following tab specific states
  const [followingShowLoadNewButton, setFollowingShowLoadNewButton] = useState(false);
  const [followingScrollUpDistance, setFollowingScrollUpDistance] = useState(0);
  const [followingButtonHideTimeout, setFollowingButtonHideTimeout] = useState(null);
  const [followingIsLoadingFresh, setFollowingIsLoadingFresh] = useState(false);

  const location = useLocation();
  const postRefs = useRef({});
  const containerRef = useRef(null);
  const followingContainerRef = useRef(null);
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
    loadFreshContent,
    followingPosts,
    loadNewerFollowingPosts,
    loadFreshFollowingContent
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

  // Load saved tab from localStorage on component mount (enhanced persistence)
  useEffect(() => {
    const savedTab = localStorage.getItem('communityActiveTab');
    if (savedTab && (savedTab === 'forYou' || savedTab === 'following')) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save tab changes to localStorage (enhanced persistence)
  useEffect(() => {
    localStorage.setItem('communityActiveTab', activeTab);
  }, [activeTab]);

  // Enhanced tab-specific container reference
  const getCurrentContainer = useCallback(() => {
    return activeTab === 'following' ? followingContainerRef.current : containerRef.current;
  }, [activeTab]);

  // Enhanced swipe handlers with better tab switching and pull-to-refresh
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
    setHorizontalTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
    setHorizontalTouchEnd(e.targetTouches[0].clientX);
    
    const currentHorizontalDistance = Math.abs(e.targetTouches[0].clientX - horizontalTouchStart);
    const currentVerticalDistance = Math.abs(e.targetTouches[0].clientY - touchStart);
    
    // Prevent default for horizontal swipes
    if (currentHorizontalDistance > 5 && currentHorizontalDistance >= currentVerticalDistance) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async (e) => {
    if (!touchStart || !touchEnd || !horizontalTouchStart || !horizontalTouchEnd) return;
    
    const verticalDistance = touchEnd - touchStart;
    const horizontalDistance = horizontalTouchStart - horizontalTouchEnd;
    
    const minHorizontalDistance = 10;
    const minVerticalDistance = 50;
    
    const absHorizontal = Math.abs(horizontalDistance);
    const absVertical = Math.abs(verticalDistance);
    
    const isHorizontalSwipe = absHorizontal >= minHorizontalDistance && (absHorizontal > absVertical || absVertical < 20);
    const isVerticalSwipe = absVertical >= minVerticalDistance && absVertical > absHorizontal;
    
    // Enhanced horizontal swipe for tab switching
    if (isHorizontalSwipe) {
      e.preventDefault();
      
      if (horizontalDistance > 0 && activeTab === "forYou") {
        setActiveTab("following");
      } else if (horizontalDistance < 0 && activeTab === "following") {
        setActiveTab("forYou");
      }
    }
    // Enhanced vertical swipe for pull-to-refresh (tab-specific)
    else if (isVerticalSwipe) {
      const isPullToRefresh = verticalDistance > 100;
      const container = getCurrentContainer();
      
      if (isPullToRefresh && container && container.scrollTop < 50) {
        if (activeTab === 'following') {
          setIsRefreshing(true);
          try {
            await loadNewerFollowingPosts();
          } catch (error) {
            console.error('Error refreshing following feed:', error);
          } finally {
            setIsRefreshing(false);
          }
        } else {
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
      }
    }
    
    // Reset touch states
    setTouchStart(0);
    setTouchEnd(0);
    setHorizontalTouchStart(0);
    setHorizontalTouchEnd(0);
  };

  // Enhanced scroll handler for following tab
  const handleFollowingScroll = useCallback(() => {
    const container = followingContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollDelta = Math.abs(scrollTop - lastScrollTop);
    const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';

    if (scrollDelta > 2) {
      setScrollDirection(currentScrollDirection);
      setLastScrollTop(scrollTop);

      // Tab visibility logic
      if (scrollTop <= 20) {
        setShowTabs(true);
      } else if (currentScrollDirection === 'up' && scrollDelta > 5) {
        setShowTabs(true);
      } else if (currentScrollDirection === 'down' && scrollTop > 50 && scrollDelta > 10) {
        setShowTabs(false);
      }
    }

    // Track upward scroll for "Load New Posts" button (following-specific)
    if (currentScrollDirection === 'up') {
      setFollowingScrollUpDistance(prev => {
        const newDistance = prev + scrollDelta;
        if (newDistance > 100 && !followingShowLoadNewButton && !isRefreshing && !followingIsLoadingFresh) {
          setFollowingShowLoadNewButton(true);
          if (followingButtonHideTimeout) {
            clearTimeout(followingButtonHideTimeout);
          }
          const timeout = setTimeout(() => {
            setFollowingShowLoadNewButton(false);
            setFollowingScrollUpDistance(0);
          }, 8000);
          setFollowingButtonHideTimeout(timeout);
        }
        return newDistance;
      });
    } else if (currentScrollDirection === 'down') {
      if (scrollTop > 100 && followingShowLoadNewButton) {
        setFollowingShowLoadNewButton(false);
        if (followingButtonHideTimeout) {
          clearTimeout(followingButtonHideTimeout);
          setFollowingButtonHideTimeout(null);
        }
      }
      setFollowingScrollUpDistance(0);
    }
  }, [lastScrollTop, followingShowLoadNewButton, isRefreshing, followingIsLoadingFresh, followingButtonHideTimeout]);

  // Load fresh following posts handler
  const handleLoadFreshFollowingPosts = async () => {
    setFollowingIsLoadingFresh(true);
    setFollowingShowLoadNewButton(false);
    setFollowingScrollUpDistance(0);
    
    if (followingButtonHideTimeout) {
      clearTimeout(followingButtonHideTimeout);
      setFollowingButtonHideTimeout(null);
    }
    
    try {
      await loadFreshFollowingContent();
      
      if (followingContainerRef.current) {
        followingContainerRef.current.scrollTop = 0;
      }
      
      console.log('Fresh following content loaded');
    } catch (error) {
      console.error('Error loading fresh following posts:', error);
    } finally {
      setFollowingIsLoadingFresh(false);
    }
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
    const postId = params.get('postId');
    const commentId = params.get('commentId'); 
    const replyId = params.get('replyId');
    
    if (postId) {
      // Scroll to specific post and highlight it
      // If commentId exists, scroll to that comment
      // If replyId exists, scroll to that reply
      handleDeepLink(postId, commentId, replyId);
    }
  }, [location.search]);

  const handleDeepLink = async (postId, commentId, replyId) => {
    try {
      // Find or load the specific post
      let targetPost = posts.find(p => p._id === postId);
      
      if (!targetPost) {
        // If post not in current feed, fetch it
        const response = await fetch(`/api/posts/${postId}`);
        const postData = await response.json();
        targetPost = postData;
      }
      
      // Ensure comments are expanded for this post
      setShowComments(true);
      
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        let targetElement;
        
        if (replyId) {
          targetElement = document.querySelector(`[data-reply-id="${replyId}"]`);
        } else if (commentId) {
          targetElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        } else {
          targetElement = document.querySelector(`[data-post-id="${postId}"]`);
        }
        
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          targetElement.classList.add('highlight-mention');
          setTimeout(() => {
            targetElement.classList.remove('highlight-mention');
          }, 3000);
        }
      }, 500);
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  // Enhanced scroll handler for for-you tab (existing logic)
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = async () => {
      if (!containerRef.current || isLoadingRef.current || ticking || activeTab !== 'forYou') return;
      
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

        if (scrollDelta > 2) {
          setScrollDirection(currentScrollDirection);
          setLastScrollTop(scrollTop);

          if (scrollTop <= 20) {
            setShowTabs(true);
          } else if (currentScrollDirection === 'up' && scrollDelta > 5) {
            setShowTabs(true);
          } else if (currentScrollDirection === 'down' && scrollTop > 50 && scrollDelta > 10) {
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
        
        ticking = false;
      });
    };

    const container = containerRef.current;
    if (container && activeTab === 'forYou') {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (buttonHideTimeout) {
          clearTimeout(buttonHideTimeout);
        }
      };
    }
  }, [loadMorePosts, hasMore, cyclingInfo, lastScrollTop, showLoadNewButton, isRefreshing, isLoadingFresh, buttonHideTimeout, activeTab]);

  // Enhanced following tab scroll handler
  useEffect(() => {
    const container = followingContainerRef.current;
    if (container && activeTab === 'following') {
      container.addEventListener('scroll', handleFollowingScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleFollowingScroll);
        if (followingButtonHideTimeout) {
          clearTimeout(followingButtonHideTimeout);
        }
      };
    }
  }, [activeTab, handleFollowingScroll, followingButtonHideTimeout]);

  // Rest of your existing handlers (handleNewPost, handleComment, handleReply, etc.)
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
        
        updatePost(postId, { 
          ...updatedPost, 
          _id: postId,
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
        
        updatePost(postId, { 
          ...updatedPost, 
          _id: postId,
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

  const handleLike = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    
    // Find the post in either collection
    const currentPost = communityPosts.find(p => p._id === postId) || followingPosts.find(p => p._id === postId);
    if (!currentPost || !user) return;
    
    const currentUserId = user._id || user.id;
    const isCurrentlyLiked = currentPost.likes?.some(likeId => String(likeId) === String(currentUserId));
    
    // Create optimistic update
    const optimisticUpdate = {
      ...currentPost,
      likes: isCurrentlyLiked 
        ? (currentPost.likes || []).filter(likeId => String(likeId) !== String(currentUserId))
        : [...(currentPost.likes || []), currentUserId]
    };
    
    // Apply optimistic update to both collections
    updatePost(postId, optimisticUpdate);

    try {
      console.log('Toggling like for post:', originalPostId, 'Currently liked:', isCurrentlyLiked);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      
      if (res.ok) {
        const updatedPost = await res.json();
        console.log('Like toggled successfully:', updatedPost);
        
        // Update with server response, preserving display ID
        const finalUpdate = { 
          ...updatedPost, 
          _id: postId, // Keep the display ID for React rendering
          _originalId: originalPostId 
        };
        
        updatePost(postId, finalUpdate);
      } else {
        const errorText = await res.text();
        console.error("Failed to toggle like:", res.status, errorText);
        // Revert optimistic update on error
        updatePost(postId, currentPost);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      updatePost(postId, currentPost);
    }
  }, [API_BASE, communityPosts, followingPosts, updatePost, user]);

  const handleView = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    if (!originalPostId) return;

    const viewKey = `viewed_post_${originalPostId}`;
    if (sessionStorage.getItem(viewKey)) {
      return; // Already viewed in this session
    }

    // Mark as viewed in this session
    sessionStorage.setItem(viewKey, 'true');

    // Find the post in either collection
    const post = communityPosts.find(p => p._id === postId) || followingPosts.find(p => p._id === postId);
    if (post) {
      const updatedPost = { ...post, views: (post.views || 0) + 1 };
      updatePost(postId, updatedPost);
    }

    try {
      console.log('Tracking view for post:', originalPostId);
      
      const res = await fetch(`${API_BASE}/posts/${originalPostId}/view`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
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
  }, [communityPosts, followingPosts, updatePost, API_BASE]);

  const handleDeletePost = useCallback(async (postId) => {
    const originalPostId = getOriginalPostId(postId);
    
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
    const container = getCurrentContainer();
    if (!container) return callback();
    
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    
    callback();
    
    requestAnimationFrame(() => {
      if (container.scrollHeight !== scrollHeight) {
        container.scrollTop = scrollTop;
      }
    });
  }, [getCurrentContainer]);

  const showLoading = loadingStates.posts && communityPosts.length === 0;

  useEffect(() => {
    const container = getCurrentContainer();
    if (!container) return;
    
    const currentScrollTop = container.scrollTop;
    
    const timeoutId = setTimeout(() => {
      if (container && currentScrollTop > 0) {
        container.scrollTop = currentScrollTop;
      }
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [communityPosts.length, followingPosts.length, getCurrentContainer]);

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
      {/* Enhanced tabs container */}
      <div 
        className={`flex-shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-20 transition-all duration-300 ${
          showTabs ? "opacity-100 translate-y-0 h-auto py-2" : "opacity-0 -translate-y-full h-0 overflow-hidden pointer-events-none"
        }`}
        style={{ willChange: "transform, opacity, height" }}
      >
        <div className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 md:px-6 lg:max-w-4xl xl:max-w-5xl lg:mx-auto">
          <CommunityTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreatePost={() => setShowCreate(true)}
            visible={showTabs}
          />
        </div>
      </div>

      {/* Enhanced posts container */}
      <div 
        ref={activeTab === 'forYou' ? containerRef : followingContainerRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 dark:from-gray-800 dark:via-gray-900/90 dark:to-slate-900 hide-scrollbar ${
          activeTab === 'following' ? '' : 'py-6'
        }`}
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
          <FollowingFeed 
            user={user}
            onReply={handleReply}
            onComment={handleComment}
            onLike={handleLike}
            onView={handleView}
            onDelete={handleDeletePost}
            containerRef={followingContainerRef}
            onLoadFresh={handleLoadFreshFollowingPosts}
            isLoadingFresh={followingIsLoadingFresh}
          />
        ) : communityPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No posts yet. Be the first to share something!
          </div>
        ) : (
          <>
            <div className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 md:px-6 lg:max-w-4xl xl:max-w-5xl lg:mx-auto">
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

        {/* Enhanced load new posts buttons - ONLY for forYou tab */}
        {activeTab === 'forYou' && showLoadNewButton && !isLoadingFresh && (
          <button
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-blue-500 text-white rounded-full font-medium shadow-lg hover:bg-blue-600 transition-all duration-300 animate-pulse whitespace-nowrap text-xs sm:text-sm"
            onClick={handleLoadFreshPosts}
          >
            Load New Posts
          </button>
        )}
      </div>
      
      {/* Mobile floating create post button */}
      <button
        className="fixed bottom-14 right-6 z-50 sm:hidden flex items-center justify-center w-14 h-14 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
        onClick={() => setShowCreate(true)}
        aria-label="Create new post"
      >
        <FaPlus className="text-xl" />
      </button>
    </div>
  );
}