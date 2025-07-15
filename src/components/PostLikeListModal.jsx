import React, { useState, useEffect, useRef } from "react";
import { FaUser } from "react-icons/fa";
import VerifiedBadge from "./VerifiedBadge";
import { followUser, unfollowUser } from "../utils/api";
import { hashId } from "../utils/hash";
import { useAuth } from "../context/auth";
import { Link } from "react-router-dom";

export default function PostLikeListModal({
  open,
  onClose,
  postId,
  getPostLikes,
  initialLikes = [],
  maxLikers = 100,
}) {
  const [likers, setLikers] = useState(initialLikes);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtered, setFiltered] = useState(initialLikes);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [zoomImg, setZoomImg] = useState(null);
  const dragStartY = useRef(null);
  const modalRef = useRef(null);
  const { user: currentUser } = useAuth();
  const [followStates, setFollowStates] = useState({}); // { [userId]: true/false }
  const [followLoading, setFollowLoading] = useState({}); // { [userId]: true/false }
  const [currentUserFollowingHashed, setCurrentUserFollowingHashed] = useState([]);
  // Modal snap points: 'default', 'half', 'full'
  const [modalSnap, setModalSnap] = useState('default');
  const snapHeights = {
    default: 'max-h-[60vh]',
    half: 'max-h-[80vh]',
    full: 'max-h-[100vh]'
  };
  // Drag logic for snap points (touch and mouse)
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;
    const dragHandle = modal.querySelector('.modal-drag-handle');
    let startY = null;
    let moved = false;
    let lastSnap = modalSnap;
    let lastOffset = 0;

    // Only allow snap down (close), not up
    const getNextSnap = (direction) => {
      if (direction === 'down') return 'default';
      return modalSnap;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        moved = false;
        lastSnap = modalSnap;
        lastOffset = dragOffset;
        setDragging(true);
      }
    };
    const handleTouchMove = (e) => {
      if (startY === null) return;
      const deltaY = e.touches[0].clientY - startY;
      setDragOffset(deltaY);
      moved = true;
    };
    const handleTouchEnd = () => {
      setDragging(false);
      if (!moved) { setDragOffset(0); startY = null; return; }
      if (dragOffset > 40) {
        // Drag down to close
        onClose();
      }
      setDragOffset(0);
      startY = null;
    };
    // Mouse drag for desktop
    const handleMouseDown = (e) => {
      startY = e.clientY;
      moved = false;
      lastSnap = modalSnap;
      lastOffset = dragOffset;
      setDragging(true);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = (e) => {
      if (startY === null) return;
      const deltaY = e.clientY - startY;
      setDragOffset(deltaY);
      moved = true;
    };
    const handleMouseUp = () => {
      setDragging(false);
      if (!moved) { setDragOffset(0); startY = null; window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); return; }
      if (dragOffset > 40) {
        // Drag down to close
        onClose();
      }
      setDragOffset(0);
      startY = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    if (dragHandle) {
      dragHandle.addEventListener('touchstart', handleTouchStart);
      dragHandle.addEventListener('touchmove', handleTouchMove);
      dragHandle.addEventListener('touchend', handleTouchEnd);
      dragHandle.addEventListener('mousedown', handleMouseDown);
    }
    return () => {
      if (dragHandle) {
        dragHandle.removeEventListener('touchstart', handleTouchStart);
        dragHandle.removeEventListener('touchmove', handleTouchMove);
        dragHandle.removeEventListener('touchend', handleTouchEnd);
        dragHandle.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open, modalSnap, dragOffset, onClose]);

  // Fetch current user's following list for accurate follow state
  useEffect(() => {
    async function fetchFollowing() {
      if (!currentUser?.username) return;
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
        const res = await fetch(`${API_BASE}/user/following/${encodeURIComponent(currentUser.username)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
          const data = await res.json();
          const hashedIds = (data.following || []).map(u => hashId(u._id));
          setCurrentUserFollowingHashed(hashedIds);
        }
      } catch (err) {
        setCurrentUserFollowingHashed([]);
      }
    }
    if (open && currentUser) fetchFollowing();
  }, [open, currentUser]);

  // Set followStates based on current user's following list
  useEffect(() => {
    if (!currentUser) return;
    const newStates = {};
    likers.forEach(liker => {
      newStates[liker._id] = currentUserFollowingHashed.includes(hashId(liker._id));
    });
    setFollowStates(newStates);
  }, [likers, currentUserFollowingHashed, currentUser]);

  // Update filtered list when search or likers change
  useEffect(() => {
    if (!search) {
      setFiltered(likers);
    } else {
      setFiltered(
        likers.filter(user =>
          user.username && user.username.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, likers]);

  // Fetch likers when modal opens
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    async function fetchLikers() {
      setLoading(true);
      try {
        let likes = initialLikes;
        if (typeof getPostLikes === 'function' && postId) {
          const response = await getPostLikes(postId, maxLikers);
          likes = response.likes || [];
        }
        if (!Array.isArray(likes)) likes = [];
        if (isMounted) {
          setLikers(likes);
          setFiltered(likes);
        }
      } catch (err) {
        if (isMounted) {
          setLikers([]);
          setFiltered([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLikers();
    return () => { isMounted = false; };
  }, [open, postId, getPostLikes, initialLikes, maxLikers]);

  // Follow/unfollow actions update likers' followersHashed for instant UI feedback
  const handleFollow = async (userId) => {
    setFollowLoading(fl => ({ ...fl, [userId]: true }));
    setFollowStates(fs => ({ ...fs, [userId]: true }));
    setLikers(likers => likers.map(liker =>
      liker._id === userId
        ? { ...liker, followersHashed: [...(liker.followersHashed || []), hashId(String(currentUser._id || currentUser.id))] }
        : liker
    ));
    setCurrentUserFollowingHashed(following => [...following, hashId(userId)]); // Update following list instantly
    try {
      await followUser(userId);
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };
  const handleUnfollow = async (userId) => {
    setFollowLoading(fl => ({ ...fl, [userId]: true }));
    setFollowStates(fs => ({ ...fs, [userId]: false }));
    setLikers(likers => likers.map(liker =>
      liker._id === userId
        ? { ...liker, followersHashed: (liker.followersHashed || []).filter(id => id !== hashId(String(currentUser._id || currentUser.id))) }
        : liker
    ));
    setCurrentUserFollowingHashed(following => following.filter(id => id !== hashId(userId))); // Update following list instantly
    try {
      await unfollowUser(userId);
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        style={{
          transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.2s'
        }}
        className={`w-full sm:w-[400px] max-w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-xl p-4 pb-0 relative flex flex-col animate-slideUp ${snapHeights[modalSnap]}`}
      >
        {/* Drag handle for swipe up/down */}
        <div className="flex justify-center items-center mb-2 modal-drag-handle cursor-grab active:cursor-grabbing select-none" style={{touchAction:'none'}}>
          <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1 mb-2" style={{marginTop: 2}} />
        </div>
        <button
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-red-500 text-3xl font-bold w-12 h-12 flex items-center justify-center"
          style={{ zIndex: 10, background: 'none', boxShadow: 'none' }}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100 text-center">
          Likes
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm mb-2 font-medium"
        />
        <div className="overflow-y-auto flex-1 min-h-0 hide-scrollbar">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No users found.
            </div>
          ) : (
            <ul>
              {filtered.slice(0, maxLikers).map((user) => (
                <li
                  key={user._id}
                  className="flex items-center gap-3 py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors justify-between text-base"
                >
                  <div className="flex items-center gap-3">
                    {/* Use the same logic as comments for profile image */}
                    {user.profile?.profileImage || user.profileImage ? (
                      <img
                        src={user.profile?.profileImage || user.profileImage}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover cursor-zoom-in border-2 border-gray-300 dark:border-gray-700"
                        onClick={() => setZoomImg({ ...user, profileImage: user.profile?.profileImage || user.profileImage })}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <FaUser className="text-gray-500 dark:text-gray-300" size={22} />
                      </div>
                    )}
                    <Link
                      to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
                      className="font-semibold text-gray-900 dark:text-gray-100 flex items-center hover:underline text-base"
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={0}
                      onClick={e => e.stopPropagation()}
                    >
                      {user.username}
                      {user.verified && <VerifiedBadge className="ml-1" />}
                    </Link>
                  </div>
                  {currentUser && user._id && String(currentUser._id) !== String(user._id) && (
                    followStates[user._id] ? (
                      <button
                        className="px-4 py-1 rounded-full bg-gray-400 text-white text-xs font-semibold hover:bg-gray-500 transition"
                        disabled={followLoading[user._id]}
                        onClick={() => handleUnfollow(user._id)}
                      >
                        {followLoading[user._id] ? "..." : "Following"}
                      </button>
                    ) : (
                      <button
                        className="px-4 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                        disabled={followLoading[user._id]}
                        onClick={() => handleFollow(user._id)}
                      >
                        {followLoading[user._id] ? "..." : "Follow"}
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Zoom overlay for profile image */}
      {zoomImg && zoomImg.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity" onClick={() => setZoomImg(null)}>
          <div className="relative max-w-xs w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={zoomImg.profileImage}
              alt="Profile Zoom"
              className="rounded-full shadow-lg border-4 border-white"
              style={{ background: '#fff', borderRadius: '50%', width: '300px', height: '300px', objectFit: 'cover', aspectRatio: '1 / 1', maxWidth: '80vw', maxHeight: '80vw' }}
            />
            <div className="mt-2 flex items-center gap-2 text-white font-semibold text-lg text-center truncate max-w-xs">
              <span className="font-bold">{zoomImg.username}</span>
              {zoomImg.verified && <VerifiedBadge />}
              <button
                className="text-white text-2xl font-bold bg-black bg-opacity-40 rounded-full p-1 hover:bg-opacity-70 transition-colors ml-2"
                onClick={() => setZoomImg(null)}
                aria-label="Close profile image zoom"
              >
                ×
              </button>
            </div>
            {currentUser && zoomImg._id && String(currentUser._id) !== String(zoomImg._id) && (
              followStates[zoomImg._id] ? (
                <button
                  className="px-6 py-2 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition mb-2 mt-2"
                  disabled={followLoading[zoomImg._id]}
                  onClick={() => handleUnfollow(zoomImg._id)}
                >
                  {followLoading[zoomImg._id] ? "..." : "Following"}
                </button>
              ) : (
                <button
                  className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition mb-2 mt-2"
                  disabled={followLoading[zoomImg._id]}
                  onClick={() => handleFollow(zoomImg._id)}
                >
                  {followLoading[zoomImg._id] ? "..." : "Follow"}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
