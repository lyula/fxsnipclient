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

  // Format relative time - MOVED HERE TO FIX CIRCULAR DEPENDENCY
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
    
    // Skip if we just fetched (within 30 seconds) unless forced
    if (!forceRefresh && (now - lastConversationFetch < 30000)) {
      return conversations;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, conversations: true }));
      const data = await getConversations();
      
      if (Array.isArray(data)) {
        // Filter out invalid conversations
        const validConversations = data.filter(conv => 
          conv && conv.user && conv.user.username
        );
        
        // Process conversations to match frontend expectations
        const processedConversations = validConversations.map(conv => {
          const user = conv.user || {};
          const lastMsg = conv.lastMessage || {};
          
          return {
            _id: conv._id,
            username: user.username || 'Unknown User',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username || 'User')}`,
            verified: user.verified || false,
            lastMessage: lastMsg.text || '', // This should now correctly show the last message
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
    
    // Skip if we just fetched (within 15 seconds) unless forced
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

  // Enhanced Dashboard Context with Infinite Scroll and Fresh Content
  const fetchCommunityPosts = useCallback(async (refresh = false, offset = 0, direction = 'down', loadFresh = false) => {
    try {
      setLoadingStates(prev => ({ ...prev, posts: offset === 0 ? true : false }));
      
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        scrollDirection: direction,
        refreshFeed: refresh.toString(),
        loadFresh: loadFresh.toString()  // Add fresh content parameter
      });
      
      const res = await fetch(`${API_BASE}/posts?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Store cycling info separately
        setCyclingInfo(data.cyclingInfo);
        
        if (refresh || loadFresh) {
          setCommunityPosts(data.posts || []);
        } else if (offset === 0) {
          setCommunityPosts(data.posts || []);
        }
        
        return data;
      }
      
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
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
    }, 300000); // 5 minutes instead of 30 seconds
    
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
    
    // If this is a new message, refresh conversations after a delay
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
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Maintain sort order
    );
  }, []);

  // Delete a post
  const deletePostFromList = useCallback((postId) => {
    setCommunityPosts(prev => prev.filter(post => post._id !== postId));
  }, []);

  // Add infinite scroll functions
  const loadMorePosts = useCallback(async (currentOffset) => {
    if (loadingStates.posts) return { hasMore: true };
    
    setLoadingStates(prev => ({ ...prev, posts: true }));
    
    try {
      const result = await fetchCommunityPosts(false, currentOffset, 'down');
      
      // Update cycling info from the result
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      
      // Only append new posts, don't replace existing ones
      if (result?.posts) {
        setCommunityPosts(prev => {
          // Create a map of existing posts by their unique scroll position
          const existingPostMap = new Map();
          prev.forEach(post => {
            if (post._scrollPosition !== undefined) {
              existingPostMap.set(post._scrollPosition, post);
            }
          });
          
          // Add new posts that don't already exist
          const newPosts = result.posts.filter(post => 
            !existingPostMap.has(post._scrollPosition)
          );
          
          return [...prev, ...newPosts];
        });
      }
      
      return result;
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts, loadingStates.posts]);

  const loadNewerPosts = useCallback(async (forceFresh = false) => {
    const result = await fetchCommunityPosts(true, 0, 'up');
    
    // Update cycling info when refreshing
    if (result?.cyclingInfo) {
      setCyclingInfo(result.cyclingInfo);
    }
    
    // If forcing fresh content, prioritize very recent posts
    if (forceFresh && result?.posts) {
      // Sort by creation date to ensure newest first
      const freshPosts = result.posts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setCommunityPosts(freshPosts);
    }
    
    return result;
  }, [fetchCommunityPosts]);

  // Load fresh content specifically
  const loadFreshContent = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, posts: true }));
      
      const result = await fetchCommunityPosts(false, 0, 'up', true); // loadFresh = true
      
      // Update cycling info
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      
      // Replace current posts with fresh content
      if (result?.posts) {
        setCommunityPosts(result.posts);
      }
      
      return result;
    } catch (error) {
      console.error("Error loading fresh content:", error);
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts]);

  // Context value
  const value = useMemo(() => ({
    // Conversations
    conversations,
    fetchConversations,
    updateConversation,
    
    // Notifications  
    notifications,
    fetchNotifications,
    
    // Community posts
    communityPosts,
    fetchCommunityPosts,
    loadMorePosts,
    loadNewerPosts,
    refreshCommunityFeed,
    addPostOptimistically,
    updatePost,
    deletePost: deletePostFromList,
    
    // Loading states
    loadingStates,
    
    // Utilities
    formatRelativeTime,
    
    // Message cache
    messageCache,
    setMessageCache,

    // Mobile chat
    isMobileChatOpen,
    setIsMobileChatOpen,

    // Cycling info
    cyclingInfo,

    // Fresh content
    loadFreshContent,

    // Polling control
    startPolling,
    stopPolling,
  }), [
    conversations,
    fetchConversations,
    updateConversation,
    notifications,
    fetchNotifications,
    communityPosts,
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

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}