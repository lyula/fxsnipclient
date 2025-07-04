import { useState, useEffect, useRef } from "react";
import { FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { searchUsers, followUser, unfollowUser } from "../../../utils/api";
import { hashId } from "../../../utils/hash";
import VerifiedBadge from "../../../components/VerifiedBadge";

export default function UserSearch({ currentUser, username, onFollow, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localFollowingHashed, setLocalFollowingHashed] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followingLoading, setFollowingLoading] = useState({});
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

          // Create hashed IDs for quick lookup - using the same logic as UserProfile
          const hashedIds = following.map((user) => hashId(user._id));
          setLocalFollowingHashed(hashedIds);
        }
      } catch (error) {
        console.error("Error fetching following users:", error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.username, API_BASE]);

  // Search users with debouncing
  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(query);
        const mappedResults = (data.users || []).map((u) => ({
          ...u,
          isFollowing: localFollowingHashed.includes(hashId(u._id)),
        }));
        setResults(mappedResults);
      } catch (error) {
        console.error("Error searching users:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    
    return () => clearTimeout(debounceRef.current);
  }, [query, localFollowingHashed]);

  // Handle follow/unfollow operations
  const handleFollowToggle = async (user) => {
    const userId = user._id;
    const isCurrentlyFollowing = user.isFollowing;
    
    // Prevent multiple simultaneous requests for the same user
    if (followingLoading[userId]) return;
    
    setFollowingLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      if (isCurrentlyFollowing) {
        // Unfollow logic
        await unfollowUser(userId);
        const hashedId = hashId(userId);
        
        // Update local state
        setLocalFollowingHashed(prev => prev.filter(id => id !== hashedId));
        setFollowingUsers(prev => prev.filter(u => u._id !== userId));
        setResults(prev => prev.map(u => 
          u._id === userId ? { ...u, isFollowing: false } : u
        ));
        
        console.log(`Successfully unfollowed user: ${user.username}`);
      } else {
        // Follow logic
        await followUser(userId);
        const hashedId = hashId(userId);
        
        // Update local state
        setLocalFollowingHashed(prev => [...prev, hashedId]);
        setFollowingUsers(prev => [...prev, user]);
        setResults(prev => prev.map(u => 
          u._id === userId ? { ...u, isFollowing: true } : u
        ));
        
        console.log(`Successfully followed user: ${user.username}`);
      }
      
      // Notify parent component if callback provided
      if (onFollow) {
        onFollow(userId, !isCurrentlyFollowing);
      }
    } catch (error) {
      console.error(`Error ${isCurrentlyFollowing ? 'unfollowing' : 'following'} user:`, error);
      
      // Show user-friendly error message
      alert(`Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} ${user.username}. Please try again.`);
    } finally {
      setFollowingLoading(prev => ({ ...prev, [userId]: false }));
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
          className="flex-1 border rounded px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
        />
      </div>
      
      {/* Floating results */}
      {query && (
        <div className="absolute left-0 right-0 z-30 mt-1">
          {loading && (
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg p-3">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                Loading…
              </div>
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
                    <span className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b] flex items-center gap-1">
                      {user.username}
                      {user.verified && <VerifiedBadge />}
                    </span>
                    {!user.verified && user.countryFlag && (
                      <img src={user.countryFlag} alt={user.country} className="w-5 h-4 rounded-sm" />
                    )}
                  </div>
                  
                  <button
                    className={`ml-2 px-4 py-1.5 rounded text-sm font-semibold transition min-w-[80px] flex-shrink-0 flex items-center justify-center gap-1
                      ${user.isFollowing
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                        : "bg-[#a99d6b] text-white hover:bg-[#c2b77a] active:bg-[#968B5C]"
                    } ${followingLoading[user._id] ? "opacity-75 cursor-not-allowed" : ""}`}
                    disabled={followingLoading[user._id]}
                    onClick={() => handleFollowToggle(user)}
                  >
                    {followingLoading[user._id] ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        <span className="hidden sm:inline">...</span>
                      </>
                    ) : (
                      user.isFollowing ? "Following" : "Follow"
                    )}
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