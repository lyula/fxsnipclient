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

  // Fetch conversations with caching
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, conversations: true }));
      const data = await getConversations();
      
      if (Array.isArray(data)) {
        // Process conversations to add avatar URLs and format data
        const processedConversations = data.map(conv => ({
          _id: conv._id,
          username: conv.user?.username || conv.username,
          verified: conv.user?.verified || conv.verified,
          avatar: conv.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user?.username || conv.username)}&background=a99d6b&color=fff&size=40`,
          lastMessage: conv.lastMessage?.text || conv.lastMessage?.message || "No messages yet",
          lastTime: formatRelativeTime(new Date(conv.lastMessage?.createdAt || Date.now()).getTime()),
          lastTimestamp: new Date(conv.lastMessage?.createdAt || Date.now()).getTime(),
          unreadCount: conv.unreadCount || 0
        }));
        
        setConversations(processedConversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, conversations: false }));
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, notifications: true }));
      const data = await getNotifications();
      
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  }, []);

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

  // Add refresh function for swipe up (add this after fetchCommunityPosts)
  const refreshCommunityFeed = useCallback(async () => {
    await fetchCommunityPosts(true);
  }, [fetchCommunityPosts]);

  // Update conversation in the list
  const updateConversation = useCallback((conversationId, updates) => {
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, ...updates }
          : conv
      )
    );
  }, []);

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
  const deletePost = useCallback((postId) => {
    setCommunityPosts(prev => prev.filter(post => post._id !== postId));
  }, []);

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

  // Add infinite scroll functions
  const loadMorePosts = async (currentOffset) => {
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
  };

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
    deletePost,
    
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
    loadFreshContent,  // Add this
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
    deletePost,
    loadingStates,
    formatRelativeTime,
    messageCache,
    setMessageCache,
    isMobileChatOpen,
    setIsMobileChatOpen,
    cyclingInfo,
    loadFreshContent,  // Add this
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