import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import VerifiedBadge from "../../components/VerifiedBadge";
import { useDashboard } from "../../context/dashboard";
import { getProfileImages } from '../../utils/api';

// Utility to truncate message preview
const truncateMessage = (text, isMobile = false) => {
  if (!text) return "";
  const maxLength = isMobile ? 30 : 50;
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Animated typing dots component
const TypingDots = () => (
  <span style={{ color: '#a99d6b', display: 'inline-flex', alignItems: 'center' }}>
    Typing
    <span className="typing-dots ml-1" style={{ display: 'inline-block', width: 18 }}>
      <span style={{ animation: 'blink 1s infinite', opacity: 1 }}>.</span>
      <span style={{ animation: 'blink 1s infinite 0.2s', opacity: 1 }}>.</span>
      <span style={{ animation: 'blink 1s infinite 0.4s', opacity: 1 }}>.</span>
    </span>
    <style>{`
      @keyframes blink {
        0%, 80%, 100% { opacity: 1; }
        40% { opacity: 0.2; }
      }
    `}</style>
  </span>
);

const ConversationList = ({ selectedUser, onSelect }) => {
  const { conversations: rawConversations, fetchConversations, updateConversation, onlineUsers, typingUsers, userId, getConversationId } = useDashboard();
  const [localConversations, setLocalConversations] = useState([]);
  const [profileImages, setProfileImages] = useState({});
  const [zoomImg, setZoomImg] = useState(null);
  const conversations = Array.isArray(localConversations.length ? localConversations : rawConversations) ? (localConversations.length ? localConversations : rawConversations) : [];
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (rawConversations.length === 0) fetchConversations();
    else setLocalConversations(rawConversations);
  }, [rawConversations, fetchConversations]);

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
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.username)}`,
              verified: u.verified || false,
            }))
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") setSearchResults([]);
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  // Fetch profile images for all conversation users
  useEffect(() => {
    const users = (localConversations.length ? localConversations : rawConversations).filter(Boolean);
    if (!users.length) return;
    const userIds = users.map(u => u._id).filter(Boolean);
    if (!userIds.length) return;
    getProfileImages({ userIds }).then(res => {
      if (res && res.images) {
        setProfileImages(res.images);
      }
    }).catch((err) => {
      setProfileImages({});
    });
  }, [localConversations, rawConversations]);

  useEffect(() => {
    if (zoomImg) {
      const handleEsc = (e) => {
        if (e.key === 'Escape') setZoomImg(null);
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [zoomImg]);

  // Handle conversation selection: update URL and call onSelect
  const handleSelect = (user) => {
    // Optimistically set unreadCount to 0 for this conversation (local)
    setLocalConversations(prev => prev.map(u => u && u._id === user._id ? { ...u, unreadCount: 0 } : u));
    // Also update the global context so the navbar badge updates instantly
    updateConversation(user._id, { unreadCount: 0 });
    // Try to find the full conversation user object
    const fullUser = conversations.find(
      (u) => u && (u._id === user._id || u.username === user.username)
    );
    navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
    onSelect(fullUser || user);
  };

  let hasLogged = false;
  conversations.filter(Boolean).map((user, idx) => {
    if (!user || !user._id) return null;
    // Use global onlineUsers Set for online status
    const isOnline = onlineUsers && onlineUsers.has ? onlineUsers.has(user._id) : false;
    // Typing indicator logic
    let showTyping = false;
    let conversationId = null;
    if (userId && user._id) {
      conversationId = getConversationId(userId, user._id);
      const typingArr = typingUsers && typingUsers[conversationId];
      // Show typing if someone else (not me) is typing in this conversation
      showTyping = Array.isArray(typingArr) && typingArr.some(id => id !== userId);
    }
    return (
      <button
        key={user._id}
        className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 ${
          selectedUser && selectedUser._id === user._id ? 'bg-gray-50 dark:bg-gray-800' : ''
        }`}
        onClick={() => handleSelect(user)}
      >
        <div className="relative mr-3">
          {/* Online dot */}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full z-20"></span>
          )}
          {user.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10">
              {user.unreadCount > 99 ? '99+' : user.unreadCount}
            </div>
          )}
          <img
            src={profileImages[user._id] || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`}
            alt={user.username}
            className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
            onError={e => {
              e.target.onerror = null;
              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`;
            }}
          />
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
            {showTyping ? <TypingDots /> : truncateMessage(user.lastMessage || '', window.innerWidth < 768)}
          </div>
        </div>
      </button>
    );
  });

  return (
    <>
      {/* Zoomed Profile Image Modal */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 cursor-zoom-out"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="Profile Zoom"
            className="w-80 h-80 rounded-full shadow-2xl border-4 border-white dark:border-gray-800 object-cover"
            style={{ objectFit: 'cover' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white w-full">Messages</h1>
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="relative px-4 sm:px-6 py-4 w-full">
        <div className="relative w-full">
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
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10 hide-scrollbar">
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
                    onSelect(user);
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
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
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
          conversations.filter(Boolean).map((user) => {
            if (!user || !user._id) return null;
            // Use global onlineUsers Set for online status
            const isOnline = onlineUsers && onlineUsers.has ? onlineUsers.has(user._id) : false;
            // Typing indicator logic
            let showTyping = false;
            let conversationId = null;
            if (userId && user._id) {
              conversationId = getConversationId(userId, user._id);
              const typingArr = typingUsers && typingUsers[conversationId];
              // Show typing if someone else (not me) is typing in this conversation
              showTyping = Array.isArray(typingArr) && typingArr.some(id => id !== userId);
            }
            return (
              <button
                key={user._id}
                className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 ${
                  selectedUser && selectedUser._id === user._id ? 'bg-gray-50 dark:bg-gray-800' : ''
                }`}
                onClick={() => handleSelect(user)}
              >
                <div className="relative mr-3 group">
                  {/* Online dot */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full z-20"></span>
                  )}
                  {user.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10">
                      {user.unreadCount > 99 ? '99+' : user.unreadCount}
                    </div>
                  )}
                  <img
                    src={profileImages[user._id] || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700 cursor-zoom-in group-hover:ring-2 group-hover:ring-blue-400"
                    onClick={e => {
                      e.stopPropagation();
                      setZoomImg(profileImages[user._id] || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`);
                    }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`;
                    }}
                  />
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
                    {showTyping ? <TypingDots /> : truncateMessage(user.lastMessage || '', window.innerWidth < 768)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
};

export default ConversationList;
