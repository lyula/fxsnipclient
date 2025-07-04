import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { 
  getConversations, 
  getNotifications, 
  createPost,
  likePost,
  incrementPostViews,
  deletePost,
  addCommentToPost,
  editPost,
  addReplyToComment
} from "../utils/api";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  // State for conversations (messaging)
  const [conversations, setConversations] = useState([]);
  
  // State for notifications
  const [notifications, setNotifications] = useState([]);
  
  // State for community posts
  const [communityPosts, setCommunityPosts] = useState([]);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    conversations: false,
    notifications: false,
    posts: false,
  });

  // Message cache
  const [messageCache, setMessageCache] = useState(new Map());

  // Mobile chat state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Add to dashboard context state
  const [cyclingInfo, setCyclingInfo] = useState(null);

  // Polling state
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastConversationFetch, setLastConversationFetch] = useState(0);
  const [lastNotificationFetch, setLastNotificationFetch] = useState(0);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "now";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }, []);

  // Fetch conversations with caching
  const fetchConversations = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && (now - lastConversationFetch < 30000)) {
      return conversations;
    }
    try {
      setLoadingStates(prev => ({ ...prev, conversations: true }));
      const data = await getConversations();
      if (Array.isArray(data)) {
        const validConversations = data.filter(conv => 
          conv && conv.user && conv.user.username
        );
        const processedConversations = validConversations.map(conv => {
          const user = conv.user || {};
          const lastMsg = conv.lastMessage || {};
          return {
            _id: conv._id,
            username: user.username || 'Unknown User',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || 'User')}`,
            verified: user.verified || false,
            lastMessage: lastMsg.text || '',
            lastTime: formatRelativeTime(new Date(lastMsg.createdAt || Date.now()).getTime()),
            lastTimestamp: new Date(lastMsg.createdAt || Date.now()).getTime(),
            unreadCount: conv.unreadCount || 0
          };
        });
        setConversations(processedConversations);
        setLastConversationFetch(now);
        return processedConversations;
      }
      return [];
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    } finally {
      setLoadingStates(prev => ({ ...prev, conversations: false }));
    }
  }, [lastConversationFetch, formatRelativeTime, conversations]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && (now - lastNotificationFetch < 15000)) {
      return notifications;
    }
    try {
      setLoadingStates(prev => ({ ...prev, notifications: true }));
      const data = await getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        setLastNotificationFetch(now);
        return data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  }, [lastNotificationFetch, notifications]);

  // Enhanced fetchCommunityPosts with proper fresh content support
  const fetchCommunityPosts = useCallback(async (refresh = false, offset = 0, direction = 'down', loadFresh = false) => {
    try {
      setLoadingStates(prev => ({ ...prev, posts: offset === 0 ? true : false }));
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const timestamp = Date.now();
      const params = new URLSearchParams({
        limit: loadFresh ? '30' : '20',
        offset: offset.toString(),
        scrollDirection: direction,
        refreshFeed: refresh.toString(),
        loadFresh: loadFresh.toString(),
        timestamp: timestamp.toString(),
        cacheBust: Math.random().toString(36)
      });
      if (loadFresh || direction === 'fresh') {
        params.append('sortBy', 'newest');
        params.append('includeRecent', 'true');
      }
      const res = await fetch(`${API_BASE}/posts?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCyclingInfo(data.cyclingInfo);
        if (refresh || loadFresh || offset === 0 || direction === 'fresh') {
          setCommunityPosts(data.posts || []);
        }
        return data;
      } else {
        console.error('Failed to fetch posts:', res.status, res.statusText);
        return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
      }
    } catch (error) {
      console.error("Error fetching community posts:", error);
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, []);

  // Add refresh function for swipe up
  const refreshCommunityFeed = useCallback(async () => {
    await fetchCommunityPosts(true);
  }, [fetchCommunityPosts]);

  // Start polling for real-time updates
  const startPolling = useCallback(() => {
    if (pollingInterval) return;
    const interval = setInterval(async () => {
      try {
        if (document.visibilityState === 'visible') {
          await Promise.all([
            fetchConversations(true),
            fetchNotifications(true)
          ]);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 300000);
    setPollingInterval(interval);
  }, [pollingInterval, fetchConversations, fetchNotifications]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Update conversation in the list
  const updateConversation = useCallback((conversationId, updates) => {
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, ...updates }
          : conv
      )
    );
    if (updates.lastMessage || updates.unreadCount) {
      setTimeout(() => fetchConversations(true), 2000);
    }
  }, [fetchConversations]);

  // Add post optimistically
  const addPostOptimistically = useCallback((post) => {
    setCommunityPosts(prev => [post, ...prev]);
  }, []);

  // Update a specific post
  const updatePost = useCallback((postId, updatedPost) => {
    setCommunityPosts(prev => 
      prev
        .map(post => 
          post._id === postId ? updatedPost : post
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
  }, []);

  // Delete a post
  const deletePostFromList = useCallback((postId) => {
    setCommunityPosts(prev => prev.filter(post => post._id !== postId));
  }, []);

  // Add infinite scroll functions
  const loadMorePosts = useCallback(async (currentOffset) => {
    if (loadingStates.posts) return { hasMore: true, posts: [] };
    setLoadingStates(prev => ({ ...prev, posts: true }));
    try {
      const result = await fetchCommunityPosts(false, currentOffset, 'down');
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      if (result?.posts && result.posts.length > 0) {
        setCommunityPosts(prev => {
          const existingPostIds = new Set(prev.map(post => post._id));
          const newPosts = result.cyclingInfo?.isRepeatingContent 
            ? result.posts.map(post => ({
                ...post,
                _id: `${post._id}_cycle_${result.cyclingInfo.completedCycles}_${Date.now()}`,
                _originalId: post._id, // Keep the original ID for API calls
                _isCyled: true,
                _cycleNumber: result.cyclingInfo.completedCycles
              }))
            : result.posts.filter(post => !existingPostIds.has(post._id));
          if (newPosts.length > 0) {
            return [...prev, ...newPosts];
          }
          return prev;
        });
      }
      return {
        ...result,
        posts: result.posts,
        hasMore: result.hasMore === true || (result.cyclingInfo?.totalPostsInCycle > 0)
      };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts, loadingStates.posts]);

  const loadNewerPosts = useCallback(async (forceFresh = false) => {
    const result = await fetchCommunityPosts(true, 0, 'up');
    if (result?.cyclingInfo) {
      setCyclingInfo(result.cyclingInfo);
    }
    if (forceFresh && result?.posts) {
      const freshPosts = result.posts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setCommunityPosts(freshPosts);
    }
    return result;
  }, [fetchCommunityPosts]);

  // Enhanced loadFreshContent function to get truly fresh posts from database
  const loadFreshContent = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, posts: true }));
      const result = await fetchCommunityPosts(false, 0, 'fresh', true);
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      if (result?.posts) {
        const sortedFreshPosts = result.posts.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setCommunityPosts(sortedFreshPosts);
      }
      return result;
    } catch (error) {
      console.error("Error loading fresh content:", error);
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts]);

  // Utility function to deduplicate posts by _id, keeping the first occurrence
  const deduplicatePostsById = useCallback((posts) => {
    const seenIds = new Set();
    return posts.filter(post => {
      if (seenIds.has(post._id)) {
        return false;
      }
      seenIds.add(post._id);
      return true;
    });
  }, []);

  // Memoized deduplicated posts
  const dedupedCommunityPosts = useMemo(() => {
    return deduplicatePostsById(communityPosts);
  }, [communityPosts, deduplicatePostsById]);

  // Context value
  const value = useMemo(() => ({
    conversations,
    fetchConversations,
    updateConversation,
    notifications,
    fetchNotifications,
    communityPosts,
    dedupedCommunityPosts,
    fetchCommunityPosts,
    loadMorePosts,
    loadNewerPosts,
    refreshCommunityFeed,
    addPostOptimistically,
    updatePost,
    deletePost: deletePostFromList,
    loadingStates,
    formatRelativeTime,
    messageCache,
    setMessageCache,
    isMobileChatOpen,
    setIsMobileChatOpen,
    cyclingInfo,
    loadFreshContent,
    startPolling,
    stopPolling,
  }), [
    conversations,
    fetchConversations,
    updateConversation,
    notifications,
    fetchNotifications,
    communityPosts,
    dedupedCommunityPosts,
    fetchCommunityPosts,
    loadMorePosts,
    loadNewerPosts,
    refreshCommunityFeed,
    addPostOptimistically,
    updatePost,
    deletePostFromList,
    loadingStates,
    formatRelativeTime,
    messageCache,
    setMessageCache,
    isMobileChatOpen,
    setIsMobileChatOpen,
    cyclingInfo,
    loadFreshContent,
    startPolling,
    stopPolling,
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// Add the missing hook and export
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
