import React, { useState, useEffect, useRef, useCallback } from "react";

// Floating notification component
function FloatingNotification({ message, onClose }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timeout);
  }, [visible]);
  React.useEffect(() => {
    if (!visible) {
      setTimeout(onClose, 400); // allow fade out
    }
  }, [visible, onClose]);
  return (
    <div
      className={`fixed top-6 left-1/2 z-[9999] px-6 py-3 rounded-lg shadow-lg text-white text-base font-semibold transition-all duration-400 pointer-events-none select-none bg-blue-700/90 dark:bg-blue-900/90 transform -translate-x-1/2 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ minWidth: 200, maxWidth: '90vw', textAlign: 'center' }}
    >
      {message}
    </div>
  );
}

// (Floating notification state will be defined inside the component)
import { searchPosts, deletePost as apiDeletePost } from "../../utils/api";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import FollowingFeed from "./community/FollowingFeed";

import { useDashboard } from "../../context/dashboard";
import FloatingPlusButton from "../../components/common/FloatingPlusButton";
import CreatePostBox from "../../pages/dashboard/community/CreatePostBox";

export default function Community({ user }) {
  // Floating notification state (must be inside the component)
  const [floatingNotification, setFloatingNotification] = useState(null);
  // Search state (must be inside the component)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // Tab state
  const [activeTab, setActiveTab] = useState("forYou");

  // Handle search submit from CommunityTabs
  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearchLoading(true);
    console.log('[Community] Search triggered:', query);
    try {
      const result = await searchPosts(query, 30, 0);
      console.log('[Community] Search API result:', result);
      setSearchResults(result.posts || []);
    } catch (e) {
      console.error('[Community] Search API error:', e);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  // Handle search cancel/clear
  const handleCancelSearch = () => {
    console.log('[Community] Search cancelled');
    setSearchQuery("");
    setSearchResults(null);
    setSearchLoading(false);
  };
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
  const [rotatedPosts, setRotatedPosts] = useState([]); // NEW: for cycling

 const {
  dedupedCommunityPosts: communityPosts,
  cyclingInfo,
  fetchCommunityPosts,
  loadInitialPosts,
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

  // Add this line in Community.jsx after the useDashboard hook
const showLoading = loadingStates.posts && communityPosts.length === 0;
  // Auth headers
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  // Extract original ID helper function
const getOriginalPostId = (postId) => {
  // Handle temporary posts
  if (postId.startsWith('temp-')) {
    return null; // Temp posts don't have server IDs yet
  }
  
  // Handle cycled posts
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
    
    const minHorizontalDistance = 40;
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

  // Initial load - truly one-time only
  const hasEverLoaded = useRef(false);
  const initializationKey = useRef(Math.random().toString(36));

  useEffect(() => {
    // Use a unique key to prevent duplicate loads even in StrictMode
    const currentKey = initializationKey.current;
    
    if (hasEverLoaded.current) return;
    hasEverLoaded.current = true;

    // Store the key in sessionStorage to prevent duplicates across remounts
    const storageKey = 'community_init_key';
    const storedKey = sessionStorage.getItem(storageKey);
    
    if (storedKey === currentKey) {
      return; // Already initialized with this key
    }
    
    sessionStorage.setItem(storageKey, currentKey);

    const doInitialLoad = async () => {
      try {
        // Small delay to ensure single execution
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const result = await loadInitialPosts();
        setCurrentOffset(result?.nextOffset || 20);
        setHasMore(true); // Always enable infinite scroll for cycling content
      } catch (error) {
        console.error('Error loading initial posts:', error);
        setHasMore(false);
      }
    };
    
    doInitialLoad();
  }, []); // No dependencies, truly one-time

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

  // Enhanced scroll handler for for-you tab (fixed infinite scroll)
// Enhanced scroll handler for for-you tab (improved Load New Posts button logic)
useEffect(() => {
  let ticking = false;
  let scrollTimeout;
  
  const handleScroll = async () => {
    if (!containerRef.current || ticking || activeTab !== 'forYou') return;
    
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

      // Only update UI elements, not scroll position
      if (scrollDelta > 5) {
        setScrollDirection(currentScrollDirection);
        setLastScrollTop(scrollTop);

        if (scrollTop <= 20) {
          setShowTabs(true);
        } else if (currentScrollDirection === 'up' && scrollDelta > 10) {
          setShowTabs(true);
        } else if (currentScrollDirection === 'down' && scrollTop > 50 && scrollDelta > 15) {
          setShowTabs(false);
        }
      }

      // IMPROVED: Show button immediately when user reaches the very top
      if (scrollTop === 0 && !showLoadNewButton && !isLoadingFresh) {
        setShowLoadNewButton(true);
        
        if (buttonHideTimeout) clearTimeout(buttonHideTimeout);
        const timeout = setTimeout(() => {
          setShowLoadNewButton(false);
        }, 15000); // Longer timeout when at top
        setButtonHideTimeout(timeout);
      }

      // IMPROVED: More sensitive upward scroll detection for "Load New Posts" button
      if (currentScrollDirection === 'up' && scrollDelta > 3) {
        setScrollUpDistance(prev => {
          const newDistance = prev + scrollDelta;
          
          // Show load button with much more sensitive conditions:
          // 1. Any upward scroll when near top (within 200px), OR
          // 2. Moderate upward scroll anywhere (30+ pixels total), OR
          // 3. Small upward scroll very close to top (within 100px)
          const shouldShowButton = 
            (scrollTop < 200 && newDistance > 15) ||    // Very sensitive near top
            (scrollTop < 500 && newDistance > 30) ||    // Moderate sensitivity mid-range
            (newDistance > 50);                         // Any significant upward scroll
          
          if (shouldShowButton && !showLoadNewButton && !isLoadingFresh) {
            setShowLoadNewButton(true);
            
            // Auto-hide after 12 seconds of no scrolling
            if (buttonHideTimeout) clearTimeout(buttonHideTimeout);
            const timeout = setTimeout(() => {
              setShowLoadNewButton(false);
              setScrollUpDistance(0);
            }, 12000);
            setButtonHideTimeout(timeout);
          }
        });
      } else if (currentScrollDirection === 'down' && scrollDelta > 10) {
        // Reset scroll distance and hide button when scrolling down significantly
        setScrollUpDistance(0);
        if (showLoadNewButton && scrollTop > 50) {
          setShowLoadNewButton(false);
          if (buttonHideTimeout) {
            clearTimeout(buttonHideTimeout);
            setButtonHideTimeout(null);
          }
        }
      }

      // FIXED: Load more content when user scrolls near bottom
      if (scrollBottom < 500 && hasMore && !isLoadingRef.current && !loadingStates.posts) {
        console.log('Loading more posts... scrollBottom:', scrollBottom, 'hasMore:', hasMore, 'currentOffset:', currentOffset);
        isLoadingRef.current = true;
        setIsLoadingMore(true);
        
        try {
          const result = await loadMorePosts(currentOffset);
          if (result) {
            // Always allow more loading for cycling content
            const newHasMore = result.hasMore !== false && 
                             (result.posts?.length > 0 || result.cyclingInfo?.totalPostsInCycle > 0);
            setHasMore(newHasMore);
            setCurrentOffset(prev => prev + 20);
            console.log('Loaded more posts, new offset:', currentOffset + 20, 'hasMore:', newHasMore);
          }
        } catch (error) {
          console.error('Error loading more posts:', error);
          // Don't stop infinite scroll on error, retry is possible
          setHasMore(true);
        } finally {
          isLoadingRef.current = false;
          setIsLoadingMore(false);
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
      clearTimeout(scrollTimeout);
    };
  }
}, [activeTab, hasMore, currentOffset, lastScrollTop, loadMorePosts, buttonHideTimeout, loadingStates.posts, showLoadNewButton, isLoadingFresh]);

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

  // Pull-to-refresh state for top of feed
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullThreshold = 200; // px to trigger refresh (Instagram-like)
  const minDragToTrack = 40; // px before we even start tracking a pull
  const minDragToShowSpinner = 60; // px before spinner shows (reduced for better visibility)

  // Pull-to-refresh handlers for forYou tab
  const handleFeedTouchStart = (e) => {
    if (activeTab !== 'forYou') return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setTouchStart(e.targetTouches[0].clientY);
      setPullDistance(0);
    } else {
      setTouchStart(0);
      setPullDistance(0);
    }
  };
  const handleFeedTouchMove = (e) => {
    if (activeTab !== 'forYou' || touchStart === 0) return;
    const distance = e.targetTouches[0].clientY - touchStart;
    if (distance > minDragToTrack) {
      e.preventDefault();
      setScrollUpDistance(0); // prevent load new posts button
      setShowLoadNewButton(false);
      setPullDistance(distance > 350 ? 350 : distance); // allow a big drag, but not infinite
    } else {
      setPullDistance(0); // Don't track small drags
    }
  };
  const handleFeedTouchEnd = async (e) => {
    if (activeTab !== 'forYou' || pullDistance === 0) {
      setPullDistance(0);
      return;
    }
    if (pullDistance > pullThreshold) {
      setIsPullRefreshing(true);
      // Don't reset pullDistance immediately - keep it for spinner visibility
      
      // Clear search state and results when refreshing
      if (searchQuery || searchResults) {
        setSearchQuery("");
        setSearchResults(null);
      }
      // Try to fetch new posts
      let result;
      try {
        result = await loadFreshContent({ force: true });
      } catch (err) {
        result = null;
      }
      // If no new posts, rotate the feed
      if (!result || !result.hasNewContent) {
        // Rotate posts: move first post to end
        if (rotatedPosts.length > 1) {
          setRotatedPosts(prev => [...prev.slice(1), prev[0]]);
        }
      } else {
        // If new posts, reset rotation
        setRotatedPosts(communityPosts);
      }
      
      // Reset pullDistance and loading state after delay
      setTimeout(() => {
        setIsPullRefreshing(false);
        setPullDistance(0);
      }, 800);
    } else {
      setPullDistance(0);
    }
  };

  // Whenever communityPosts changes (new posts loaded), reset rotatedPosts with deduplication and valid createdAt
  useEffect(() => {
    // Remove duplicate posts by _id and filter out invalid createdAt
    const seen = new Set();
    const deduped = communityPosts.filter(post => {
      if (!post || !post._id || seen.has(post._id)) return false;
      seen.add(post._id);
      // Only allow posts with valid createdAt
      return post.createdAt && !isNaN(Date.parse(post.createdAt));
    });
    setRotatedPosts(deduped);
  }, [communityPosts]);

  // Add posting and postError state
const [posting, setPosting] = useState(false);
const [postError, setPostError] = useState("");
  // Replace handleNewPost with backend-only logic
const handleNewPost = async (content, image, video) => {
  setPosting(true);
  setPostError("");
  let postCreated = false;
  let newPost = null;
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ content, image, video }),
    });
    if (res.ok) {
      newPost = await res.json();
      await loadFreshContent({ force: true }); // Reload posts from backend
      setActiveTab("forYou");
      setShowCreate(false);
      setPostError("");
      postCreated = true;
      // Always scroll to top after posting
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        // Scroll to the new post if possible
        if (newPost && newPost._id) {
          const el = document.querySelector(`[data-post-id='${newPost._id}']`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-mention');
            setTimeout(() => el.classList.remove('highlight-mention'), 2000);
          }
        }
      }, 200);
    } else {
      const errorData = await res.json();
      setPostError(errorData.message || "Failed to post");
    }
  } catch (error) {
    console.log('[DEBUG] Entered catch block in handleNewPost', { error, postCreated, newPost });
    if (!postCreated) {
      setPostError("Network error. Check your connection.");
    } else {
      // Post was created, so do not show error
      setActiveTab("forYou");
      setShowCreate(false);
      setPostError("");
      // Log error for debugging
      window.alert && window.alert('[Post Success But Error Thrown] Check browser console for details.');
      console.error('[Post Success But Error Thrown]', {
        error,
        newPost,
        postCreated,
        errorString: error?.toString?.(),
        errorStack: error?.stack,
      });
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        if (newPost && newPost._id) {
          const el = document.querySelector(`[data-post-id='${newPost._id}']`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-mention');
            setTimeout(() => el.classList.remove('highlight-mention'), 2000);
          }
        }
      }, 200);
    }
  } finally {
    setPosting(false);
  }
};

  // In handleLike, preserve createdAt and essential fields during optimistic update
const handleLike = useCallback(async (postId) => {
  const originalPostId = getOriginalPostId(postId);
  if (!originalPostId) return; // Don't like temp/invalid posts

  // Find the post in either collection
  const currentPost = communityPosts.find(p => p._id === postId) || followingPosts.find(p => p._id === postId);
  if (!currentPost || !user) return;

  const currentUserId = user._id || user.id;
  const isCurrentlyLiked = currentPost.likes?.some(likeId => String(likeId) === String(currentUserId));
  let newLikes;
  if (isCurrentlyLiked) {
    newLikes = currentPost.likes.filter(likeId => String(likeId) !== String(currentUserId));
  } else {
    newLikes = [...(currentPost.likes || []), currentUserId];
  }
  // Only update likes optimistically, preserve createdAt and all other fields
  updatePost(postId, {
    ...currentPost,
    likes: newLikes,
    createdAt: currentPost.createdAt,
    author: currentPost.author,
  });

  try {
    const res = await fetch(`${API_BASE}/posts/${originalPostId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const updatedPost = await res.json();
      // Merge backend likes with the latest post state
      const latestPost = communityPosts.find(p => p._id === postId) || followingPosts.find(p => p._id === postId) || currentPost;
      updatePost(postId, {
        ...latestPost,
        ...updatedPost,
        createdAt: updatedPost.createdAt || latestPost.createdAt,
        author: updatedPost.author || latestPost.author,
      });
    } else {
      // Revert optimistic update on error
      updatePost(postId, { ...currentPost });
    }
  } catch (error) {
    updatePost(postId, { ...currentPost });
  }
}, [API_BASE, communityPosts, followingPosts, updatePost, user]);

  // Defensive filter for posts with valid createdAt and backend _id
