import { useState, useEffect, useRef } from "react";
import { FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { searchUsers, followUser } from "../../../utils/api";
import SHA256 from "crypto-js/sha256";

function hashId(id) {
  return SHA256(id.toString()).toString();
}

export default function UserSearch({ currentUser, username, onFollow, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localFollowingHashed, setLocalFollowingHashed] = useState(currentUser?.followingHashed || []);
  const debounceRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalFollowingHashed(currentUser?.followingHashed || []);
  }, [currentUser]);

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
      const mappedResults = (data.users || []).map(u => ({
        ...u,
        isFollowing: localFollowingHashed.includes(hashId(u._id)),
      }));
      setResults(mappedResults);
      setLoading(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, localFollowingHashed]);

  const handleFollow = async (userId) => {
    await followUser(userId);
    const hashedId = hashId(userId);
    setLocalFollowingHashed((prev) => [...prev, hashedId]);
    setResults(results.map(u => u._id === userId ? { ...u, isFollowing: true } : u));
    if (onFollow) onFollow(userId);
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
          onChange={e => setQuery(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
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
              {results.map(user => (
                <li
                  key={user._id}
                  className="flex items-center gap-3 py-2 px-2 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(user.username)}`)}
                  >
                    <FaUser className="text-[#1E3A8A] dark:text-[#a99d6b] text-lg" />
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">{user.username}</span>
                    {user.countryFlag && (
                      <img src={user.countryFlag} alt={user.country} className="w-5 h-4 rounded-sm" />
                    )}
                  </div>
                  <button
                    className={`ml-2 px-3 py-1 rounded text-xs font-semibold transition
                      ${user.isFollowing ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-[#a99d6b] text-white hover:bg-[#c2b77a]"}`}
                    disabled={user.isFollowing}
                    onClick={() => handleFollow(user._id)}
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