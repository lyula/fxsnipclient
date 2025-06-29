import React, { useState, useEffect, useRef } from "react";
import { useDashboard } from "../../context/dashboard";
import { useNavigate, useSearchParams } from "react-router-dom";
import VerifiedBadge from "../../components/VerifiedBadge";
import { getConversation, sendMessage } from "../../utils/api";
import { jwtDecode } from "jwt-decode";

const Inbox = () => {
  // Context and navigation
  const { 
    conversations, 
    fetchConversations, 
    addMessageOptimistically, 
    updateMessage, 
    markMessageFailed, 
    updateConversation,
    formatRelativeTime
  } = useDashboard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Component state
  const [selectedUser, setSelectedUser] = useState(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [newMessageAlert, setNewMessageAlert] = useState(null); // { count: number, show: boolean }
  
  // Track when user last opened each conversation (for unread indicator)
  const [lastOpenedTimestamp, setLastOpenedTimestamp] = useState({});
  
  // Refs
  const messagesContainerRef = useRef(null);
  const intervalRef = useRef(null);
  const debouncedFetchMessages = useRef(null);
  
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

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle URL parameters
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam && conversations.length > 0) {
      const user = conversations.find(c => c.username === decodeURIComponent(chatParam));
      if (user && (!selectedUser || selectedUser._id !== user._id)) {
        setSelectedUser(user);
      }
    } else if (!chatParam && selectedUser) {
      // Clear selected user if no chat param
      setSelectedUser(null);
    }
  }, [searchParams, conversations, selectedUser]);

  // Search functionality
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
          /\/auth$/,
          ""
        );
        const res = await fetch(`${API_BASE}/user/search?q=${encodeURIComponent(search)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.users || []).map((u) => ({
              _id: u._id,
              username: u.username,
              avatar: u.countryFlag
                ? u.countryFlag
                : "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.username),
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

  // Function to fetch messages from database
  const fetchMessagesFromDB = async (conversationId, showLoading = false) => {
    if (!conversationId) return;
    
    // Only show loading spinner when explicitly requested
    if (showLoading) {
      setIsLoadingMessages(true);
    }
    
    setError(null);
    
    try {
      console.log("Fetching messages for conversation:", conversationId);
      const freshMessages = await getConversation(conversationId);
      console.log("Received messages:", freshMessages);
      
      // Handle different response formats
      let messagesArray = [];
      if (Array.isArray(freshMessages)) {
        messagesArray = freshMessages;
      } else if (freshMessages && Array.isArray(freshMessages.messages)) {
        messagesArray = freshMessages.messages;
      } else if (freshMessages && Array.isArray(freshMessages.data)) {
        messagesArray = freshMessages.data;
      } else {
        console.warn("Unexpected response format:", freshMessages);
        messagesArray = [];
      }
      
      // Check if there are new messages from other users
      const currentMessageCount = messagesArray.length;
      const hasNewMessages = currentMessageCount > lastMessageCount;
      
      // If there are new messages, check if any are from other users
      if (hasNewMessages && lastMessageCount > 0) {
        const newMessages = messagesArray.slice(lastMessageCount);
        const newMessagesFromOthers = newMessages.filter(msg => msg.from !== myUserId);
        
        if (newMessagesFromOthers.length > 0) {
          // Show new message alert
          setNewMessageAlert({
            count: newMessagesFromOthers.length,
            show: true
          });
          
          // Hide alert after 3 seconds
          setTimeout(() => {
            setNewMessageAlert(prev => prev ? { ...prev, show: false } : null);
          }, 3000);
          
          // Show brief loading for new messages from others
          setIsLoadingMessages(true);
          setTimeout(() => setIsLoadingMessages(false), 300);
        }
      }
      
      setMessages(messagesArray);
      setLastMessageCount(currentMessageCount);
      
      if (showLoading || hasNewMessages) {
        setShouldScrollToBottom(true);
      }
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
      if (showLoading) {
        setMessages([]);
      }
    } finally {
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }
  };

  // Load messages when user is selected and set up polling
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      const conversationId = selectedUser._id;
      const now = Date.now();
      
      // Mark this conversation as opened now
      setLastOpenedTimestamp(prev => ({
        ...prev,
        [conversationId]: now
      }));
      
      // Clear any existing interval and debounced calls
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (debouncedFetchMessages.current) {
        clearTimeout(debouncedFetchMessages.current);
      }
      
      // Clear previous messages and error
      setMessages([]);
      setError(null);
      setLastMessageCount(0);
      setNewMessageAlert(null);
      
      // Check if this conversation has unread messages
      const conversation = conversations.find(c => c._id === conversationId);
      if (conversation && conversation.unreadCount > 0) {
        // Show initial unread message alert
        setNewMessageAlert({
          count: conversation.unreadCount,
          show: true
        });
        
        // Hide after 4 seconds for initial unread messages
        setTimeout(() => {
          setNewMessageAlert(prev => prev ? { ...prev, show: false } : null);
        }, 4000);
      }
      
      // Fetch messages immediately (initial load with spinner)
      fetchMessagesFromDB(conversationId, true);
      
      // Set up smarter polling - only if window is focused
      const startPolling = () => {
        intervalRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchMessagesFromDB(conversationId, false);
          }
        }, 15000);
      };

      startPolling();

      // Pause polling when window is not visible, resume when visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          if (!intervalRef.current) {
            startPolling();
          }
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup function should also remove the event listener
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (debouncedFetchMessages.current) {
          clearTimeout(debouncedFetchMessages.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Clear messages and stop polling when no user is selected
      setMessages([]);
      setIsLoadingMessages(false);
      setError(null);
      setLastMessageCount(0);
      setNewMessageAlert(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup interval on unmount or user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedUser, conversations]);

  // Handle scrolling after messages are rendered
  useEffect(() => {
    if (messagesContainerRef.current && shouldScrollToBottom) {
      // Scroll to bottom immediately without animation
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  // Optimistic message sending
  const handleSend = async (e) => {
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

    // Clear input and add optimistic message
    setInput("");
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      setLastMessageCount(newMessages.length); // Update count immediately
      return newMessages;
    });
    
    // Smooth scroll for new messages
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 50);

    setIsSending(true);

    // Update conversation list optimistically
    updateConversation(selectedUser._id, {
      lastMessage: messageText,
      lastTime: formatRelativeTime(now.getTime()),
      lastTimestamp: now.getTime()
    });

    try {
      // Send actual message
      const newMsg = await sendMessage(selectedUser._id, messageText);
      
      if (newMsg && (newMsg.text || newMsg.message)) {
        // Update optimistic message with real message
        const realMessage = {
          ...newMsg,
          text: newMsg.text || newMsg.message
        };
        
        setMessages(prev => prev.map(msg => 
          msg._id === tempId ? realMessage : msg
        ));

        // Update conversation list with real timestamp
        updateConversation(selectedUser._id, {
          lastMessage: realMessage.text,
          lastTime: formatRelativeTime(new Date(realMessage.createdAt).getTime()),
          lastTimestamp: new Date(realMessage.createdAt).getTime()
        });

        // Force refresh messages after successful send (without spinner)
        setTimeout(() => {
          fetchMessagesFromDB(selectedUser._id, false);
        }, 1000);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, failed: true, isOptimistic: false } : msg
      ));
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (message) => {
    if (isSending) return;
    
    // Remove failed flag
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

        // Force refresh messages after successful retry (without spinner)
        setTimeout(() => {
          fetchMessagesFromDB(selectedUser._id, false);
        }, 1000);
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
  };

  // Manual refresh function
  const handleRefresh = () => {
    if (selectedUser?._id) {
      fetchMessagesFromDB(selectedUser._id, true);
    }
  };

  // Group messages by date and add unread indicator
  const groupedMessages = (() => {
    if (!messages.length) return [];

    const conversationId = selectedUser?._id;
    const openedTimestamp = lastOpenedTimestamp[conversationId];
    let unreadSectionShown = false;
    
    const grouped = [];
    let currentDate = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      // Add date divider if needed
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        let label = "";
        if (messageDate === today.toDateString()) {
          label = "Today";
        } else if (messageDate === yesterday.toDateString()) {
          label = "Yesterday";
        } else {
          const msgDate = new Date(messageDate);
          label = `${String(msgDate.getDate()).padStart(2, "0")}/${String(msgDate.getMonth() + 1).padStart(2, "0")}/${String(msgDate.getFullYear()).slice(-2)}`;
        }
        
        grouped.push({
          type: "date",
          label
        });
      }

      // Check if we should show unread indicator
      // Only show for messages from other users that arrived after the conversation was last opened
      const messageTimestamp = new Date(message.createdAt).getTime();
      const shouldShowUnread = !unreadSectionShown && 
                              message.from !== myUserId && 
                              openedTimestamp && 
                              messageTimestamp > openedTimestamp;

      if (shouldShowUnread) {
        unreadSectionShown = true;
        grouped.push({
          type: "unread",
          label: "Unread Messages"
        });
      }

      // Determine if this is the first message in a group
      const isFirstInGroup = index === 0 || 
        messages[index - 1].from !== message.from ||
        (new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()) > 300000; // 5 minutes

      grouped.push({
        type: "message",
        msg: message,
        isFirstInGroup
      });
    });

    return grouped;
  })();

  const truncateWords = (text, wordCount) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(" ") + "...";
  };

  // Show loading state only if no cached data
  if (!conversations.length) {
    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-2">Loading conversations...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no user selected, show chat list
  if (!selectedUser) {
    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
        </div>
        
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 relative">
          <input
            className="w-full rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && searchResults.length > 0 && (
            <ul className="absolute left-4 right-4 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <li
                  key={user.username}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  onClick={() => {
                    const fullUser = conversations.find(u => u._id === user._id) || user;
                    setSelectedUser(fullUser);
                    navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                    setSearch("");
                  }}
                >
                  <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center">
                    {user.username}
                    {user.verified && <VerifiedBadge />}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {search && searchResults.length === 0 && (
            <div className="absolute left-4 right-4 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 p-3 text-xs text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-sm">Start a conversation to see it here</p>
              </div>
            </div>
          ) : (
            conversations.map((user) => (
              <button
                key={user._id}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition relative"
                onClick={async () => {
                  const fullUser = conversations.find(u => u._id === user._id) || user;
                  setSelectedUser(fullUser);
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                  updateConversation(user._id, { unreadCount: 0 });
                }}
              >
                <div className="relative">
                  <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full" />
                  {user.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {user.unreadCount > 9 ? '9+' : user.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-gray-900 dark:text-white flex items-center gap-1 ${user.unreadCount > 0 ? "font-bold" : "font-medium"}`}>
                    <span className="truncate">{user.username}</span>
                    {user.verified && <VerifiedBadge />}
                  </div>
                  <div
                    className={`text-sm truncate ${
                      user.unreadCount > 0
                        ? "font-medium text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {truncateWords(user.lastMessage, 10)}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {user.lastTime}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Chat view (chatbox style)
  if (selectedUser) {
    return (
      <div className="w-full h-screen flex flex-col bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-30">
          <button
            onClick={() => {
              setSelectedUser(null);
              setMessages([]);
              navigate("/dashboard/inbox", { replace: true });
            }}
            className="mr-2 text-blue-600 dark:text-blue-400 font-bold text-lg px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition"
          >
            ←
          </button>
          <img
            src={selectedUser.avatar}
            alt={selectedUser.username}
            className="w-10 h-10 rounded-full"
          />
          <span
            className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b] flex items-center cursor-pointer hover:underline"
            onClick={() =>
              navigate(
                `/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`,
                {
                  state: {
                    fromInbox: true,
                    chatUsername: selectedUser.username,
                  },
                }
              )
            }
            title="View public profile"
          >
            {selectedUser.username}
            {selectedUser.verified && <VerifiedBadge />}
          </span>
          
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="ml-auto text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 p-2 rounded transition"
            title="Refresh messages"
            disabled={isLoadingMessages}
          >
            <svg className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto no-scrollbar px-4 py-3"
          >
            <style>
              {`
                .no-scrollbar {
                  scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            
            {/* Error message */}
            {error && (
              <div className="text-center py-4">
                <div className="inline-block px-4 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-sm rounded-lg">
                  {error}
                  <button 
                    onClick={handleRefresh}
                    className="ml-2 underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
            
            {/* No messages state */}
            {!isLoadingMessages && !error && messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </div>
              </div>
            )}
            
            <div>
              {groupedMessages.map((item, idx) => {
                if (item.type === "date") {
                  return (
                    <div
                      key={`date-${idx}`}
                      className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 my-4"
                    >
                      <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        {item.label}
                      </span>
                    </div>
                  );
                }
                
                if (item.type === "unread") {
                  return (
                    <div key={`unread-${idx}`} className="text-center text-xs font-semibold text-red-500 dark:text-red-400 my-4">
                      <span className="bg-red-100 dark:bg-red-900 px-3 py-1 rounded-full">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`msg-${idx}`}
                    className={`flex ${
                      item.msg.from === myUserId ? "justify-end" : "justify-start"
                    } ${item.isFirstInGroup ? "mt-4" : "mt-1"} mb-2 flex-col`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow-sm relative ${
                        item.msg.from === myUserId
                          ? `${item.msg.failed 
                              ? "bg-red-500 text-white border border-red-600" 
                              : item.msg.isOptimistic 
                                ? "bg-blue-400 text-white border border-blue-500 opacity-80"
                                : "bg-blue-600 text-white border border-blue-700"
                        } rounded-br-none`
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-300 dark:border-gray-600"
                      } ${item.msg.from === myUserId ? "ml-auto" : "mr-auto"}`}
                    >
                      <div>{item.msg.text}</div>
                      {item.msg.failed && (
                        <button
                          onClick={() => handleRetry(item.msg)}
                          className="text-xs underline mt-1 hover:no-underline"
                          disabled={isSending}
                        >
                          Tap to retry
                        </button>
                      )}
                      <div className={`text-xs mt-1 ${item.msg.from === myUserId ? "text-blue-100" : "text-gray-400"}`}>
                        {new Date(item.msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1 text-[10px]">
                      {item.msg.from === myUserId && !item.msg.failed && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                            item.msg.isOptimistic
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
                              : item.msg.read
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
                          }`}
                        >
                          {item.msg.isOptimistic ? "Sending..." : item.msg.read ? "Seen" : "Delivered"}
                        </span>
                      )}
                      {item.msg.failed && (
                        <span className="inline-block px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-300 dark:border-red-700">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating loading spinner - no background */}
        {isLoadingMessages && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        )}

        {/* New message alert - floating above input */}
        {newMessageAlert && newMessageAlert.show && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              {newMessageAlert.count === 1 ? "New message" : `${newMessageAlert.count} new messages`}
            </div>
          </div>
        )}

        {/* Message input form */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <input
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            disabled={isSending}
          />
          <button
            type="submit"
            className={`font-bold px-4 py-2 rounded-full transition ${
              isSending || !input.trim()
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            disabled={isSending || !input.trim()}
          >
            {isSending ? "..." : "Send"}
          </button>
        </form>

        <style jsx>{`
          @keyframes fade-in {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default Inbox;