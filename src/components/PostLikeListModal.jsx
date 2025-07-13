import React, { useState, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import VerifiedBadge from "./VerifiedBadge";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50">
      <div className="w-full sm:w-[400px] max-w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-xl p-4 pb-0 relative max-h-[60vh] flex flex-col animate-slideUp">
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
                  className="flex items-center gap-3 py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {/* Use the same logic as comments for profile image */}
                  {user.profile?.profileImage || user.profileImage ? (
                    <img
                      src={user.profile?.profileImage || user.profileImage}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
