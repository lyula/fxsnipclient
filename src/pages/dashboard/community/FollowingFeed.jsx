import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatList from "./ChatList";
import UserSearch from "./UserSearch";
import { useDashboard } from "../../../context/dashboard";

export default function FollowingFeed({ 
  user, 
  onReply, 
  onComment, 
  onLike, 
  onView, 
  onDelete, 
  containerRef, 
  onLoadFresh, 
  isLoadingFresh 
}) {
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showLoadNewButton, setShowLoadNewButton] = useState(false);
  const [scrollUpDistance, setScrollUpDistance] = useState(0);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [buttonHideTimeout, setButtonHideTimeout] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true); // Track if user is at the top
  
  const internalContainerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const effectiveContainerRef = containerRef || internalContainerRef;

  const {
    followingPosts,
    fetchFollowingPosts,
    loadMoreFollowingPosts,
    loadNewerFollowingPosts,
    loadFreshFollowingContent,
    followingCyclingInfo,
    loadingStates
  } = useDashboard();

  // Initial load
  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        const result = await fetchFollowingPosts(false, 0, 'down');
        setCurrentOffset(result?.nextOffset || 20);
        setHasMore(result?.hasMore !== false);
      } catch (error) {
        console.error('Error loading initial following posts:', error);
        setHasMore(false);
      }
    };
    
    loadInitialPosts();
  }, [fetchFollowingPosts]);

  // Enhanced scroll handler with proper button logic
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = async () => {
      if (!effectiveContainerRef.current || isLoadingRef.current || ticking) return;
      
      ticking = true;
      
      requestAnimationFrame(async () => {
        if (!effectiveContainerRef.current) {
          ticking = false;
          return;
        }
        
        const { scrollTop, scrollHeight, clientHeight } = effectiveContainerRef.current;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;
        const currentScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
        const scrollDelta = Math.abs(scrollTop - lastScrollTop);

        // Update scroll tracking and top position
        if (scrollDelta > 2) {
          setLastScrollTop(scrollTop);
          setIsAtTop(scrollTop <= 20); // Consider top if within 20px of the top
        }

        // Track upward scroll distance for "Load New Posts" button
        if (currentScrollDirection === 'up') {
          setScrollUpDistance(prev => {
            const newDistance = prev + scrollDelta;
            if (newDistance > 100 && !showLoadNewButton && !isRefreshing && !isLoadingFresh) {
              setShowLoadNewButton(true);
              if (buttonHideTimeout) {
                clearTimeout(buttonHideTimeout);
              }
              const timeout = setTimeout(() => {
                setShowLoadNewButton(false);
                setScrollUpDistance(0);
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
        }

        // Infinite scroll logic
        if (scrollBottom < 500 && hasMore && !isLoadingRef.current) {
          isLoadingRef.current = true;
          setIsLoadingMore(true);
          
          const currentScrollHeight = scrollHeight;
          const currentScrollTop = scrollTop;
          
          try {
            const result = await loadMoreFollowingPosts(currentOffset);
            
            if (result) {
              if (result.hasMore === true) {
                setHasMore(true);
              } else if (!result.hasMore && followingCyclingInfo?.totalPostsInCycle > 0) {
                console.log('End of following posts reached, cycling back to start...');
                setHasMore(true);
                setCurrentOffset(0);
                const cyclingResult = await loadMoreFollowingPosts(0);
                if (cyclingResult?.posts) {
                  setCurrentOffset(cyclingResult.posts.length);
                }
              } else {
                setHasMore(false);
              }
              
              if (result.posts && result.posts.length > 0) {
                setCurrentOffset(prev => prev + result.posts.length);
                requestAnimationFrame(() => {
                  if (effectiveContainerRef.current && effectiveContainerRef.current.scrollHeight > currentScrollHeight) {
                    effectiveContainerRef.current.scrollTop = currentScrollTop;
                  }
                });
              }
            } else {
              setHasMore(false);
            }
          } catch (error) {
            console.error('Error loading more following posts:', error);
          } finally {
            setIsLoadingMore(false);
            isLoadingRef.current = false;
          }
        }
        
        ticking = false;
      });
    };

    const container = effectiveContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (buttonHideTimeout) {
          clearTimeout(buttonHideTimeout);
        }
      };
    }
  }, [
    loadMoreFollowingPosts, 
    hasMore, 
    followingCyclingInfo, 
    currentOffset, 
    lastScrollTop, 
    showLoadNewButton, 
    isRefreshing, 
    isLoadingFresh, 
    buttonHideTimeout
  ]);

  // Enhanced pull-to-refresh with swipe up support
  const handlePullToRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingFresh) return;
    
    setIsRefreshing(true);
    try {
      await loadNewerFollowingPosts();
      setCurrentOffset(20);
      setHasMore(true);
      console.log('Following feed refreshed');
    } catch (error) {
      console.error('Error refreshing following feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadNewerFollowingPosts, isRefreshing, isLoadingFresh]);

  // Load fresh following posts
  const handleLoadFreshPosts = useCallback(async () => {
    if (isLoadingFresh || isRefreshing) return;
    
    setShowLoadNewButton(false);
    setScrollUpDistance(0);
    
    if (buttonHideTimeout) {
      clearTimeout(buttonHideTimeout);
      setButtonHideTimeout(null);
    }
    
    try {
      if (onLoadFresh) {
        await onLoadFresh();
      } else {
        await loadFreshFollowingContent();
      }
      
      setCurrentOffset(20);
      setHasMore(true);
      
      if (effectiveContainerRef.current) {
        effectiveContainerRef.current.scrollTop = 0;
      }
      
      console.log('Fresh following content loaded');
    } catch (error) {
      console.error('Error loading fresh following posts:', error);
    }
  }, [onLoadFresh, loadFreshFollowingContent, isLoadingFresh, isRefreshing, buttonHideTimeout]);

  // Handle pull-to-refresh for general refresh
  const handleGeneralRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingFresh) return;
    
    setShowLoadNewButton(false);
    setScrollUpDistance(0);
    
    if (buttonHideTimeout) {
      clearTimeout(buttonHideTimeout);
      setButtonHideTimeout(null);
    }
    
    try {
      await loadNewerFollowingPosts();
      setCurrentOffset(20);
      setHasMore(true);
      
      if (effectiveContainerRef.current) {
        effectiveContainerRef.current.scrollTop = 0;
      }
      
      console.log('Following feed refreshed (general)');
    } catch (error) {
      console.error('Error refreshing following feed:', error);
    }
  }, [loadNewerFollowingPosts, isRefreshing, isLoadingFresh, buttonHideTimeout]);

  const showLoading = loadingStates.followingPosts && followingPosts.length === 0;

  return (
    <div className="flex flex-col h-full relative">
      {/* Always visible search input at the top */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-4 md:px-6 py-3">
        <UserSearch currentUser={user} />
      </div>

      {/* Content area with enhanced scroll support */}
      <div 
        ref={effectiveContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ 
          minHeight: 0,
          maxHeight: '100%',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {/* Pull to refresh indicator */}
        {isRefreshing && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
            <p className="text-green-500 text-sm">Refreshing following feed...</p>
          </div>
        )}

        {showLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading posts from people you follow...
          </div>
        ) : followingPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">No posts from people you follow yet</h3>
              <p className="text-sm mb-4">Follow some users to see their posts here!</p>
              <p className="text-xs text-gray-400">Use the search above to find people to follow.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Posts container with top padding only */}
            <div className="pt-6">
            <div className="w-full max-w-full overflow-x-hidden">
                <ChatList
                  posts={followingPosts}
                  postRefs={{}}
                  onReply={onReply}
                  onComment={onComment}
                  onLike={onLike}
                  onView={onView}
                  onDelete={onDelete}
                  currentUserId={user?._id}
                  currentUsername={user?.username}
                  currentUserVerified={user?.verified}
                  currentUser={user}
                />
              </div>
            </div>
          </>
        )}
        
        {isLoadingMore && (
          <div className="py-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading more posts...</p>
          </div>
        )}
        
        {!isLoadingMore && followingPosts.length > 0 && (
          <div className="py-2 pb-4 text-center">
            {followingCyclingInfo?.isRepeatingContent ? (
              <p className="text-blue-400 dark:text-blue-300 text-xs">
                🔄 Cycling through posts (Round {followingCyclingInfo.completedCycles + 1})
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
      </div>

      {/* Smart load new posts button - Blue when not at top, Green when at top */}
      {showLoadNewButton && !isLoadingFresh && !isRefreshing && (
        <button
          className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 text-white rounded-full font-medium shadow-lg transition-all duration-300 animate-pulse whitespace-nowrap text-sm ${
            isAtTop 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={isAtTop ? handleLoadFreshPosts : handleGeneralRefresh}
        >
          {isAtTop ? 'Load New Following Posts' : 'Refresh Following Feed'}
        </button>
      )}
    </div>
  );
}