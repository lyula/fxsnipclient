import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getConversation, sendMessage } from "../../utils/api";
import { debounce } from "lodash";
import { io } from "socket.io-client";
import useUserStatus from "../../hooks/useUserStatus";
import UserStatus from "../../components/UserStatus";
import { useDashboard } from "../../context/dashboard";
import { Link } from "react-router-dom";
import { startOfWeek, subWeeks } from "date-fns";
import VerifiedBadge from "../../components/VerifiedBadge";
import EmojiPicker from 'emoji-picker-react';
import './emoji-picker-minimalist.css';

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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [hasMore, setHasMore] = useState(true);
  const [weekIndex, setWeekIndex] = useState(0);
  const emojiPickerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversationCache, setConversationCache] = useState(new Map());

  // Track which messages have been marked as read
  const readMessageIdsRef = useRef(new Set());

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest('.emoji-picker-trigger')
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    setMessages([]);
    setMessagesFetched(false);
    setError(null);
    const cached = conversationCache.get(selectedUser._id);
    if (cached) {
      setMessages(cached);
      setMessagesFetched(true);
    } else {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    if (messagesFetched && messages.length > 0) {
      setConversationCache(prev => {
        const newCache = new Map(prev);
        newCache.set(selectedUser._id, messages);
        return newCache;
      });
    }
  }, [messagesFetched, messages, selectedUser]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 0);
    }
  }, [selectedUser && selectedUser._id, messages.length]);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });
    socketRef.current.connect();
    if (selectedUser) {
      socketRef.current.emit("joinRoom", { userId: myUserId, targetId: selectedUser._id });
    }
    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prev) => {
        // Try to find an optimistic message to replace
        const optimisticIndex = prev.findIndex(
          (msg) =>
            msg.isOptimistic &&
            msg.text === message.text &&
            msg.from === message.from &&
            msg.to === message.to
        );
        if (optimisticIndex !== -1) {
          const newMessages = [...prev];
          newMessages[optimisticIndex] = message;
          return newMessages;
        }
        return [...prev, message];
      });
      // If the message is from someone else, update the conversation context
      if (message.from !== myUserId) {
        updateConversation(message.from, (prev) => {
          // If the chat is not currently open, increment unreadCount
          const isChatOpen = selectedUser && selectedUser._id === message.from;
          let unreadCount = prev && typeof prev.unreadCount === 'number' ? prev.unreadCount : 0;
          if (!isChatOpen) unreadCount += 1;
          return {
            lastMessage: message.text,
            lastTime: new Date(message.createdAt).toISOString(),
            unreadCount,
          };
        });
      }
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, [selectedUser, myUserId, updateConversation]);

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
  }, [selectedUser, weekIndex]);

  const loadPreviousWeek = () => {
    if (!selectedUser || !selectedUser._id) return;
    const prevWeek = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(prevWeek);
    fetchMessages(selectedUser._id, prevWeek);
  };

  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    setMessagesFetched(false);
    setError(null);
    setHasMore(true);
    fetchMessages(selectedUser._id, currentWeekStart);
  }, [selectedUser, currentWeekStart]);

  const isPrependingRef = useRef(false);
  const anchorMessageIdRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let loading = false;
    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore && !loading) {
        loading = true;
        isPrependingRef.current = true;
        const firstVisible = container.querySelector('[data-message-id]');
        anchorMessageIdRef.current = firstVisible ? firstVisible.getAttribute('data-message-id') : null;
        setWeekIndex((prev) => prev + 1);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, selectedUser && selectedUser._id, messages.length]);

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

  useEffect(() => {
    setWeekIndex(0);
  }, [selectedUser && selectedUser._id]);

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
      // Log before emit
      console.log("[ChatBox] Emitting sendMessage", { to: selectedUser._id, text: input });
      if (socketRef.current) {
        socketRef.current.emit("sendMessage", { to: selectedUser._id, text: input }, (ack) => {
          // Log ack from server
          console.log("[ChatBox] sendMessage ack:", ack);
        });
      } else {
        console.error("[ChatBox] socketRef.current is null");
      }
      setIsSending(false);
      setError(null);
    } catch (err) {
      setIsSending(false);
      setError("An error occurred while sending the message.");
      setMessages((prev) => prev.map((msg) =>
        msg._id === tempId ? { ...msg, failed: true, isOptimistic: false } : msg
      ));
      console.error('[ChatBox] Send message exception:', err);
    }
  };

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

  const renderMessageWithLinksAndPreviews = (text, isOwn, messageId) => {
    if (!text) return { textContent: text, urls: [] };
    const urlRegex = /(https?:\/\/(?:[-\w.])+(:\d+)?(?:\/[\w\/_\-.]*)*(?:\?[\w&=%.]*)?(?:#[\w.]+)?)|(?:www\.(?:[-\w.])+(:\d+)?(?:\/[\w\/_\-.]*)*(?:\?[\w&=%.]*)?(?:#[\w.]+)?)/gi;
    const parts = text.split(urlRegex).filter(Boolean); // Declare parts with const
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

  const formatExactTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

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

  if (!selectedUser || !selectedUser._id) return null;

  const handleEmojiClick = (emojiData, event) => {
    const emoji = emojiData.emoji;
    const inputElem = inputRef.current;
    if (!inputElem) return;
    const start = inputElem.selectionStart;
    const end = inputElem.selectionEnd;
    const newValue = input.slice(0, start) + emoji + input.slice(end);
    setInput(newValue);
    setTimeout(() => {
      inputElem.focus();
      inputElem.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // Decrement unreadCount in context as each unread message is read
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    // Find unread messages (to me, not read, not already marked)
    const unreadMessages = messages.filter(
      (msg) =>
        msg.to === myUserId &&
        !msg.read &&
        !readMessageIdsRef.current.has(msg._id)
    );
    if (unreadMessages.length > 0) {
      // Mark these as read locally
      unreadMessages.forEach((msg) => readMessageIdsRef.current.add(msg._id));
      // Decrement unreadCount in context for each message
      updateConversation(selectedUser._id, (prev) => {
        const current = typeof prev === 'object' && prev !== null ? prev.unreadCount : prev;
        let newCount = current;
        if (typeof current === 'number') {
          newCount = Math.max(0, current - unreadMessages.length);
        }
        return { unreadCount: newCount };
      });
    }
  }, [messages, selectedUser, myUserId, updateConversation]);

  return (
    <>
      <div style={{ display: 'none' }}>
        <EmojiPicker
          onEmojiClick={() => {}}
          theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
          searchDisabled={false}
          skinTonesDisabled={true}
          previewConfig={{ showPreview: false }}
          height={320}
          width={320}
          lazyLoadEmojis={false}
          emojiStyle="native"
          className="emoji-picker-minimalist"
          autoFocusSearch={false}
        />
      </div>
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-full w-full max-w-full !w-full !max-w-full">
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-full max-w-full !w-full !max-w-full">
          <button
            className="lg:hidden mr-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onBack}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
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
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-y-contain w-full max-w-full !w-full !max-w-full !px-0 py-4 space-y-4 hide-scrollbar">
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
                <div className="flex items-center justify-center my-2 select-none">
                  <hr className="flex-grow border-t border-gray-300 dark:border-gray-600 mx-2" />
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full shadow-sm">
                    {getChatDateLabel(dateGroup.timestamp)}
                  </span>
                  <hr className="flex-grow border-t border-gray-300 dark:border-gray-600 mx-2" />
                </div>
                {dateGroup.messages.map((group, groupIndex) => (
                  <div key={`${dateGroup.timestamp}-${groupIndex}`} className="space-y-1">
                    {group.map((message, messageIndex) => {
                      const isOwn = message.from === myUserId;
                      const showAvatar = !isOwn && message.isFirst;
                      const showTime = message.isLast;
                      return (
                        <div key={message._id} data-message-id={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${message.isFirst ? 'mt-4' : 'mt-1'} w-full`}>
                          {showAvatar && (
                            <Link to={`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`} className="hover:opacity-80 transition-opacity">
                              <img src={selectedUser.avatar} alt={selectedUser.username} className="w-6 h-6 rounded-full mr-2 mt-auto cursor-pointer" />
                            </Link>
                          )}
                          {!isOwn && !showAvatar && <div className="w-8" />}
                          <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'ml-auto' : 'mr-auto'} ${isOwn ? 'mr-2 sm:mr-4' : 'ml-2 sm:ml-4'}`}>
                            <div className={`px-4 py-2 rounded-2xl text-sm break-words ${isOwn ? message.failed ? 'bg-red-500 text-white' : message.isOptimistic ? 'bg-blue-400 text-white opacity-80' : 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} ${isOwn ? message.isFirst && message.isLast ? 'rounded-2xl' : message.isFirst ? 'rounded-br-md' : message.isLast ? 'rounded-tr-md' : 'rounded-r-md' : message.isFirst && message.isLast ? 'rounded-2xl' : message.isFirst ? 'rounded-bl-md' : message.isLast ? 'rounded-tl-md' : 'rounded-l-md'}`}>
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
                              <div className={`text-xs ${isOwn ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {formatExactTime(message.createdAt)}
                              </div>
                              {message.failed && (
                                <button onClick={() => handleRetryMessage(message)} className="block mt-2 text-xs underline hover:no-underline" disabled={isSending}>Tap to retry</button>
                              )}
                            </div>
                            <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 ${isOwn ? 'justify-end' : 'justify-start'} ${isOwn ? 'mr-2 sm:mr-4' : 'ml-2 sm:ml-4'}`}>
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
        {recipientStatus && recipientStatus.typing && (
          <div className="flex items-center pl-4 pb-1">
            <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1 bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '0ms' }}></span>
            <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1 bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '150ms' }}></span>
            <span className="inline-block w-2 h-2 rounded-full animate-bounce bg-blue-500 dark:bg-blue-300" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-full max-w-full !w-full !max-w-full">
          <form onSubmit={handleSendMessage} className="p-4">
            <div className="flex items-end space-x-3 relative">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="3" strokeWidth="2" stroke="currentColor" />
                  <circle cx="8.5" cy="12.5" r="1.5" strokeWidth="2" stroke="currentColor" />
                  <path d="M21 15l-5-5-4 4-7-7" strokeWidth="2" stroke="currentColor" />
                </svg>
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 dark:text-white pr-10"
                  placeholder="Type a message..."
                  disabled={isSending}
                  onFocus={() => setShowEmojiPicker(false)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 focus:outline-none"
                  tabIndex={-1}
                  aria-label="Record voice note"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="2" width="6" height="12" rx="3" strokeWidth="2" stroke="currentColor" />
                    <path d="M5 10v2a7 7 0 0014 0v-2" strokeWidth="2" stroke="currentColor" />
                    <line x1="12" y1="22" x2="12" y2="18" strokeWidth="2" stroke="currentColor" />
                  </svg>
                </button>
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute left-1/2 -translate-x-1/2 bottom-12 z-20 emoji-picker-minimalist-wrapper"
                    style={{ minWidth: 320 }}
                  >
                    <button
                      className="absolute top-2 right-2 z-30 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 18, lineHeight: 1, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={() => setShowEmojiPicker(false)}
                      aria-label="Close emoji picker"
                      type="button"
                    >
                      ×
                    </button>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      searchDisabled={false}
                      skinTonesDisabled={true}
                      previewConfig={{ showPreview: false }}
                      height={320}
                      width={320}
                      lazyLoadEmojis={false}
                      emojiStyle="native"
                      className="emoji-picker-minimalist"
                      autoFocusSearch={false}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 emoji-picker-trigger"
                tabIndex={-1}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" />
                  <path d="M8 15s1.5 2 4 2 4-2 4-2" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
              </button>
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
    </>
  );
};

export default ChatBox;

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []);
  console.log('Selected files:', files);
};