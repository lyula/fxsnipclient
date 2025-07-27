import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchPosts } from "../../utils/api";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import FollowingFeed from "./community/FollowingFeed";

import { useDashboard } from "../../context/dashboard";
import FloatingPlusButton from "../../components/common/FloatingPlusButton";
import CreatePostBox from "../../pages/dashboard/community/CreatePostBox";

export default function Community({ user }) {
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
  const minDragToShowSpinner = 120; // px before spinner shows

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
      setPullDistance(0);
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
      setTimeout(() => setIsPullRefreshing(false), 800);
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
    // Debug: Log createdAt for all posts and their authors
    if (deduped && deduped.length) {
      deduped.forEach((post, idx) => {
        console.log(`[NaN-debug] [communityPosts] Post #${idx} _id:`, post._id, 'createdAt:', post.createdAt, 'author.createdAt:', post.author?.createdAt, 'author:', post.author);
        if (Array.isArray(post.comments)) {
          post.comments.forEach((comment, cidx) => {
            console.log(`[NaN-debug] [communityPosts]   Comment #${cidx} _id:`, comment._id, 'createdAt:', comment.createdAt, 'author.createdAt:', comment.author?.createdAt, 'author:', comment.author);
            if (Array.isArray(comment.replies)) {
              comment.replies.forEach((reply, ridx) => {
                console.log(`[NaN-debug] [communityPosts]     Reply #${ridx} _id:`, reply._id, 'createdAt:', reply.createdAt, 'author.createdAt:', reply.author?.createdAt, 'author:', reply.author);
              });
            }
          });
        }
      });
    }
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
  const handleView = () => {};

  // Delete post and update UI immediately
  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId);
      // Remove the post from rotatedPosts immediately
      setRotatedPosts(prev => prev.filter(p => p._id !== postId));
    } catch (error) {
      // Optionally show error to user
      console.error('Failed to delete post:', error);
    }
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
      className="w-full h-full flex flex-col overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800"
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
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        flex: 1,
      }}
    >
      {/* Enhanced tabs container and posts container */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Responsive video styles for posts */}
        <style>{`
          .community-post-media video,
          .community-post-media img {
            width: 100%;
            height: auto;
            max-width: 100vw;
            max-height: 50vh;
            border-radius: 12px;
            background: #000;
            object-fit: contain;
            box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
            margin: 0 auto;
            display: block;
            aspect-ratio: 16/9;
          }
          @media (min-width: 768px) {
            .community-post-media video,
            .community-post-media img {
              max-width: 40vw;
              max-height: 28vh;
              aspect-ratio: 16/9;
            }
          }
          @media (min-width: 1200px) {
            .community-post-media video,
            .community-post-media img {
              max-width: 32vw;
              max-height: 24vh;
              aspect-ratio: 16/9;
            }
          }
        `}</style>
        <div 
          className={`flex-shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-20 transition-all duration-300 ${
            showTabs ? "opacity-100 translate-y-0 h-auto py-2" : "opacity-0 -translate-y-full h-0 overflow-hidden pointer-events-none"
          }`}
          style={{ willChange: "transform, opacity, height" }}
        >
          <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6">
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
        {/* Enhanced posts container */}
        <div 
          ref={activeTab === 'forYou' ? containerRef : followingContainerRef}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 dark:from-gray-800 dark:via-gray-900/90 dark:to-slate-900 hide-scrollbar ${
            activeTab === 'following' ? '' : 'py-0'
          }`}
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
          {/* Pull-to-refresh spinner */}
          {activeTab === 'forYou' && (pullDistance > minDragToShowSpinner || isPullRefreshing) && (
            <div className="w-full flex justify-center items-center pt-2 pb-1" style={{ minHeight: 32 }}>
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 ${isPullRefreshing ? '' : 'opacity-60'}`}></div>
            </div>
          )}

          {showCreate && (
            <CreatePostBox
              onPost={handleNewPost}
              onClose={() => setShowCreate(false)}
              posting={posting}
              postError={postError}
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
          ) : searchQuery ? (
            searchLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                Searching posts...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="w-full max-w-full overflow-x-hidden">
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
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No posts found for "{searchQuery}".
              </div>
            )
          ) : rotatedPosts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No posts yet. Be the first to share something!
            </div>
          ) : (
            <>
              <div className="w-full max-w-full overflow-x-hidden">
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
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
                </div>
              )}
              
              {!isLoadingMore && communityPosts.length > 0 && (
                <div className="p-6 text-center">
                  {cyclingInfo?.isRepeatingContent ? (
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
        <FloatingPlusButton onClick={() => setShowCreate(true)} visible={showTabs} />
      </div>
    </div>
  );
}