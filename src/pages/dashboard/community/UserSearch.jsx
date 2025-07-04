import { useState, useEffect, useRef } from "react";
import { FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { searchUsers, followUser } from "../../../utils/api";
import SHA256 from "crypto-js/sha256";
import VerifiedBadge from "../../../components/VerifiedBadge";

function hashId(id) {
  return SHA256(id.toString()).toString();
}

export default function UserSearch({ currentUser, username, onFollow, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localFollowingHashed, setLocalFollowingHashed] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]); // Store actual following users
  const debounceRef = useRef();
  const navigate = useNavigate();

  // API base URL
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");

  // Fetch current user's following list
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      if (!currentUser?.username) return;

      try {
        const authHeaders = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const response = await fetch(
          `${API_BASE}/user/following/${encodeURIComponent(currentUser.username)}`,
          {
            headers: authHeaders,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const following = data.following || [];
          setFollowingUsers(following);

          // Create hashed IDs for quick lookup
          const hashedIds = following.map((user) => hashId(user._id));
          setLocalFollowingHashed(hashedIds);
        }
      } catch (error) {
        console.error("Error fetching following users:", error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.username, API_BASE]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const data = await searchUsers(query);
      const mappedResults = (data.users || []).map((u) => ({
        ...u,
        isFollowing: localFollowingHashed.includes(hashId(u._id)),
      }));
      setResults(mappedResults);
      setLoading(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, localFollowingHashed]);

  const handleFollow = async (userId) => {
    try {
      await followUser(userId);
      const hashedId = hashId(userId);
      setLocalFollowingHashed((prev) => [...prev, hashedId]);

      // Add the user to the following list
      const userToFollow = results.find((u) => u._id === userId);
      if (userToFollow) {
        setFollowingUsers((prev) => [...prev, userToFollow]);
      }

      setResults(results.map((u) => (u._id === userId ? { ...u, isFollowing: true } : u)));
      if (onFollow) onFollow(userId);
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 p-2 mb-2 rounded">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">Search users to follow</span>
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
        />
      </div>
      {/* Floating results */}
      {query && (
        <div className="absolute left-0 right-0 z-30 mt-1">
          {loading && (
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg p-3">
              <div className="text-xs text-gray-500">Loading…</div>
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg p-3">
              <div className="text-xs text-gray-500">No users found.</div>
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg p-2 max-h-64 overflow-y-auto">
              {results.map((user) => (
                <li
                  key={user._id}
                  className="flex items-center gap-3 py-2 px-2 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(user.username)}`)}
                  >
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b] flex items-center">
                      {user.username}
                      {user.verified && <VerifiedBadge />}
                    </span>
                    {!user.verified && user.countryFlag && (
                      <img src={user.countryFlag} alt={user.country} className="w-5 h-4 rounded-sm" />
                    )}
                  </div>
                  <button
                    className={`ml-2 px-4 py-1.5 rounded text-sm font-semibold transition min-w-[80px] flex-shrink-0
                      ${user.isFollowing
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        : "bg-[#a99d6b] text-white hover:bg-[#c2b77a]"
                    }`}
                    disabled={user.isFollowing}
                    onClick={() => !user.isFollowing && handleFollow(user._id)}
                  >
                    {user.isFollowing ? "Following" : "Follow"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}