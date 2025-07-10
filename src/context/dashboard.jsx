import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { io } from "socket.io-client";
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

// Track if socket connect message has been printed for this session
let hasPrintedSocketConnect = false;

export function DashboardProvider({ children }) {
  // State for conversations (messaging)
  const [conversations, setConversations] = useState([]);
  
  // State for notifications
  const [notifications, setNotifications] = useState([]);
  
  // State for community posts
  const [communityPosts, setCommunityPosts] = useState([]);
  
  // State for following posts
  const [followingPosts, setFollowingPosts] = useState([]);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    conversations: false,
    notifications: false,
    posts: false,
    followingPosts: false,
  });

  // Message cache
  const [messageCache, setMessageCache] = useState(new Map());

  // Mobile chat state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Add to dashboard context state
  const [cyclingInfo, setCyclingInfo] = useState(null);
  const [followingCyclingInfo, setFollowingCyclingInfo] = useState({});

  // Polling state
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastConversationFetch, setLastConversationFetch] = useState(0);
  const [lastNotificationFetch, setLastNotificationFetch] = useState(0);

  // Ref to track initial load execution
  const initialLoadExecuted = useRef(false);

  // --- SOCKET.IO GLOBAL CONNECTION ---
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
  const lastEmittedUserId = useRef(null);

  // --- Real-time messaging state ---
  const [inboxMessages, setInboxMessages] = useState({}); // { conversationId: [messages] }
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Set of userIds
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: [userId] }

  // Remove userId from localStorage if not logged in (on app load)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.removeItem("userId");
      setUserId(null);
      if (socketRef.current && lastEmittedUserId.current) {
        socketRef.current.emit("user-offline", { userId: lastEmittedUserId.current });
        lastEmittedUserId.current = null;
      }
    }
  }, []);

  // Logout helper to be used in your app
  const logout = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("user-offline", { userId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    setUserId(null);
    lastEmittedUserId.current = null;
    setSocketConnected(false);
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, [userId]);

  // Setup socket connection and monitor userId changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    // Clean up old socket if exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (!userId || !token) {
      setSocketConnected(false);
      return;
    }
    // Create new socket with latest credentials
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 3,
      reconnectionDelay: 10000,
      reconnectionDelayMax: 20000,
    });
    // On connect, emit user-online
    socketRef.current.on("connect", () => {
      setSocketConnected(true);
      socketRef.current.emit("user-online", { userId });
      lastEmittedUserId.current = userId;
    });
    socketRef.current.on("disconnect", () => {
      setSocketConnected(false);
    });

    socketRef.current.on("receiveMessage", (message) => {
      setInboxMessages(prev => {
        const convId = message.conversationId || message.conversation || message.to || message.from;
        const updated = { ...prev };
        if (!updated[convId]) updated[convId] = [];
        const optimisticIdx = updated[convId].findIndex(m =>
          m.isOptimistic &&
          m.text === message.text &&
          m.from === message.from &&
          m.to === message.to &&
          Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 60000
        );
        if (optimisticIdx !== -1) {
          updated[convId][optimisticIdx] = message;
        } else {
          updated[convId] = [...updated[convId], message];
        }
        return updated;
      });
      setConversations(prev => prev.map(conv =>
        conv._id === (message.conversationId || message.conversation)
          ? { ...conv, lastMessage: message.text, lastTime: formatRelativeTime(Date.now()), lastTimestamp: Date.now(), unreadCount: conv.unreadCount + 1 }
          : conv
      ));
    });

    socketRef.current.on("user-online", ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    });

    socketRef.current.on("user-offline", ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socketRef.current.on("typing", ({ conversationId, userId: typingId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (!updated[conversationId]) updated[conversationId] = [];
        if (!updated[conversationId].includes(typingId)) {
          updated[conversationId].push(typingId);
        }
        return updated;
      });
    });

    socketRef.current.on("stop-typing", ({ conversationId, userId: typingId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (updated[conversationId]) {
          updated[conversationId] = updated[conversationId].filter(id => id !== typingId);
        }
        return updated;
      });
    });

    socketRef.current.on("online-users-list", ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    });

    // Heartbeat: emit user-online every 15 seconds
    const interval = setInterval(() => {
      if (userId && socketConnected && socketRef.current) {
        socketRef.current.emit("user-online", { userId });
      }
    }, 15000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // --- Message send/typing helpers ---
  const sendMessage = useCallback((conversationId, text) => {
    if (!socketRef.current) return;
    console.log("[DashboardContext] sendMessage emit:", { conversationId, text });
    socketRef.current.emit("message", { conversationId, text });
  }, []);

  const sendTyping = useCallback((conversationId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { conversationId });
  }, []);

  const sendStopTyping = useCallback((conversationId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("stop-typing", { conversationId });
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
        
        if ((refresh && offset === 0) && !loadFresh && direction !== 'fresh') {
          setCommunityPosts(prev => {
            const optimisticPosts = prev.filter(post => post.isOptimistic);
            const newPosts = data.posts || [];
            console.log('User-initiated refresh: preserving', optimisticPosts.length, 'optimistic posts');
            return [...optimisticPosts, ...newPosts];
          });
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

  // Fetch following posts
  const fetchFollowingPosts = useCallback(async (refresh = false, offset = 0, direction = 'down', loadFresh = false) => {
    try {
      setLoadingStates(prev => ({ ...prev, followingPosts: offset === 0 ? true : false }));
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
      
      const res = await fetch(`${API_BASE}/posts/following?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setFollowingCyclingInfo(data.cyclingInfo);
        if (refresh || loadFresh || offset === 0 || direction === 'fresh') {
          setFollowingPosts(data.posts || []);
        }
        return data;
      } else {
        console.error('Failed to fetch following posts:', res.status, res.statusText);
        return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
      }
    } catch (error) {
      console.error("Error fetching following posts:", error);
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, followingPosts: false }));
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
    }, 2000); // Changed to 2 seconds
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
  const updatePost = useCallback((postId, updatedData) => {
    React.startTransition(() => {
      setCommunityPosts(prev => 
        prev.map(post => 
          post._id === postId ? { ...post, ...updatedData } : post
        )
      );
      
      setFollowingPosts(prev => 
        prev.map(post => 
          post._id === postId ? { ...post, ...updatedData } : post
        )
      );
    });
  }, []);

  // Delete a post
  const deletePostFromList = useCallback((postId) => {
    setCommunityPosts(prev => prev.filter(post => post._id !== postId));
    setFollowingPosts(prev => prev.filter(post => post._id !== postId));
  }, []);

  // Load initial posts only when the array is empty
  const loadInitialPosts = useCallback(async () => {
    if (initialLoadExecuted.current) {
      console.log('Initial load: skipping duplicate execution (ref)');
      return { posts: communityPosts, hasMore: true, nextOffset: 20 };
    }
    
    if (communityPosts.length > 0) {
      console.log('Initial load: skipping because posts already exist (' + communityPosts.length + ')');
      return { posts: communityPosts, hasMore: true, nextOffset: 20 };
    }
    
    initialLoadExecuted.current = true;
    
    try {
      setLoadingStates(prev => ({ ...prev, posts: true }));
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const timestamp = Date.now();
      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
        scrollDirection: 'down',
        refreshFeed: 'false',
        loadFresh: 'false',
        timestamp: timestamp.toString(),
        cacheBust: Math.random().toString(36)
      });
      
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
        
        setCommunityPosts(prev => {
          if (prev.length === 0) {
            console.log('Initial load: setting', data.posts?.length || 0, 'posts');
            return data.posts || [];
          }
          console.log('Initial load: skipping because posts were added during fetch');
          return prev;
        });
        
        return data;
      }
      return { posts: [], hasMore: false, nextOffset: 0 };
    } catch (error) {
      console.error("Error loading initial posts:", error);
      return { posts: [], hasMore: false, nextOffset: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [communityPosts.length]);

  // Add infinite scroll functions
  const loadMorePosts = useCallback(async (currentOffset) => {
    if (loadingStates.posts) return { hasMore: true, posts: [] };
    
    console.log('loadMorePosts called with offset:', currentOffset);
    setLoadingStates(prev => ({ ...prev, posts: true }));
    
    try {
      const result = await fetchCommunityPosts(false, currentOffset, 'down');
      console.log('fetchCommunityPosts result:', result);
      
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      
      if (result?.posts && result.posts.length > 0 && currentOffset > 0) {
        setCommunityPosts(prev => {
          const existingPostIds = new Set(prev.map(post => post._id));
          const newPosts = result.cyclingInfo?.isRepeatingContent 
            ? result.posts.map(post => ({
                ...post,
                _id: `${post._id}_cycle_${result.cyclingInfo.completedCycles}_${Date.now()}`,
                _originalId: post._id,
                _isCyled: true,
                _cycleNumber: result.cyclingInfo.completedCycles
              }))
            : result.posts.filter(post => !existingPostIds.has(post._id));
          
          console.log('Adding', newPosts.length, 'new posts to feed');
          if (newPosts.length > 0) {
            return [...prev, ...newPosts];
          }
          return prev;
        });
      }
      
      const hasMorePosts = result.hasMore === true || 
                          (result.cyclingInfo?.totalPostsInCycle > 0) || 
                          (result.posts && result.posts.length > 0) ||
                          true;
      
      console.log('loadMorePosts returning hasMore:', hasMorePosts, 'cyclingInfo:', result.cyclingInfo);
      
      return {
        ...result,
        posts: result.posts,
        hasMore: hasMorePosts
      };
    } catch (error) {
      console.error('Error in loadMorePosts:', error);
      return { hasMore: false, posts: [] };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts, loadingStates.posts]);

  // Load more for following posts
  const loadMoreFollowingPosts = useCallback(async (currentOffset) => {
    if (loadingStates.followingPosts) return { hasMore: true, posts: [] };
    setLoadingStates(prev => ({ ...prev, followingPosts: true }));
    try {
      const result = await fetchFollowingPosts(false, currentOffset, 'down');
      if (result?.cyclingInfo) {
        setFollowingCyclingInfo(result.cyclingInfo);
      }
      if (result?.posts && result.posts.length > 0) {
        setFollowingPosts(prev => {
          const existingPostIds = new Set(prev.map(post => post._id));
          const newPosts = result.cyclingInfo?.isRepeatingContent 
            ? result.posts.map(post => ({
                ...post,
                _id: `${post._id}_cycle_${result.cyclingInfo.completedCycles}_${Date.now()}`,
                _originalId: post._id,
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
    } catch (error) {
      console.error("Error loading more following posts:", error);
      return { hasMore: false, posts: [] };
    } finally {
      setLoadingStates(prev => ({ ...prev, followingPosts: false }));
    }
  }, [fetchFollowingPosts, loadingStates.followingPosts]);

  const loadNewerPosts = useCallback(async (forceFresh = false) => {
    const result = await fetchCommunityPosts(true, 0, 'up');
    if (result?.cyclingInfo) {
      setCyclingInfo(result.cyclingInfo);
    }
    if (forceFresh && result?.posts) {
      const freshPosts = result.posts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setCommunityPosts(prev => {
        const optimisticPosts = prev.filter(post => post.isOptimistic);
        return [...optimisticPosts, ...freshPosts];
      });
    }
    return result;
  }, [fetchCommunityPosts]);

  // Enhanced loadFreshContent function
  const loadFreshContent = useCallback(async () => {
    console.log('🔄 loadFreshContent called');
    try {
      setLoadingStates(prev => ({ ...prev, posts: true }));
      const result = await fetchCommunityPosts(false, 0, 'fresh', true);
      console.log('📡 fetchCommunityPosts result:', result);
      
      if (result?.cyclingInfo) {
        setCyclingInfo(result.cyclingInfo);
      }
      
      if (result?.posts && result.posts.length > 0) {
        const sortedFreshPosts = result.posts.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('📝 Sorted fresh posts:', sortedFreshPosts.length);
        
        let trulyNewPostsCount = 0;
        
        setCommunityPosts(prev => {
          console.log('🔧 Current posts before update:', prev.length);
          
          const optimisticPosts = prev.filter(post => post.isOptimistic);
          console.log('✨ Optimistic posts:', optimisticPosts.length);
          
          const existingPosts = prev.filter(post => !post.isOptimistic);
          console.log('📚 Existing posts:', existingPosts.length);
          
          const existingPostIds = new Set(existingPosts.map(post => 
            post._originalId || post._id
          ));
          console.log('🔍 Existing post IDs:', existingPostIds.size);
          
          const trulyNewPosts = sortedFreshPosts.filter(post => 
            !existingPostIds.has(post._id)
          );
          console.log('🆕 Truly new posts found:', trulyNewPosts.length);
          
          trulyNewPostsCount = trulyNewPosts.length;
          
          if (trulyNewPosts.length > 0) {
            const combinedPosts = [...optimisticPosts, ...trulyNewPosts, ...existingPosts];
            console.log(`✅ Added ${trulyNewPosts.length} new posts to top of feed. Total posts: ${combinedPosts.length}`);
            return combinedPosts;
          } else {
            console.log('⏭️ No new posts found, keeping existing feed intact');
            return prev;
          }
        });
        
        const returnValue = {
          ...result,
          freshContentCount: sortedFreshPosts.length,
          trulyNewContentCount: trulyNewPostsCount,
          hasNewContent: trulyNewPostsCount > 0
        };
        console.log('📊 Return value:', returnValue);
        return returnValue;
      } else {
        console.log('❌ No fresh posts available');
        return {
          posts: [],
          hasMore: true,
          nextOffset: 20,
          freshContentCount: 0,
          trulyNewContentCount: 0,
          hasNewContent: false
        };
      }
    } catch (error) {
      console.error("❌ Error loading fresh content:", error);
      return { 
        posts: [], 
        hasMore: true, 
        nextOffset: 20, 
        freshContentCount: 0,
        trulyNewContentCount: 0,
        hasNewContent: false 
      };
    } finally {
      setLoadingStates(prev => ({ ...prev, posts: false }));
    }
  }, [fetchCommunityPosts, communityPosts]);

  // Load newer following posts
  const loadNewerFollowingPosts = useCallback(async (forceFresh = false) => {
    const result = await fetchFollowingPosts(true, 0, 'up');
    if (result?.cyclingInfo) {
      setFollowingCyclingInfo(result.cyclingInfo);
    }
    if (forceFresh && result?.posts) {
      const freshPosts = result.posts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setFollowingPosts(freshPosts);
    }
    return result;
  }, [fetchFollowingPosts]);

  // Load fresh following content
  const loadFreshFollowingContent = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, followingPosts: true }));
      const result = await fetchFollowingPosts(false, 0, 'fresh', true);
      if (result?.cyclingInfo) {
        setFollowingCyclingInfo(result.cyclingInfo);
      }
      if (result?.posts) {
        const sortedFreshPosts = result.posts.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setFollowingPosts(sortedFreshPosts);
      }
      return result;
    } catch (error) {
      console.error("Error loading fresh following content:", error);
      return { posts: [], hasMore: false, nextOffset: 0, freshContentCount: 0 };
    } finally {
      setLoadingStates(prev => ({ ...prev, followingPosts: false }));
    }
  }, [fetchFollowingPosts]);

  // Helper to sync userId from localStorage (call after login/register)
  const syncUserIdFromStorage = useCallback(() => {
    const newUserId = localStorage.getItem("userId");
    setUserId(newUserId);
  }, []);

  // Utility function to deduplicate posts by _id
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

  // Force socket reconnect (for use after login)
  const forceSocketReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  // Robust online status: emit user-online immediately and on heartbeat
  useEffect(() => {
    if (!userId || !socketConnected || !socketRef.current) return;
    socketRef.current.emit("user-online", { userId });
    lastEmittedUserId.current = userId;
    const interval = setInterval(() => {
      socketRef.current.emit("user-online", { userId });
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [userId, socketConnected]);

  // --- Robust socket re-initialization on userId/token change ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    // Clean up old socket if exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (!userId || !token) {
      setSocketConnected(false);
      return;
    }
    // Create new socket with latest credentials
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 3,
      reconnectionDelay: 10000,
      reconnectionDelayMax: 20000,
    });
    // On connect, emit user-online
    socketRef.current.on("connect", () => {
      setSocketConnected(true);
      socketRef.current.emit("user-online", { userId });
      lastEmittedUserId.current = userId;
    });
    socketRef.current.on("disconnect", () => {
      setSocketConnected(false);
    });

    socketRef.current.on("receiveMessage", (message) => {
      setInboxMessages(prev => {
        const convId = message.conversationId || message.conversation || message.to || message.from;
        const updated = { ...prev };
        if (!updated[convId]) updated[convId] = [];
        const optimisticIdx = updated[convId].findIndex(m =>
          m.isOptimistic &&
          m.text === message.text &&
          m.from === message.from &&
          m.to === message.to &&
          Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 60000
        );
        if (optimisticIdx !== -1) {
          updated[convId][optimisticIdx] = message;
        } else {
          updated[convId] = [...updated[convId], message];
        }
        return updated;
      });
      setConversations(prev => prev.map(conv =>
        conv._id === (message.conversationId || message.conversation)
          ? { ...conv, lastMessage: message.text, lastTime: formatRelativeTime(Date.now()), lastTimestamp: Date.now(), unreadCount: conv.unreadCount + 1 }
          : conv
      ));
    });

    socketRef.current.on("user-online", ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    });

    socketRef.current.on("user-offline", ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socketRef.current.on("typing", ({ conversationId, userId: typingId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (!updated[conversationId]) updated[conversationId] = [];
        if (!updated[conversationId].includes(typingId)) {
          updated[conversationId].push(typingId);
        }
        return updated;
      });
    });

    socketRef.current.on("stop-typing", ({ conversationId, userId: typingId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (updated[conversationId]) {
          updated[conversationId] = updated[conversationId].filter(id => id !== typingId);
        }
        return updated;
      });
    });

    socketRef.current.on("online-users-list", ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    });

    // Heartbeat: emit user-online every 15 seconds
    const interval = setInterval(() => {
      if (userId && socketConnected && socketRef.current) {
        socketRef.current.emit("user-online", { userId });
      }
    }, 15000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // Also disconnect socket on logout (userId or token becomes null)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!userId || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
    }
  }, [userId]);

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
    loadInitialPosts,
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
    followingPosts,
    fetchFollowingPosts,
    loadMoreFollowingPosts,
    followingCyclingInfo,
    loadNewerFollowingPosts,
    loadFreshFollowingContent,
    socket: socketRef.current,
    socketConnected,
    inboxMessages,
    setInboxMessages,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    sendStopTyping,
    userId,
    setUserId,
    logout,
    syncUserIdFromStorage,
    forceSocketReconnect,
  }), [
    conversations,
    fetchConversations,
    updateConversation,
    notifications,
    fetchNotifications,
    communityPosts,
    dedupedCommunityPosts,
    fetchCommunityPosts,
    loadInitialPosts,
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
    followingPosts,
    fetchFollowingPosts,
    loadMoreFollowingPosts,
    followingCyclingInfo,
    loadNewerFollowingPosts,
    loadFreshFollowingContent,
    socketConnected,
    inboxMessages,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    sendStopTyping,
    userId,
    logout,
    syncUserIdFromStorage,
    forceSocketReconnect,
  ]);

  // Always sync userId from localStorage and emit online status on mount and when dashboard loads
  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (currentUserId !== userId) {
      setUserId(currentUserId);
    }
    if (socketRef.current && socketConnected && currentUserId && currentUserId !== lastEmittedUserId.current) {
      socketRef.current.emit("user-online", { userId: currentUserId });
      lastEmittedUserId.current = currentUserId;
    }
  }, [socketConnected]);

  // Emit user-online when userId changes and socket is connected
  useEffect(() => {
    if (socketRef.current && socketConnected && userId && userId !== lastEmittedUserId.current) {
      socketRef.current.emit("user-online", { userId });
      lastEmittedUserId.current = userId;
    }
  }, [userId, socketConnected]);

  // Always emit user-online when userId and socket are set
  useEffect(() => {
    if (socketRef.current && socketConnected && userId) {
      socketRef.current.emit("user-online", { userId });
      lastEmittedUserId.current = userId;
    }
  }, [userId, socketConnected]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