function isValidPost(post) {
  if (!post) return false;
  if (!post._id || post._id.startsWith('temp-')) return false;
  if (!post.createdAt || isNaN(Date.parse(post.createdAt))) return false;
  return true;
}



  // Provide no-op handlers to prevent ReferenceError if not implemented
  const handleReply = () => {};
  const handleComment = () => {};

  // Real view handler: increment post views in backend
  const handleView = async (postId) => {
    try {
      // Only increment for valid posts
      if (!postId || postId.startsWith('temp-')) return;
      // Always use the original backend id
      const originalId = getOriginalPostId(postId);
      if (!originalId) {
        console.log('[DEBUG][Community] handleView: invalid originalId for', postId);
        return;
      }
      console.log('[DEBUG][Community] handleView called for post', postId, 'originalId', originalId);
      // Call backend API
      const res = await fetch(`${API_BASE}/posts/${originalId}/view`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[DEBUG][Community] Backend responded with:', data);
        // No manual update needed - real-time socket will handle the update
        const currentPost = communityPosts.find(p => p._id === postId) || followingPosts.find(p => p._id === postId);
        return { ...currentPost, views: data.views };
      } else {
        console.error('[DEBUG][Community] Backend view increment failed for', postId, res.status);
      }
    } catch (e) {
      console.error('[DEBUG][Community] handleView error:', e);
    }
  };

  // Custom confirmation for deleting a post
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const handleDeletePost = (postId) => {
    setPendingDeleteId(postId);
    setDeleteError("");
  };

  const confirmDeletePost = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await apiDeletePost(pendingDeleteId);
      if (res && (res.success || res.message?.toLowerCase().includes('deleted'))) {
        setRotatedPosts(prev => prev.filter(p => p._id !== pendingDeleteId));
        setPendingDeleteId(null);
        // Show floating notification
        let msg = 'Post deleted successfully.';
        if (res.message && res.message.toLowerCase().includes('media')) {
          msg = res.message;
        }
        setFloatingNotification(msg);
      } else {
        setDeleteError(res?.message || "Failed to delete post. Please try again.");
        console.error('Failed to delete post:', res);
      }
    } catch (error) {
      setDeleteError("Failed to delete post. Please try again.");
      console.error('Failed to delete post:', error);
    }
  };
      {/* Floating notification */}
      {floatingNotification && (
        <FloatingNotification message={floatingNotification} onClose={() => setFloatingNotification(null)} />
      )}

  const cancelDeletePost = () => {
    setPendingDeleteId(null);
    setDeleteError("");
  };

  // Fix: Define handleLoadFreshPosts for the 'Load New Posts' button
  const handleLoadFreshPosts = async () => {
    setIsLoadingFresh(true);
    setShowLoadNewButton(false);
    try {
      await loadFreshContent({ force: true });
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsLoadingFresh(false);
    }
  };

  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50/80 via-white to-blue-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        minHeight: 0,
        height: '100%',
        maxHeight: '100%',
        fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif`,
        fontSize: 'inherit',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        display: 'flex',
        flex: 1,
      }}
    >
      {/* Custom Delete Confirmation Dialog - Modern design */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Delete Post?</div>
            <div className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              This action cannot be undone. The post will be permanently removed from your profile and feed.
            </div>
            {deleteError && <div className="text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{deleteError}</div>}
            <div className="flex gap-3">
              <button 
                onClick={cancelDeletePost} 
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePost} 
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced main container with proper constraints */}
      <div
        className="w-full max-w-4xl mx-auto min-h-0 flex-1 flex flex-col overflow-hidden"
        style={{
          width: '100%',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Responsive media styles - Senior-level optimization */}
        <style>{`
          .community-post-media {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            display: block;
            box-sizing: border-box;
          }
          .community-post-media video,
          .community-post-media img {
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            min-width: 0 !important;
            max-height: 60vh;
            border-radius: 12px;
            background: #000;
            object-fit: contain;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin: 0;
            padding: 0;
            display: block;
            box-sizing: border-box;
            flex-shrink: 1;
          }
          @media (min-width: 768px) {
            .community-post-media video,
            .community-post-media img {
              max-height: 400px;
              border-radius: 16px;
            }
          }
          @media (min-width: 1024px) {
            .community-post-media video,
            .community-post-media img {
              max-height: 420px;
            }
          }
          
          /* Enhanced scrollbar styling */
          .hide-scrollbar {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Instagram-like mobile font optimizations */
          @media (max-width: 640px) {
            body, .community-container {
              font-size: 14px;
              line-height: 1.4;
            }
            
            /* Optimize text rendering for mobile */
            * {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            
            /* Mobile-first post content sizing - Instagram-like */
            .mobile-post-content {
              font-size: 14px;
              line-height: 1.43;
              font-weight: 400;
              letter-spacing: -0.005em;
            }
            
            /* Mobile comment and reply sizing - Instagram-like */
            .mobile-comment-text {
              font-size: 12px;
              line-height: 1.33;
              font-weight: 400;
              letter-spacing: -0.003em;
            }
            
            /* Mobile interaction elements - smaller and more compact */
            .mobile-interactions {
              font-size: 13px;
              font-weight: 500;
            }
            
            /* Username and timestamp optimizations */
            .mobile-username {
              font-size: 13px;
              font-weight: 600;
              letter-spacing: -0.01em;
            }
            
            .mobile-timestamp {
              font-size: 11px;
              font-weight: 400;
              opacity: 0.8;
            }
          }
          
          /* Modern focus states */
          .modern-focus:focus {
            outline: 2px solid #a99d6b;
            outline-offset: 2px;
          }
        `}</style>
        
        {/* Modern sticky header with enhanced design */}
        <div 
          className={`flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 sticky top-0 z-30 transition-all duration-300 shadow-sm ${
            showTabs ? "opacity-100 translate-y-0 h-auto" : "opacity-0 -translate-y-full h-0 overflow-hidden pointer-events-none"
          }`}
          style={{ willChange: "transform, opacity, height" }}
        >
          <div className="w-full overflow-hidden">
            <CommunityTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onCreatePost={() => setShowCreate(true)}
              visible={showTabs}
              onSearch={handleSearch}
              onCancelSearch={handleCancelSearch}
            />
          </div>
        </div>
        
        {/* Pull-to-refresh spinner in the space between tabs and posts */}
        {activeTab === 'forYou' && (pullDistance > minDragToShowSpinner || isPullRefreshing) && (
          <div className="w-full flex flex-col justify-center items-center py-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200/30 dark:border-gray-700/30">
            <div 
              className={`w-8 h-8 rounded-full border-4 border-gray-300 border-t-[#a99d6b] transition-all duration-200 ${
                isPullRefreshing ? 'animate-spin opacity-100' : 'opacity-70'
              }`}
              style={{
                transform: isPullRefreshing ? 'scale(1)' : `scale(${Math.min(pullDistance / 100, 1)})`
              }}
            ></div>
            <span className="mt-2 text-sm text-[#a99d6b] font-medium">
              {isPullRefreshing ? 'Loading more posts...' : 'Pull to refresh'}
            </span>
          </div>
        )}
        
        {/* Enhanced posts container with modern layout */}
        <div 
          ref={activeTab === 'forYou' ? containerRef : followingContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 dark:from-gray-900/50 dark:via-gray-800 dark:to-gray-900/30 hide-scrollbar"
          style={{ 
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            willChange: 'scroll-position'
          }}
          onTouchStart={handleFeedTouchStart}
          onTouchMove={handleFeedTouchMove}
          onTouchEnd={handleFeedTouchEnd}
        >
          {showCreate && (
            <div className="w-full max-w-2xl mx-auto px-3 md:px-4 pt-4">
              <CreatePostBox
                onPost={handleNewPost}
                onClose={() => setShowCreate(false)}
                posting={posting}
                postError={postError}
              />
            </div>
          )}

          {showLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-3 border-[#a99d6b]/30 border-t-[#a99d6b] animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading posts...</p>
              </div>
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
          ) : searchQuery ? (
            searchLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-[#a99d6b]/30 border-t-[#a99d6b] animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Searching posts...</p>
                </div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <ChatList
                posts={searchResults}
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
            ) : (
              <div className="flex justify-center items-center py-20 px-6">
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FaSearch className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No posts found</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    Try searching with different keywords or check your spelling
                  </p>
                </div>
              </div>
            )
          ) : rotatedPosts.length === 0 ? (
            <div className="flex justify-center items-center py-20 px-6">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#a99d6b]/20 to-[#a99d6b]/10 flex items-center justify-center">
                  <FaPlus className="w-6 h-6 text-[#a99d6b]" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No posts yet</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                  Be the first to share something with the community
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-2.5 bg-[#a99d6b] hover:bg-[#968B5C] text-white font-medium rounded-full transition-colors duration-200"
                >
                  Create Post
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="pb-4">
                <ChatList
                  posts={rotatedPosts.filter(isValidPost)}
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
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#a99d6b]/30 border-t-[#a99d6b] animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
                  </div>
                </div>
              )}
              
              {!isLoadingMore && communityPosts.length > 0 && (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    {cyclingInfo?.isRepeatingContent ? (
                      <p className="text-[#a99d6b] dark:text-[#a99d6b] text-xs font-medium">
                        🔄 Cycling through posts (Round {cyclingInfo.completedCycles + 1})
                      </p>
                    ) : hasMore ? (
                      <p className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                        ∞ Scroll for more content ∞
                      </p>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                        🔄 Scroll more to see posts again
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Enhanced "Load New Posts" button - Modern design with mobile optimization */}
          {activeTab === 'forYou' && showLoadNewButton && !isLoadingFresh && (
            <button
              className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm border-2 border-white/20"
              onClick={handleLoadFreshPosts}
            >
              <span>Load New Posts</span>
            </button>
          )}
        </div>
        
        {/* Modern floating action button */}
        <FloatingPlusButton onClick={() => setShowCreate(true)} visible={showTabs} />
      </div>
    </div>
  );
}