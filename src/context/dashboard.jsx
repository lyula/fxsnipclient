import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { getConversations, getNotifications } from "../utils/api";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  // Persistent state across navigation
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    conversations: false,
    notifications: false,
    posts: false,
    messages: false
  });

  // Cache timestamps
  const cacheTimestamps = useRef({
    conversations: 0,
    notifications: 0,
    posts: 0
  });

  // Cache duration (10 minutes)
  const CACHE_DURATION = 10 * 60 * 1000; // Increased from 5 minutes to 10 minutes

  // Utility function to format time as relative duration
  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  };

  // Check if cache is valid
  const isCacheValid = (key) => {
    const timestamp = cacheTimestamps.current[key];
    return timestamp && (Date.now() - timestamp) < CACHE_DURATION;
  };

  // Update cache timestamp
  const updateCacheTimestamp = (key) => {
    cacheTimestamps.current[key] = Date.now();
  };

  // Set loading state
  const setLoading = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Fetch conversations with caching
  const fetchConversations = async (force = false) => {
    if (!force && isCacheValid('conversations') && conversations.length > 0) {
      return conversations;
    }

    // Show loading only if no cached data
    if (conversations.length === 0) {
      setLoading('conversations', true);
    }

    try {
      const data = await getConversations();
      const sortedUsers = data
        .map((conv) => ({
          _id: conv.user._id,
          username: conv.user.username,
          avatar: conv.user.countryFlag
            ? conv.user.countryFlag
            : "https://ui-avatars.com/api/?name=" + encodeURIComponent(conv.user.username),
          lastMessage: conv.lastMessage?.text || "",
          lastTime: conv.lastMessage
            ? formatRelativeTime(new Date(conv.lastMessage.createdAt).getTime())
            : "",
          lastTimestamp: conv.lastMessage
            ? new Date(conv.lastMessage.createdAt).getTime()
            : 0,
          unreadCount: conv.unreadCount || 0,
          verified: !!conv.user.verified,
        }))
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

      setConversations(sortedUsers);
      updateCacheTimestamp('conversations');
      return sortedUsers;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return conversations; // Return cached data on error
    } finally {
      setLoading('conversations', false);
    }
  };

  // Fetch notifications with caching
  const fetchNotifications = async (force = false) => {
    if (!force && isCacheValid('notifications') && notifications.length > 0) {
      return notifications;
    }

    if (notifications.length === 0) {
      setLoading('notifications', true);
    }

    try {
      const data = await getNotifications();
      setNotifications(data || []);
      updateCacheTimestamp('notifications');
      return data || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return notifications;
    } finally {
      setLoading('notifications', false);
    }
  };

  // Fetch community posts with caching
  const fetchCommunityPosts = async (force = false) => {
    if (!force && isCacheValid('posts') && communityPosts.length > 0) {
      return communityPosts;
    }

    if (communityPosts.length === 0) {
      setLoading('posts', true);
    }

    try {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/posts`);
      
      if (res.ok) {
        const data = await res.json();
        const sortedPosts = [...data]
          .filter((post) => post._id && post.createdAt)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setCommunityPosts(sortedPosts);
        updateCacheTimestamp('posts');
        return sortedPosts;
      } else {
        console.error("Failed to fetch posts");
        return communityPosts;
      }
    } catch (error) {
      console.error("Error fetching community posts:", error);
      return communityPosts;
    } finally {
      setLoading('posts', false);
    }
  };

  // Add new post optimistically
  const addPostOptimistically = (newPost) => {
    setCommunityPosts(prev => [newPost, ...prev]);
  };

  // Update a specific post (for likes, comments, etc.)
  const updatePost = (postId, updates) => {
    setCommunityPosts(prev => 
      prev.map(post => 
        post._id === postId 
          ? { ...post, ...updates }
          : post
      )
    );
  };

  // Delete a post
  const deletePost = (postId) => {
    setCommunityPosts(prev => 
      prev.filter(post => post._id !== postId)
    );
  };

  // Update conversation optimistically
  const updateConversation = (conversationId, updates) => {
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, ...updates }
          : conv
      ).sort((a, b) => b.lastTimestamp - a.lastTimestamp)
    );
  };

  // Add new message optimistically
  const addMessageOptimistically = (message) => {
    setMessages(prev => [...prev, message]);
  };

  // Update message after send
  const updateMessage = (tempId, realMessage) => {
    setMessages(prev => 
      prev.map(msg => 
        msg._id === tempId ? realMessage : msg
      )
    );
  };

  // Mark message as failed
  const markMessageFailed = (tempId) => {
    setMessages(prev => 
      prev.map(msg => 
        msg._id === tempId ? { ...msg, failed: true } : msg
      )
    );
  };

  // Background refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh conversations in background if cache is getting stale
      if (cacheTimestamps.current.conversations && 
          (Date.now() - cacheTimestamps.current.conversations) > (CACHE_DURATION * 0.8)) {
        fetchConversations(true);
      }

      // Refresh notifications in background
      if (cacheTimestamps.current.notifications && 
          (Date.now() - cacheTimestamps.current.notifications) > (CACHE_DURATION * 0.8)) {
        fetchNotifications(true);
      }

      // Refresh community posts in background
      if (cacheTimestamps.current.posts && 
          (Date.now() - cacheTimestamps.current.posts) > (CACHE_DURATION * 0.8)) {
        fetchCommunityPosts(true);
      }

      // Update relative timestamps
      setConversations(prev => 
        prev.map(conv => ({
          ...conv,
          lastTime: conv.lastTimestamp 
            ? formatRelativeTime(conv.lastTimestamp)
            : ""
        }))
      );
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    // State
    conversations,
    notifications,
    communityPosts,
    selectedUser,
    messages,
    loadingStates,

    // Setters
    setConversations,
    setNotifications,
    setCommunityPosts,
    setSelectedUser,
    setMessages,

    // Methods
    fetchConversations,
    fetchNotifications,
    fetchCommunityPosts,
    updateConversation,
    addMessageOptimistically,
    updateMessage,
    markMessageFailed,
    addPostOptimistically,
    updatePost,
    deletePost,
    formatRelativeTime,

    // Cache info
    isCacheValid,
    cacheTimestamps: cacheTimestamps.current
  };

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