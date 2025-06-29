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

  // Fetch community posts
  const fetchCommunityPosts = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, posts: true }));
      
      // Check if we have cached posts
      if (communityPosts.length > 0) {
        // Load from cache first, then refresh in background
        setLoadingStates(prev => ({ ...prev, posts: false }));
      }
      
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/posts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCommunityPosts(
            data
              .map(post => ({
                ...post,
                avatar: post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || "User")}&background=a99d6b&color=fff&size=40`
              }))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
          );
        }
      }
    } catch (error) {
      console.error("Error fetching community posts:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [communityPosts.length]);

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
    addPostOptimistically,
    updatePost,
    deletePost,
    
    // Loading states
    loadingStates,
    
    // Utilities
    formatRelativeTime,
    
    // Message cache
    messageCache,
    setMessageCache
  }), [
    conversations,
    fetchConversations,
    updateConversation,
    notifications,
    fetchNotifications,
    communityPosts,
    fetchCommunityPosts,
    addPostOptimistically,
    updatePost,
    deletePost,
    loadingStates,
    formatRelativeTime,
    messageCache,
    setMessageCache
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