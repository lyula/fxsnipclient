import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaWhatsapp, FaTelegramPlane, FaTwitter, FaFacebook, FaLinkedin, FaRedditAlien, FaSnapchatGhost, FaInstagram, FaShareAlt, FaUser, FaGripLines } from "react-icons/fa";
import VerifiedBadge from "./VerifiedBadge";

const SOCIAL_APPS = [
  {
    name: "WhatsApp",
    icon: <FaWhatsapp className="text-green-500" size={28} />,
    getShareUrl: (link) => `https://wa.me/?text=${encodeURIComponent(link)}`,
    mobileScheme: "whatsapp://",
  },
  {
    name: "Telegram",
    icon: <FaTelegramPlane className="text-blue-400" size={28} />,
    getShareUrl: (link) => `https://t.me/share/url?url=${encodeURIComponent(link)}`,
    mobileScheme: "tg://",
  },
  {
    name: "Twitter",
    icon: <FaTwitter className="text-blue-500" size={28} />,
    getShareUrl: (link) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`,
  },
  {
    name: "Facebook",
    icon: <FaFacebook className="text-blue-700" size={28} />,
    getShareUrl: (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    name: "LinkedIn",
    icon: <FaLinkedin className="text-blue-800" size={28} />,
    getShareUrl: (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
  {
    name: "Snapchat",
    icon: <FaSnapchatGhost className="text-yellow-400" size={28} />,
    getShareUrl: (link) => `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(link)}`,
  },
  {
    name: "Instagram",
    icon: <FaInstagram className="text-pink-500" size={28} />,
    getShareUrl: (link) => `https://www.instagram.com/?url=${encodeURIComponent(link)}`,
  },
];

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export default function SharePostModal({ postLink, topPeople = [], loadingConversations, searchResults = [], searching, onUserSearch, searchQuery, onSendToPerson, onClose }) {
  // Native share available?
  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const modalRef = useRef(null);
  const dragStartY = useRef(null);
  // Drag state for modal
  const [dragOffset, setDragOffset] = useState(0);

  // Only show WhatsApp/Telegram on mobile, others always
  const filteredApps = useMemo(() => {
    if (!isMobile()) return SOCIAL_APPS.filter(app => !app.mobileScheme);
    return SOCIAL_APPS;
  }, []);
  const isMobileDevice = isMobile();

  const handleNativeShare = async () => {
    try {
      await navigator.share({ url: postLink });
    } catch (e) {
      // fallback: do nothing
    }
  };

  // Enhanced touch/mouse drag handlers for draggable modal
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;

    // Touch events
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        dragStartY.current = e.touches[0].clientY;
        setDragging(true);
      }
    };
    const handleTouchMove = (e) => {
      if (!dragging || dragStartY.current === null) return;
      const deltaY = e.touches[0].clientY - dragStartY.current;
      if (deltaY > 0) setDragOffset(deltaY);
      if (deltaY > 80) {
        setDragging(false);
        setDragOffset(0);
        onClose();
      }
    };
    const handleTouchEnd = () => {
      setDragging(false);
      setDragOffset(0);
      dragStartY.current = null;
    };
    // Mouse events for desktop
    const handleMouseDown = (e) => {
      dragStartY.current = e.clientY;
      setDragging(true);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = (e) => {
      if (!dragging || dragStartY.current === null) return;
      const deltaY = e.clientY - dragStartY.current;
      if (deltaY > 0) setDragOffset(deltaY);
      if (deltaY > 80) {
        setDragging(false);
        setDragOffset(0);
        onClose();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
    };
    const handleMouseUp = () => {
      setDragging(false);
      setDragOffset(0);
      dragStartY.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // Attach events
    modal.addEventListener('touchstart', handleTouchStart);
    modal.addEventListener('touchmove', handleTouchMove);
    modal.addEventListener('touchend', handleTouchEnd);
    modal.querySelector('.modal-drag-handle')?.addEventListener('mousedown', handleMouseDown);
    return () => {
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchend', handleTouchEnd);
      modal.querySelector('.modal-drag-handle')?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open, dragging, onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex ${isMobileDevice ? 'items-end' : 'items-center'} justify-center bg-black bg-opacity-50`}>
      <div
        ref={modalRef}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: dragging ? 'none' : 'transform 0.2s' }}
        className="bg-white dark:bg-gray-900 rounded-t-2xl rounded-b-xl shadow-xl p-6 w-full max-w-md relative transition-all duration-300 animate-slideUp"
      >
        {/* Drag handle for swipe down */}
        <div className="flex justify-center items-center mb-2 modal-drag-handle cursor-grab active:cursor-grabbing select-none" style={{touchAction:'none'}}>
          <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1 mb-2" style={{marginTop: 2}} />
        </div>
        <button
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Share Post</h2>
        <div className="mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Share to social apps:</div>
          <div className="flex gap-4 mb-4 flex-wrap">
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
              >
                <FaShareAlt className="text-blue-500 dark:text-white" size={28} />
                <span className="text-xs text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Share...</span>
              </button>
            )}
            {filteredApps.map((app) => (
              <a
                key={app.name}
                href={app.getShareUrl(postLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 group hover:text-blue-600 dark:hover:text-red-400 transition-colors"
              >
                {app.icon}
                <span className="text-xs text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{app.name}</span>
              </a>
            ))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Send to a person:</div>
          {loadingConversations ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">Loading conversations...</div>
          ) : topPeople.length > 0 ? (
            <div className="flex gap-3 flex-wrap mb-2 justify-center">
              {topPeople.map((person) => (
                <button
                  key={person._id}
                  onClick={() => onSendToPerson(person)}
                  className="flex flex-col items-center gap-1 group hover:text-blue-600 dark:hover:text-red-400 transition-colors"
                >
                  {person.profileImage ? (
                    <img
                      src={person.profileImage}
                      alt={person.username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      <FaUser className="text-gray-500 dark:text-gray-300" size={24} />
                    </div>
                  )}
                  <span className="text-xs truncate max-w-[60px] flex items-center justify-center text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {person.username}
                    {person.verified && <VerifiedBadge />}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm py-2 text-center">No recent conversations found.</div>
          )}
          <div className="mt-2 flex flex-col items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={e => onUserSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs mb-2"
            />
            {searching && <div className="text-gray-500 dark:text-gray-400 text-xs py-2 text-center">Searching...</div>}
            {!searching && searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full justify-items-center">
                {searchResults.slice(0, 5).map(user => (
                  <button
                    key={user._id}
                    onClick={() => onSendToPerson(user)}
                    className="flex flex-col items-center gap-1 group hover:text-blue-600 dark:hover:text-red-400 transition-colors w-full"
                  >
                    {(user.profileImage || user.profile?.profileImage) ? (
                      <img
                        src={user.profileImage || user.profile?.profileImage}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                        <FaUser className="text-gray-500 dark:text-gray-300" size={24} />
                      </div>
                    )}
                    <span className="text-xs truncate max-w-[60px] flex items-center justify-center text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {user.username}
                      {user.verified && <VerifiedBadge />}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!searching && searchQuery && searchResults.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-xs py-2 text-center">No users found.</div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <input
            type="text"
            value={postLink}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs mb-2"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(postLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={`w-full py-2 ${copied ? 'bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg text-sm font-semibold transition-colors`}
          >
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Add animation for mobile slide up */
// In your global CSS (e.g., App.css or index.css), add:
// @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
// .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1); }
