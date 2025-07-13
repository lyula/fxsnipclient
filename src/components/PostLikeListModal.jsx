import React, { useState, useEffect, useRef } from "react";
import { FaUser } from "react-icons/fa";
import VerifiedBadge from "./VerifiedBadge";
import { followUser, unfollowUser } from "../utils/api";
import { hashId } from "../utils/hash";
import { useAuth } from "../context/auth";

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

  useEffect(() => {
    if (open && postId && getPostLikes) {
      setLoading(true);
      getPostLikes(postId, maxLikers, search)
        .then((res) => {
          setLikers(res.likes || []);
          setFiltered(res.likes || []);
        })
        .finally(() => setLoading(false));
    }
  }, [open, postId, getPostLikes, maxLikers, search]);

  useEffect(() => {
    if (!search) {
      setFiltered(likers);
    } else {
      setFiltered(
        likers.filter((u) =>
          u.username?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, likers]);

  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;

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
        className="w-full sm:w-[400px] max-w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-xl p-4 pb-0 relative max-h-[60vh] flex flex-col animate-slideUp"
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
        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100 text-center">
          Likes
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs mb-2"
        />
        <div className="overflow-y-auto flex-1 min-h-0 max-h-[40vh]">
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
                  className="flex items-center gap-3 py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Use the same logic as comments for profile image */}
                    {user.profile?.profileImage || user.profileImage ? (
                      <img
                        src={user.profile?.profileImage || user.profileImage}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover cursor-zoom-in"
                        onClick={() => setZoomImg({ ...user, profileImage: user.profile?.profileImage || user.profileImage })}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <FaUser className="text-gray-500 dark:text-gray-300" size={18} />
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      {user.username}
                      {user.verified && <VerifiedBadge className="ml-1" />}
                    </span>
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
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 animate-fadeIn"
          onClick={() => setZoomImg(null)}
        >
          <div
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border-4 border-white dark:border-gray-800 relative"
            style={{ minWidth: 260, minHeight: 260 }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={zoomImg.profileImage || zoomImg}
              alt="Profile Zoom"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 mb-4"
              style={{ objectFit: 'cover' }}
            />
            <div className="flex items-center justify-center mb-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 mr-2">{zoomImg.username || ''}</span>
              {zoomImg.verified && <VerifiedBadge />}
            </div>
            {currentUser && zoomImg._id && String(currentUser._id) !== String(zoomImg._id) && (
              followStates[zoomImg._id] ? (
                <button
                  className="px-6 py-2 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition mb-2"
                  disabled={followLoading[zoomImg._id]}
                  onClick={() => handleUnfollow(zoomImg._id)}
                >
                  {followLoading[zoomImg._id] ? "..." : "Following"}
                </button>
              ) : (
                <button
                  className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition mb-2"
                  disabled={followLoading[zoomImg._id]}
                  onClick={() => handleFollow(zoomImg._id)}
                >
                  {followLoading[zoomImg._id] ? "..." : "Follow"}
                </button>
              )
            )}
            <button
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-red-500 text-2xl font-bold"
              onClick={() => setZoomImg(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
