import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { getConversation } from "../../utils/api";
import { debounce } from "lodash";
import { useDashboard } from "../../context/dashboard";
import { Link, useNavigate } from "react-router-dom";
import { startOfWeek } from "date-fns";
import VerifiedBadge from "../../components/VerifiedBadge";
import EmojiPicker from 'emoji-picker-react';
import './emoji-picker-minimalist.css';
import UserStatus from '../../components/UserStatus';
import { getReplyPreview, findMessageById } from '../../utils/replyUtils.jsx';

// Helper to generate a unique conversationId for 1:1 chats
function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join(":");
}

const ChatBox = ({ selectedUser, onBack, myUserId, token }) => {
  if (!selectedUser || !selectedUser._id) return null;

  const {
    inboxMessages,
    sendMessage,
    sendTyping,
    sendStopTyping,
    typingUsers,
    updateConversation,
    onlineUsers,
    sendSeen // <-- Add sendSeen from context
  } = useDashboard();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [messagesFetched, setMessagesFetched] = useState(false);
  const [lastFetchedUser, setLastFetchedUser] = useState(null);
  const [linkPreviews, setLinkPreviews] = useState(new Map());
  const [loadingPreviews, setLoadingPreviews] = useState(new Set());
  const fetchedUrls = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [hasMore, setHasMore] = useState(true);
  const [weekIndex, setWeekIndex] = useState(0);
  const emojiPickerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversationCache, setConversationCache] = useState(new Map());
  const readMessageIdsRef = useRef(new Set());
  const [localSelectedUser, setLocalSelectedUser] = useState(selectedUser);
  const [replyToMessageId, setReplyToMessageId] = useState(null);
  const clearReply = () => setReplyToMessageId(null);
  const navigate = useNavigate();

  // Keep localSelectedUser in sync with selectedUser prop (when switching chats)
  useEffect(() => {
    setLocalSelectedUser(selectedUser);
  }, [selectedUser]);

  // --- Online status for recipient ---
  const isRecipientOnline = useMemo(() => {
    return onlineUsers && selectedUser?._id ? onlineUsers.has(selectedUser._id) : false;
  }, [onlineUsers, selectedUser]);

  // --- Fetch last seen on chat open if recipient is offline ---
  useEffect(() => {
    if (selectedUser && selectedUser._id && !isRecipientOnline) {
      const API_BASE = import.meta.env.VITE_API_URL;
      fetch(`${API_BASE}/user/last-seen/${selectedUser._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          console.log('lastSeen fetch result (on open):', data);
          if (data && data.lastSeen) {
            setLocalSelectedUser(u => {
              if (!u.lastSeen || new Date(data.lastSeen) > new Date(u.lastSeen)) {
                return { ...u, lastSeen: data.lastSeen };
              }
              return u;
            });
          }
        })
        .catch(() => {});
    }
  }, [selectedUser, isRecipientOnline, token]);

  // --- Use context for messages ---
  const conversationId = useMemo(() => {
    if (!selectedUser || !selectedUser._id || !myUserId) return null;
    return getConversationId(myUserId, selectedUser._id);
  }, [selectedUser, myUserId]);

  // Use the same logic as ConversationList to always create a new array for reactivity
  const messages = useMemo(() => {
    if (!conversationId) return [];
    const raw = inboxMessages[conversationId] || [];
    // Always return a new array reference to trigger React updates
    const msgs = [...raw];
    // Remove debug logs
    return msgs;
  }, [inboxMessages, conversationId]);

  // --- Typing indicator from context ---
  const isRecipientTyping = useMemo(() => {
    if (!conversationId || !typingUsers[conversationId]) return false;
    // Show typing if anyone in the conversation except me is typing
    return typingUsers[conversationId].some(id => id !== myUserId);
  }, [typingUsers, conversationId, myUserId]);

  // --- Emoji picker logic ---
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

  // --- Fetch messages from API for history ---
  const { setInboxMessages } = useDashboard();
  const fetchMessages = async (userId, week = 0, prepend = false) => {
    setError(null);
    try {
      const response = await getConversation(userId + '?week=' + week);
      if (!Array.isArray(response)) {
        setError("Failed to fetch messages.");
        setHasMore(false);
        setMessagesFetched(true);
        return;
      }
      if (response.length === 0) setHasMore(false);
      setMessagesFetched(true);
      setLastFetchedUser(userId);
      setInboxMessages(prev => {
        const existing = prev[conversationId] || [];
        let merged;
        if (prepend) {
          merged = [...response, ...existing];
        } else {
          merged = [...response, ...existing.filter(m => !response.some(r => r._id === m._id))];
        }
        return { ...prev, [conversationId]: merged };
      });
    } catch (err) {
      setError("An error occurred while fetching messages.");
      setHasMore(false);
      setMessagesFetched(true);
    }
  };

  // Fetch messages when chat is opened or weekIndex changes
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    fetchMessages(selectedUser._id, weekIndex, weekIndex > 0);
  }, [selectedUser, weekIndex]);

  // --- Scroll to bottom on new messages ---
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [conversationId, messages.length]);

  // --- Typing events ---
  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Always use selectedUser._id as recipientUserId for typing events
    if (e.target.value.trim()) {
      sendTyping(conversationId, selectedUser?._id);
    } else {
      sendStopTyping(conversationId, selectedUser?._id);
    }
  };

  // --- Send message using context ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) {
      return;
    }
    setIsSending(true);
    try {
      // Pass replyToMessageId as metadata
      sendMessage(conversationId, input, selectedUser?._id, { replyTo: replyToMessageId });
      setInput("");
      setIsSending(false);
      setError(null);
      setReplyToMessageId(null); // Clear reply after sending
      sendStopTyping(conversationId, selectedUser?._id);
    } catch (err) {
      setIsSending(false);
      setError("An error occurred while sending the message.");
    }
  };

  // --- Link preview logic ---
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
    }, 500),
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

  // Remove filteredMessages, use messages directly in groupedMessages
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];
    // Sort messages by createdAt ascending to ensure correct order
    const sortedMessages = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const groupedByDate = [];
    let currentDateGroup = null;
    let currentTimeGroup = [];
    let lastSender = null;
    let lastTime = null;
    let lastDate = null;
    sortedMessages.forEach((message, index) => {
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
        isLast: index === sortedMessages.length - 1 ||
          (index < sortedMessages.length - 1 &&
            (sortedMessages[index + 1].from !== message.from ||
              new Date(sortedMessages[index + 1].createdAt).getTime() - messageTime.getTime() > 60000 ||
              new Date(sortedMessages[index + 1].createdAt).toDateString() !== messageTime.toDateString()))
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
    // Remove duplicate date groups (shouldn't happen, but extra safety)
    const uniqueGroups = [];
    const seenTimestamps = new Set();
    for (const group of groupedByDate) {
      if (!seenTimestamps.has(group.timestamp)) {
        uniqueGroups.push(group);
        seenTimestamps.add(group.timestamp);
      }
    }
    return uniqueGroups;
  }, [messages]);

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

  // --- Last seen logic ---
  const lastSeen = localSelectedUser && localSelectedUser.lastSeen ? new Date(localSelectedUser.lastSeen) : null;
  const getLastSeenText = () => {
    if (!lastSeen) return '';
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return lastSeen.toLocaleString();
  };

  // Decrement unreadCount in context as each unread message is read
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    // Find all unread messages sent to me
    const unreadMessages = messages.filter(
      (msg) =>
        msg.to === myUserId &&
        !msg.read
    );
    // Only emit if there are any unread messages
    if (unreadMessages.length > 0 && typeof sendSeen === 'function') {
      const unreadIds = unreadMessages.map(m => m._id);
      sendSeen({ conversationId, to: selectedUser._id, messageIds: unreadIds });
      // Update the ref to prevent duplicate emits for the same messages
      unreadIds.forEach(id => readMessageIdsRef.current.add(id));
      // Update unreadCount in context
      updateConversation(conversationId, (prev) => {
        const current = typeof prev === 'object' && prev !== null ? prev.unreadCount : prev;
        let newCount = current;
        if (typeof current === 'number') {
          newCount = Math.max(0, current - unreadMessages.length);
        }
        return { unreadCount: newCount };
      });
    }
  }, [messages, selectedUser, myUserId, updateConversation, sendSeen, conversationId]);

  const replyToMessage = useMemo(
    () => replyToMessageId ? findMessageById(messages, replyToMessageId) : null,
    [replyToMessageId, messages]
  );

  // --- Swipe-to-reply handlers (mobile) ---
  const touchData = useRef({ x: 0, y: 0, id: null, dragging: false });
  const [draggedMsgId, setDraggedMsgId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragSnapTimeout = useRef(null);

  const handleTouchStart = (e, messageId) => {
    if (e.touches && e.touches.length === 1) {
      touchData.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: messageId, dragging: true };
      setDraggedMsgId(messageId);
      setDragOffset(0);
      if (dragSnapTimeout.current) {
        clearTimeout(dragSnapTimeout.current);
        dragSnapTimeout.current = null;
      }
    }
  };

  const handleTouchMove = (e) => {
    if (!touchData.current.dragging || !touchData.current.id) return;
    const touch = e.touches && e.touches[0];
    if (touch) {
      const dx = touch.clientX - touchData.current.x;
      const dy = Math.abs(touch.clientY - touchData.current.y);
      if (dx > 0 && dy < 30) {
        setDragOffset(Math.min(dx, 80)); // Limit drag distance
        // Animate drag, then trigger reply and snap back
        if (dx > 2 && !dragSnapTimeout.current) {
          setDragOffset(60); // Animate to 60px
          dragSnapTimeout.current = setTimeout(() => {
            setReplyToMessageId(touchData.current.id);
            setDraggedMsgId(null);
            setDragOffset(0);
            touchData.current = { x: 0, y: 0, id: null, dragging: false };
            dragSnapTimeout.current = null;
          }, 150); // 150ms animation
        }
      } else {
        setDragOffset(0);
      }
    }
  };

  const handleTouchEnd = (e) => {
    // If animation is running, let timeout handle reset
    if (dragSnapTimeout.current) return;
    setDraggedMsgId(null);
    setDragOffset(0);
    touchData.current = { x: 0, y: 0, id: null, dragging: false };
  };

  // Detect mobile device
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

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
            <div className="relative">
              <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full cursor-pointer" />
            </div>
          </Link>
          <div className="flex-1 flex flex-col">
            <button
              className="flex items-center hover:underline"
              onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`)}
            >
              <span className="font-semibold text-gray-900 dark:text-white">{selectedUser.username}</span>
              {selectedUser.verified && <VerifiedBadge style={{ height: '1em', width: '1em', verticalAlign: 'middle' }} />}
            </button>
            <UserStatus userId={selectedUser._id} token={token} typing={isRecipientTyping} online={isRecipientOnline} />
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
                      // Find reply message if exists
                      const repliedMsg = message.replyTo ? findMessageById(messages, message.replyTo) : null;
                      return (
                        <div key={message._id} data-message-id={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${message.isFirst ? 'mt-4' : 'mt-1'} w-full group`}>
                          {showAvatar && (
                            <Link to={`/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`} className="hover:opacity-80 transition-opacity">
                              <img src={selectedUser.avatar} alt={selectedUser.username} className="w-6 h-6 rounded-full mr-2 mt-auto cursor-pointer" />
                            </Link>
                          )}
                          {!isOwn && !showAvatar && <div className="w-8" />}
                          <div
                            className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'ml-auto' : 'mr-auto'} ${isOwn ? 'mr-2 sm:mr-4' : 'ml-2 sm:ml-4'} relative`}
                            style={{
                              // For received: leave space on the right, for sent: leave space on the left
                              marginRight: isOwn ? '0' : '20%',
                              marginLeft: isOwn ? '20%' : '0',
                              // Prevent full width on either side
                              width: 'fit-content',
                              minWidth: '0',
                              maxWidth: '90vw',
                              transform: isMobile && draggedMsgId === message._id && dragOffset > 0 ? `translateX(${dragOffset}px)` : undefined,
                              transition: isMobile && draggedMsgId === message._id && dragOffset === 0 ? 'transform 0.2s cubic-bezier(.4,2,.6,1)' : undefined,
                              zIndex: isMobile && draggedMsgId === message._id ? 2 : undefined,
                            }}
                            onTouchStart={isMobile ? (e) => handleTouchStart(e, message._id) : undefined}
                            onTouchMove={isMobile ? handleTouchMove : undefined}
                            onTouchEnd={isMobile ? handleTouchEnd : undefined}
                          >
                            <div className="relative">
                              {/* Reply button, only show on non-mobile */}
                              {!isMobile && (
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600 p-1 z-10"
                                  onClick={() => setReplyToMessageId(message._id)}
                                  title="Reply"
                                  style={{ background: 'transparent', fontSize: '1.25rem', lineHeight: 1, transform: 'rotate(90deg)' }}
                                >
                                  {'>'}
                                </button>
                              )}
                              <div
                                className={`px-4 py-2 text-sm break-words relative whatsapp-bubble ${isOwn ? 'sent' : 'received'} ${isOwn ? message.failed ? 'bg-red-500 text-white' : message.isOptimistic ? 'bg-blue-400 text-white opacity-80' : 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                                style={{
                                  borderRadius: '0.45em', // All corners equally less round
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  minWidth: '40px',
                                  maxWidth: '100%',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {/* Reply preview in bubble (INSIDE the bubble, not above) */}
                                {repliedMsg && (
                                  <div className="mb-1">
                                    <div
                                      className="flex items-stretch overflow-hidden"
                                      style={{
                                        background: isOwn ? '#205c4a' : '#232d3b',
                                        borderRadius: '0.35em',
                                      }}
                                    >
                                      <div
                                        className="w-1"
                                        style={{
                                          background: '#a99d6b',
                                          borderRadius: '0.25em',
                                        }}
                                      />
                                      <div className="flex-1 min-w-0 py-1 pl-2 pr-3">
                                        <div className="text-xs font-semibold" style={{ color: '#a99d6b' }}>
                                          {repliedMsg.from === myUserId ? 'You' : selectedUser.username}
                                        </div>
                                        <div className="text-xs text-white whitespace-pre-line break-words">
                                          {repliedMsg.text}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {/* Main message text */}
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
        {isRecipientTyping && (
          <div className="flex items-center pl-4 pb-1">
            <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1" style={{ backgroundColor: '#a99d6b', animationDelay: '0ms' }}></span>
            <span className="inline-block w-2 h-2 rounded-full animate-bounce mr-1" style={{ backgroundColor: '#a99d6b', animationDelay: '150ms' }}></span>
            <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#a99d6b', animationDelay: '300ms' }}></span>
          </div>
        )}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-full max-w-full !w-full !max-w-full">
          <form onSubmit={handleSendMessage} className="p-4">
            {/* Reply preview above input */}
            {replyToMessage && (
              <div className="mb-2 relative">
                {/* X button above the reply highlight */}
                <button
                  type="button"
                  onClick={clearReply}
                  className="absolute -top-2 right-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white dark:bg-gray-900 rounded-full shadow p-0.5 z-10"
                  style={{ fontSize: '1.1em', lineHeight: 1 }}
                  aria-label="Cancel reply"
                >
                  ✕
                </button>
                <div>
                  {/* Add padding to username and message in reply preview */}
                  <div style={{ padding: '0.4em 0' }}>
                    {(() => {
                      // Truncate reply message to first 5 words with ... if too long
                      const msg = replyToMessage?.text || '';
                      const words = msg.trim().split(/\s+/);
                      const truncated = words.length > 5 ? words.slice(0, 5).join(' ') + '...' : msg;
                      return getReplyPreview(
                        { ...replyToMessage, text: truncated },
                        { [replyToMessage.from]: { username: replyToMessage.from === myUserId ? 'You' : selectedUser.username } },
                        replyToMessage.from === myUserId
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
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
                  onChange={handleInputChange}
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

// Helper functions should be above export default
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []);
  console.log('Selected files:', files);
};

const handleRetryMessage = (message) => {
  console.log('Retrying message:', message);
};

