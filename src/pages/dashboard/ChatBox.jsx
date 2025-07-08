import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getConversation, sendMessage } from "../../utils/api";
import { debounce } from "lodash";
import { io } from "socket.io-client";
import useUserStatus from "../../hooks/useUserStatus";
import UserStatus from "../../components/UserStatus";
import { useDashboard } from "../../context/dashboard";
import { Link } from "react-router-dom";
import { startOfWeek, subWeeks, format } from "date-fns";
import VerifiedBadge from "../../components/VerifiedBadge";

const ChatBox = ({ selectedUser, onBack, myUserId, token }) => {
  const { updateConversation } = useDashboard();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [messagesFetched, setMessagesFetched] = useState(false);
  const [lastFetchedUser, setLastFetchedUser] = useState(null);
  const [messagesCache, setMessagesCache] = useState(new Map());
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState(new Map());
  const [linkPreviews, setLinkPreviews] = useState(new Map());
  const [loadingPreviews, setLoadingPreviews] = useState(new Set());
  const fetchedUrls = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const recipientStatus = useUserStatus(selectedUser ? selectedUser._id : null, token);

  // Pagination state for weekly messages
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [hasMore, setHasMore] = useState(true);
  // Weekly pagination state
  const [weekIndex, setWeekIndex] = useState(0);

  // Fetch conversation messages when selectedUser changes
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    setMessages([]); // Clear messages immediately on user change
    setMessagesFetched(false);
    setError(null);
    fetchMessages(selectedUser._id);
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io();
    socketRef.current.connect();

    // Join the user's room
    if (selectedUser) {
      socketRef.current.emit("joinRoom", { userId: myUserId, targetId: selectedUser._id });
    }

    // Listen for incoming messages
    socketRef.current.on("receiveMessage", (message) => {
      if (message.from === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [selectedUser, myUserId]);

  // Fetch messages for a given week index
  const fetchMessages = async (userId, week = 0, prepend = false) => {
    setError(null);
    try {
      const response = await getConversation(userId + '?week=' + week);
      if (!Array.isArray(response)) {
        setError("Failed to fetch messages.");
        setMessages([]);
        setHasMore(false);
        setMessagesFetched(true);
        return;
      }
      if (response.length === 0) setHasMore(false);
      setMessages((prev) => prepend ? [...response, ...prev] : response);
      setMessagesFetched(true);
      setLastFetchedUser(userId);
    } catch (err) {
      setError("An error occurred while fetching messages.");
      setMessages([]);
      setHasMore(false);
      setMessagesFetched(true);
    }
  };

  // On user or weekIndex change, fetch messages
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    setMessagesFetched(false);
    setError(null);
    setHasMore(true);
    if (weekIndex === 0) {
      fetchMessages(selectedUser._id, 0, false);
    } else {
      fetchMessages(selectedUser._id, weekIndex, true);
    }
    // eslint-disable-next-line
  }, [selectedUser, weekIndex]);

  // Load previous week
  const loadPreviousWeek = () => {
    if (!selectedUser || !selectedUser._id) return;
    const prevWeek = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(prevWeek);
    fetchMessages(selectedUser._id, prevWeek);
  };

  // When selectedUser or week changes, fetch messages
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    setMessagesFetched(false);
    setError(null);
    setHasMore(true);
    fetchMessages(selectedUser._id, currentWeekStart);
    // eslint-disable-next-line
  }, [selectedUser, currentWeekStart]);

  // Ref to track if we are prepending messages (loading older)
  const isPrependingRef = useRef(false);
  const anchorMessageIdRef = useRef(null);

  // Infinite scroll: load previous week when scrolled to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let loading = false;
    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore && !loading) {
        loading = true;
        // Mark that we are prepending and capture anchor message id
        isPrependingRef.current = true;
        // Find the first visible message's id
        const firstVisible = container.querySelector('[data-message-id]');
        anchorMessageIdRef.current = firstVisible ? firstVisible.getAttribute('data-message-id') : null;
        setWeekIndex((prev) => prev + 1);
        // loading will be reset after scroll adjustment
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, selectedUser && selectedUser._id, messages.length]);

  // Adjust scroll after prepending messages
  useEffect(() => {
    if (isPrependingRef.current && messagesContainerRef.current) {
      const anchorId = anchorMessageIdRef.current;
      if (anchorId) {
        const anchorNode = messagesContainerRef.current.querySelector(`[data-message-id="${anchorId}"]`);
        if (anchorNode) {
          anchorNode.scrollIntoView({ block: 'start' });
        }
      }
      isPrependingRef.current = false;
      anchorMessageIdRef.current = null;
    }
  }, [messages]);

  // Reset weekIndex when user changes
  useEffect(() => {
    setWeekIndex(0);
  }, [selectedUser && selectedUser._id]);

  // Send a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || !selectedUser._id) return;

    const tempId = `optimistic-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticMessage = {
      _id: tempId,
      from: myUserId,
      to: selectedUser._id,
      text: input,
      createdAt: now,
      isOptimistic: true
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendMessage(selectedUser._id, input);
      if (response && response._id) {
        setIsSending(false);
        setError(null); // Clear error on success
        if (response.conversation) {
          updateConversation(response.conversation);
        } else {
          console.warn('No conversation object in sendMessage response:', response);
        }
        // Replace the optimistic message in-place with the real message
        setMessages((prev) => prev.map((msg) =>
          msg._id === tempId ? { ...response, isOptimistic: false } : msg
        ));
        // Scroll to bottom after sending
        if (messagesContainerRef.current) {
          setTimeout(() => {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }, 100);
        }
      } else {
        setIsSending(false);
        setError("Failed to send message.");
        // Only mark as failed if there is no _id (true failure)
        setMessages((prev) => prev.map((msg) =>
          msg._id === tempId ? { ...msg, failed: true, isOptimistic: false } : msg
        ));
        console.error('Send message error:', response); // Log error response
      }
    } catch (err) {
      setIsSending(false);
      setError("An error occurred while sending the message.");
      // Mark optimistic message as failed
      setMessages((prev) => prev.map((msg) =>
        msg._id === tempId ? { ...msg, failed: true, isOptimistic: false } : msg
      ));
      console.error('Send message exception:', err); // Log exception
    }
  };

  // Debounced function to fetch link previews
  const fetchLinkPreview = useCallback(
    debounce(async (url) => {
      if (fetchedUrls.current.has(url)) return;
      fetchedUrls.current.add(url);

      setLoadingPreviews((prev) => new Set([...prev, url]));
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.success) {
          setLinkPreviews((prev) => new Map(prev).set(url, data.preview));
        }
      } catch (err) {
        console.error("Failed to fetch link preview:", err);
      } finally {
        setLoadingPreviews((prev) => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
      }
    }),
    []
  );

  // Effect to handle link preview fetching
  useEffect(() => {
    const urls = new Set();
    messages.forEach((msg) => {
      const foundUrls = msg.text.match(/https?:\/\/[^\s]+/g);
      if (foundUrls) {
        foundUrls.forEach((url) => {
          if (!fetchedUrls.current.has(url)) {
            urls.add(url);
          }
        });
      }
    });

    if (urls.size > 0) {
      urls.forEach((url) => {
        fetchLinkPreview(url);
      });
    }
  }, [messages, fetchLinkPreview]);

  // Filter messages to only those between myUserId and selectedUser
  const filteredMessages = useMemo(() =>
    selectedUser && selectedUser._id
      ? messages.filter(
          (msg) =>
            (msg.from === myUserId && msg.to === selectedUser._id) ||
            (msg.from === selectedUser._id && msg.to === myUserId)
        )
      : [],
    [messages, myUserId, selectedUser && selectedUser._id]
  );

  // Group messages by date and time for rendering
  const groupedMessages = useMemo(() => {
    if (!filteredMessages.length) return [];
    const groupedByDate = [];
    let currentDateGroup = null;
    let currentTimeGroup = [];
    let lastSender = null;
    let lastTime = null;
    let lastDate = null;
    filteredMessages.forEach((message, index) => {
      const messageTime = new Date(message.createdAt);
      const messageDate = new Date(messageTime.getFullYear(), messageTime.getMonth(), messageTime.getDate());
      if (!lastDate || messageDate.getTime() !== lastDate.getTime()) {
        if (currentTimeGroup.length > 0) {
          currentDateGroup.messages.push(currentTimeGroup);
          currentTimeGroup = [];
        }
        if (currentDateGroup) {
          groupedByDate.push(currentDateGroup);
        }
        currentDateGroup = {
          date: messageDate.toLocaleDateString(),
          timestamp: messageDate.getTime(),
          messages: []
        };
        lastDate = messageDate;
        lastSender = null;
        lastTime = null;
      }
      const timeDiff = lastTime ? messageTime.getTime() - lastTime.getTime() : 0;
      const shouldGroup = message.from === lastSender && timeDiff < 60000;
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
    if (currentTimeGroup.length > 0) {
      currentDateGroup.messages.push(currentTimeGroup);
    }
    if (currentDateGroup) {
      groupedByDate.push(currentDateGroup);
    }
    return groupedByDate;
  }, [filteredMessages]);

  // Utility to render message text with clickable links and previews
  const renderMessageWithLinksAndPreviews = (text, isOwn, messageId) => {
    if (!text) return { textContent: text, urls: [] };
    const urlRegex = /(https?:\/\/(?:[-\w.])+(:\d+)?(?:\/[\w\/_\-.]*)*(?:\?[\w&=%.]*)?(?:#[\w.]+)?)|(?:www\.(?:[-\w.])+(:\d+)?(?:\/[\w\/_\-.]*)*(?:\?[\w&=%.]*)?(?:#[\w.]+)?)/gi;
    const parts = text.split(urlRegex).filter(Boolean);
    const urls = [];
    parts.forEach((part) => {
      urlRegex.lastIndex = 0;
      if (urlRegex.test(part)) {
        let href = part;
        if (part.toLowerCase().startsWith('www.')) {
          href = `https://${part}`;
        }
        urls.push(href);
      }
    });
    const textContent = parts.map((part, index) => {
      urlRegex.lastIndex = 0;
      if (urlRegex.test(part)) {
        let href = part;
        let displayText = part;
        if (part.toLowerCase().startsWith('www.')) {
          href = `https://${part}`;
        }
        if (displayText.length > 50) {
          displayText = displayText.substring(0, 47) + '...';
        }
        return (
          <a
            key={`${messageId}-link-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={part}
            className={`underline hover:no-underline transition-all duration-200 break-all font-medium ${
              isOwn
                ? 'text-blue-100 hover:text-white'
                : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {displayText}
          </a>
        );
      }
      return part;
    });
    return { textContent, urls };
  };

  // Utility to format exact time (e.g., 3:45 PM)
  const formatExactTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Utility to get chat date label: Today, Yesterday, or formatted date
  const getChatDateLabel = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Only render if a user is selected
  if (!selectedUser || !selectedUser._id) return null;

  return (
    <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-full">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Back button for mobile */}
        <button
          className="lg:hidden mr-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onBack}
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
        <div className="flex-1 flex flex-col">
          <button
            className="flex items-center hover:underline"
            onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`)}
          >
            <span className="font-semibold text-gray-900 dark:text-white">{selectedUser.username}</span>
            {selectedUser.verified && <VerifiedBadge style={{ height: '1em', width: '1em', verticalAlign: 'middle' }} />}
          </button>
          <UserStatus userId={selectedUser._id} token={localStorage.getItem("token") || ""} />
        </div>
      </div>

      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 space-y-4 hide-scrollbar">
        {/* Error and empty states */}
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <button onClick={() => fetchMessages(selectedUser && selectedUser._id, currentWeekStart)} className="text-blue-500 hover:underline">Try again</button>
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
              <div className="flex items-center justify-center my-2 select-none">
                <hr className="flex-grow border-t border-gray-300 dark:border-gray-600 mx-2" />
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full shadow-sm">
                  {getChatDateLabel(dateGroup.timestamp)}
                </span>
                <hr className="flex-grow border-t border-gray-300 dark:border-gray-600 mx-2" />
              </div>
              {/* Messages for this date */}
              {dateGroup.messages.map((group, groupIndex) => (
                <div key={`${dateGroup.timestamp}-${groupIndex}`} className="space-y-1">
                  {group.map((message, messageIndex) => {
                    const isOwn = message.from === myUserId;
                    const showAvatar = !isOwn && message.isFirst;
                    const showTime = message.isLast;
                    return (
                      <div key={message._id} data-message-id={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${message.isFirst ? 'mt-4' : 'mt-1'}`}>
                        {/* Avatar */}
                        {showAvatar && (
                          <Link to={`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`} className="hover:opacity-80 transition-opacity">
                            <img src={selectedUser.avatar} alt={selectedUser.username} className="w-6 h-6 rounded-full mr-2 mt-auto cursor-pointer" />
                          </Link>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        {/* Message Bubble */}
                        <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
                          <div className={`px-4 py-2 rounded-2xl text-sm break-words ${isOwn ? message.failed ? 'bg-red-500 text-white' : message.isOptimistic ? 'bg-blue-400 text-white opacity-80' : 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} ${isOwn ? message.isFirst && message.isLast ? 'rounded-2xl' : message.isFirst ? 'rounded-br-md' : message.isLast ? 'rounded-tr-md' : 'rounded-r-md' : message.isFirst && message.isLast ? 'rounded-2xl' : message.isFirst ? 'rounded-bl-md' : message.isLast ? 'rounded-tl-md' : 'rounded-l-md'}`}>
                            {/* Message Text with Context-Aware Clickable Links */}
                            <div className="mb-1">
                              {(() => {
                                const { textContent, urls } = renderMessageWithLinksAndPreviews(message.text, isOwn, message._id);
                                return (
                                  <>
                                    <div className="mb-1">{textContent}</div>
                                    {urls.map((url, index) => (
                                      <span key={`${message._id}-${index}-${url}`}>{url}</span>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                            {/* Exact Time inside bubble */}
                            <div className={`text-xs ${isOwn ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{formatExactTime(message.createdAt)}</div>
                            {/* Retry button for failed messages */}
                            {message.failed && (
                              <button onClick={() => handleRetryMessage(message)} className="block mt-2 text-xs underline hover:no-underline" disabled={isSending}>Tap to retry</button>
                            )}
                          </div>
                          {/* Message status below bubble */}
                          <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
      {/* Typing dots above input */}
      {recipientStatus && recipientStatus.typing && (
        <div className="flex items-center pl-4 pb-1">
          <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1 bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '0ms' }}></span>
          <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1 bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '150ms' }}></span>
          <span className="inline-block w-2 h-2 rounded-full animate-bounce bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '300ms' }}></span>
        </div>
      )}
      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex items-end space-x-3">
            {/* Attachment button */}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {/* Message input */}
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full px-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 dark:text-white"
                placeholder="Type a message..."
                disabled={isSending}
              />
            </div>
            {/* Send button */}
            <button type="submit" disabled={!input.trim() || isSending} className={`p-2 rounded-full transition ${input.trim() && !isSending ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-400 cursor-not-allowed'}`}>
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
          {/* Hidden file input for attachments */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </form>
      </div>
    </div>
  );
};

export default ChatBox;

// Handle file selection for attachments
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []);
  console.log('Selected files:', files);
  // You can implement upload logic here if needed
};
