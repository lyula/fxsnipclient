import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDashboard } from "../../context/dashboard";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import VerifiedBadge from "../../components/VerifiedBadge";
import { getConversation, sendMessage } from "../../utils/api";
import { jwtDecode } from "jwt-decode";

const Inbox = () => {
  // Context and navigation
  const { 
    conversations, 
    fetchConversations, 
    updateConversation,
    formatRelativeTime,
    setIsMobileChatOpen
  } = useDashboard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Core state
  const [selectedUser, setSelectedUser] = useState(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  
  // Refs
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Get user ID from token
  const token = localStorage.getItem("token");
  let myUserId = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      myUserId = decoded.id || decoded._id || decoded.userId || "";
    } catch (e) {
      myUserId = "";
    }
  }

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      const scrollOptions = {
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      };
      messagesContainerRef.current.scrollTo(scrollOptions);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle URL parameters for deep linking
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam && conversations.length > 0) {
      const user = conversations.find(c => c.username === decodeURIComponent(chatParam));
      if (user && (!selectedUser || selectedUser._id !== user._id)) {
        setSelectedUser(user);
        // Hide header on mobile when chat is selected
        if (window.innerWidth < 768) {
          setIsMobileChatOpen(true);
        }
      }
    } else if (!chatParam && selectedUser) {
      setSelectedUser(null);
      // Show header when no chat is selected
      setIsMobileChatOpen(false);
    }
  }, [searchParams, conversations, selectedUser, setIsMobileChatOpen]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      // If screen becomes desktop size, always show header
      if (window.innerWidth >= 768) {
        setIsMobileChatOpen(false);
      } else if (selectedUser) {
        // If screen becomes mobile and chat is open, hide header
        setIsMobileChatOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedUser, setIsMobileChatOpen]);

  // Debounced search functionality
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
        const res = await fetch(`${API_BASE}/user/search?q=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: controller.signal,
        });
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.users || []).map((u) => ({
              _id: u._id,
              username: u.username,
              avatar: u.countryFlag || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`,
              verified: u.verified || false,
            }))
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSearchResults([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  // Fetch messages from database (simple one-time fetch)
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    
    setError(null);
    
    try {
      console.log("Fetching messages for conversation:", conversationId);
      const freshMessages = await getConversation(conversationId);
      let messagesArray = [];
      
      if (Array.isArray(freshMessages)) {
        messagesArray = freshMessages;
      } else if (freshMessages?.messages) {
        messagesArray = freshMessages.messages;
      } else if (freshMessages?.data) {
        messagesArray = freshMessages.data;
      }
      
      console.log("Fetched messages:", messagesArray);
      setMessages(messagesArray);

      // Update conversation with the actual last message from the fetched messages
      if (messagesArray.length > 0) {
        const lastMessage = messagesArray[messagesArray.length - 1];
        updateConversation(conversationId, {
          lastMessage: lastMessage.text || lastMessage.message || "",
          lastTime: formatRelativeTime(new Date(lastMessage.createdAt).getTime()),
          lastTimestamp: new Date(lastMessage.createdAt).getTime()
        });
      }
      
      // Scroll to bottom after messages load
      setTimeout(() => scrollToBottom(false), 100);
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
      setMessages([]);
    }
  }, [scrollToBottom, updateConversation, formatRelativeTime]);

  // Load messages when user is selected (one-time fetch only)
  useEffect(() => {
    if (selectedUser?._id) {
      setMessages([]);
      setError(null);
      
      // Mark conversation as read
      updateConversation(selectedUser._id, { unreadCount: 0 });
      
      // Fetch messages once
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser, fetchMessages, updateConversation]);

  // Message sending with optimistic updates
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser?._id || isSending) return;

    const messageText = input.trim();
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    
    // Create optimistic message
    const optimisticMessage = {
      _id: tempId,
      text: messageText,
      from: myUserId,
      to: selectedUser._id,
      createdAt: now.toISOString(),
      read: false,
      isOptimistic: true,
      failed: false
    };

    // Clear input and add message
    setInput("");
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    // Auto scroll to bottom
    setTimeout(() => scrollToBottom(true), 50);

    // Update conversation list with the message I just sent
    updateConversation(selectedUser._id, {
      lastMessage: messageText,
      lastTime: formatRelativeTime(now.getTime()),
      lastTimestamp: now.getTime()
    });

    try {
      const newMsg = await sendMessage(selectedUser._id, messageText);
      
      if (newMsg && (newMsg.text || newMsg.message)) {
        const realMessage = {
          ...newMsg,
          text: newMsg.text || newMsg.message
        };
        
        setMessages(prev => prev.map(msg => 
          msg._id === tempId ? realMessage : msg
        ));

        // Update conversation list with the real message
        updateConversation(selectedUser._id, {
          lastMessage: realMessage.text,
          lastTime: formatRelativeTime(new Date(realMessage.createdAt).getTime()),
          lastTimestamp: new Date(realMessage.createdAt).getTime()
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, failed: true, isOptimistic: false } : msg
      ));
    } finally {
      setIsSending(false);
    }
  }, [input, selectedUser, myUserId, isSending, scrollToBottom, updateConversation, formatRelativeTime]);

  // Retry failed message
  const handleRetryMessage = useCallback(async (message) => {
    if (isSending) return;
    
    setMessages(prev => prev.map(msg => 
      msg._id === message._id ? { ...msg, failed: false, isOptimistic: true } : msg
    ));
    setIsSending(true);

    try {
      const newMsg = await sendMessage(selectedUser._id, message.text);
      
      if (newMsg && (newMsg.text || newMsg.message)) {
        const realMessage = {
          ...newMsg,
          text: newMsg.text || newMsg.message
        };
        
        setMessages(prev => prev.map(msg => 
          msg._id === message._id ? realMessage : msg
        ));

        // Update conversation list with the retried message
        updateConversation(selectedUser._id, {
          lastMessage: realMessage.text,
          lastTime: formatRelativeTime(new Date(realMessage.createdAt).getTime()),
          lastTimestamp: new Date(realMessage.createdAt).getTime()
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Retry error:", error);
      setMessages(prev => prev.map(msg => 
  msg._id === message._id ? { ...msg, failed: true, isOptimistic: false } : msg
));
    } finally {
      setIsSending(false);
    }
  }, [selectedUser, isSending, updateConversation, formatRelativeTime]);

  // Handle back to conversations (mobile)
  const handleBackToConversations = useCallback(() => {
    setSelectedUser(null);
    navigate("/dashboard/inbox", { replace: true });
    setIsMobileChatOpen(false); // Show header when going back
  }, [navigate, setIsMobileChatOpen]);

  // Add cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      setIsMobileChatOpen(false);
    };
  }, [setIsMobileChatOpen]);

  // Format date for chat separators
  const formatDateSeparator = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to midnight for accurate comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "Month Day, Year" for older dates
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }, []);

  // Group messages by date and time
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];

    const groupedByDate = [];
    let currentDateGroup = null;
    let currentTimeGroup = [];
    let lastSender = null;
    let lastTime = null;
    let lastDate = null;

    messages.forEach((message, index) => {
      const messageTime = new Date(message.createdAt);
      const messageDate = new Date(messageTime.getFullYear(), messageTime.getMonth(), messageTime.getDate());
      
      // Check if we need a new date group
      if (!lastDate || messageDate.getTime() !== lastDate.getTime()) {
        // Save previous time group if exists
        if (currentTimeGroup.length > 0) {
          currentDateGroup.messages.push(currentTimeGroup);
          currentTimeGroup = [];
        }
        
        // Save previous date group if exists
        if (currentDateGroup) {
          groupedByDate.push(currentDateGroup);
        }
        
        // Create new date group
        currentDateGroup = {
          date: formatDateSeparator(messageTime),
          timestamp: messageDate.getTime(),
          messages: []
        };
        
        lastDate = messageDate;
        lastSender = null; // Reset sender for new date
        lastTime = null;
      }

      // Check if we need a new time group (same logic as before)
      const timeDiff = lastTime ? messageTime.getTime() - lastTime.getTime() : 0;
      const shouldGroup = message.from === lastSender && timeDiff < 60000; // 1 minute

      if (!shouldGroup && currentTimeGroup.length > 0) {
        currentDateGroup.messages.push(currentTimeGroup);
        currentTimeGroup = [];
      }

      currentTimeGroup.push({
        ...message,
        isFirst: !shouldGroup || currentTimeGroup.length === 0,
        isLast: index === messages.length - 1 || 
                (index < messages.length - 1 && 
                 (messages[index + 1].from !== message.from || 
                  new Date(messages[index + 1].createdAt).getTime() - messageTime.getTime() > 60000 ||
                  new Date(messages[index + 1].createdAt).toDateString() !== messageTime.toDateString()))
      });

      lastSender = message.from;
      lastTime = messageTime;
    });

    // Don't forget the last groups
    if (currentTimeGroup.length > 0) {
      currentDateGroup.messages.push(currentTimeGroup);
    }
    if (currentDateGroup) {
      groupedByDate.push(currentDateGroup);
    }

    return groupedByDate;
  }, [messages, formatDateSeparator]);

  // Format time (Instagram style)
  const formatMessageTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  }, []);

  // New function to format exact time (e.g., 3:45 PM)
  const formatExactTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  // Truncate message preview (mobile responsive)
  const truncateMessage = useCallback((text, isMobile = false) => {
    if (!text) return "";
    const maxLength = isMobile ? 30 : 50;
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }, []);

  // Loading state
  if (!conversations.length) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex bg-white dark:bg-gray-900 ${selectedUser ? 'fixed inset-0 lg:relative lg:inset-auto' : ''}`}>
      {/* Sidebar - Conversation List */}
      <div className={`${selectedUser ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-700`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 relative">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Search Results */}
          {search && searchResults.length > 0 && (
            <div className="absolute top-full left-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10 hide-scrollbar">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {/* Clickable avatar */}
                  <Link 
                    to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
                    className="hover:opacity-80 transition-opacity mr-3"
                  >
                    <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full cursor-pointer" />
                  </Link>
                  
                  {/* Username area - clickable to start chat */}
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      setSelectedUser(user);
                      navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                      setSearch("");
                    }}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                      {user.verified && <VerifiedBadge />}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Start a conversation to see it here</p>
            </div>
          ) : (
            conversations.map((user) => (
              <button
                key={user._id}
                className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                  selectedUser?._id === user._id ? 'bg-gray-50 dark:bg-gray-800' : ''
                }`}
                onClick={() => {
                  setSelectedUser(user);
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                }}
              >
                <div className="relative mr-3">
                  {user.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10">
                      {user.unreadCount > 9 ? '9+' : user.unreadCount}
                    </div>
                  )}
                  <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className={`font-medium truncate ${user.unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                        {user.username}
                      </span>
                      {user.verified && <VerifiedBadge />}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {user.lastTime}
                    </span>
                  </div>
                  <div className={`text-sm truncate ${user.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {truncateMessage(user.lastMessage, window.innerWidth < 768)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedUser ? (
        <div className={`flex-1 flex flex-col ${selectedUser ? 'fixed inset-0 lg:relative lg:inset-auto' : ''}`}>
          {/* Chat Header - ENHANCED FOR MOBILE */}
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {/* Back button for mobile */}
            <button
              className="lg:hidden mr-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleBackToConversations}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Clickable avatar */}
            <Link 
              to={`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`}
              className="hover:opacity-80 transition-opacity mr-3"
            >
              <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full cursor-pointer" />
            </Link>
            
            <div className="flex-1">
              <button
                className="flex items-center hover:underline"
                onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`)}
              >
                <span className="font-semibold text-gray-900 dark:text-white">{selectedUser.username}</span>
                {selectedUser.verified && <VerifiedBadge />}
              </button>
            </div>

            {/* Chat Actions */}
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden relative">
            <div
              ref={messagesContainerRef}
              className="h-full overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar"
            >
              {error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">{error}</p>
                    <button
                      onClick={() => fetchMessages(selectedUser._id)}
                      className="text-blue-500 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No messages yet. Say hello!</p>
                  </div>
                </div>
              ) : (
                groupedMessages.map((dateGroup, dateIndex) => (
                  <div key={dateGroup.timestamp} className="space-y-4">
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {dateGroup.date}
                        </span>
                      </div>
                    </div>
                    
                    {/* Messages for this date */}
                    {dateGroup.messages.map((group, groupIndex) => (
                      <div key={`${dateGroup.timestamp}-${groupIndex}`} className="space-y-1">
                        {group.map((message, messageIndex) => {
                          const isOwn = message.from === myUserId;
                          const showAvatar = !isOwn && message.isFirst;
                          const showTime = message.isLast;

                          return (
                            <div
                              key={message._id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                                message.isFirst ? 'mt-4' : 'mt-1'
                              }`}
                            >
                              {/* Avatar */}
                              {showAvatar && (
                                <Link 
    to={`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`}
    className="hover:opacity-80 transition-opacity"
  >
    <img
      src={selectedUser.avatar}
      alt={selectedUser.username}
      className="w-6 h-6 rounded-full mr-2 mt-auto cursor-pointer"
    />
  </Link>
                              )}
                              {!isOwn && !showAvatar && <div className="w-8" />}

                              {/* Message Bubble */}
                              <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
                                <div
                                  className={`px-4 py-2 rounded-2xl text-sm break-words ${
                                    isOwn
                                      ? message.failed
                                        ? 'bg-red-500 text-white'
                                        : message.isOptimistic
                                        ? 'bg-blue-400 text-white opacity-80'
                                        : 'bg-blue-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                  } ${
                                    isOwn
                                      ? message.isFirst && message.isLast
                                        ? 'rounded-2xl'
                                        : message.isFirst
                                        ? 'rounded-br-md'
                                        : message.isLast
                                        ? 'rounded-tr-md'
                                        : 'rounded-r-md'
                                      : message.isFirst && message.isLast
                                      ? 'rounded-2xl'
                                      : message.isFirst
                                      ? 'rounded-bl-md'
                                      : message.isLast
                                      ? 'rounded-tl-md'
                                      : 'rounded-l-md'
                                  }`}
                                >
                                  {/* Message Text */}
                                  <div className="mb-1">
                                    {message.text}
                                  </div>
                                  
                                  {/* Exact Time inside bubble */}
                                  <div className={`text-xs ${
                                    isOwn 
                                      ? 'text-blue-100 dark:text-blue-200' 
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {formatExactTime(message.createdAt)}
                                  </div>
                                  
                                  {/* Retry button for failed messages */}
                                  {message.failed && (
                                    <button
                                      onClick={() => handleRetryMessage(message)}
                                      className="block mt-2 text-xs underline hover:no-underline"
                                      disabled={isSending}
                                    >
                                      Tap to retry
                                    </button>
                                  )}
                                </div>

                                {/* Message status below bubble */}
                                <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 ${
                                  isOwn ? 'justify-end' : 'justify-start'
                                }`}>
                                  {isOwn && !message.failed && (
                                    <span>
                                      {message.isOptimistic ? (
                                        <span className="text-gray-400">sending...</span>
                                      ) : message.read ? (
                                        <span className="text-blue-500">seen</span>
                                      ) : (
                                        <span className="text-gray-400">delivered</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <form onSubmit={handleSendMessage} className="p-4">
              <div className="flex items-end space-x-3">
                {/* Attachment button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    // Handle file selection
                    const files = Array.from(e.target.files || []);
                    console.log('Selected files:', files);
                    // You can implement file upload logic here
                  }}
                />

                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message..."
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={isSending}
                    maxLength={1000}
                  />
                </div>

                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => {
                    // Focus input and trigger emoji keyboard on mobile
                    if (inputRef.current) {
                      inputRef.current.focus();
                      // On mobile devices, this will show the emoji keyboard
                      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        inputRef.current.setAttribute('inputmode', 'text');
                        inputRef.current.click();
                      }
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className={`p-2 rounded-full transition ${
                    input.trim() && !isSending
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSending ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* No chat selected - Desktop view */
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center">
            <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Your Messages</h2>
            <p className="text-gray-500 dark:text-gray-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;