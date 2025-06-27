import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaUser } from "react-icons/fa";
import VerifiedBadge from "../../../components/VerifiedBadge";

export default function MobileUserProfile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfileAndCounts() {
      setLoading(true);
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      try {
        // Fetch profile data
        const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        // Fetch followers
        const followersRes = await fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`);
        if (followersRes.ok) {
          const followersData = await followersRes.json();
          setFollowers(followersData.followers.slice(0, 100)); // Limit to 100 records
        }

        // Fetch following
        const followingRes = await fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (followingRes.ok) {
          const followingData = await followingRes.json();
          setFollowing(followingData.following.slice(0, 100)); // Limit to 100 records
        }
      } catch (error) {
        console.error("Error fetching profile or counts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfileAndCounts();
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-500 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-500 dark:text-gray-300">
        User not found.
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4 mb-4">
        {/* Back Button */}
        <div className="cursor-pointer" onClick={() => navigate(-1)}>
          <FaArrowLeft className="text-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition" />
        </div>
        {/* User Icon */}
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <FaUser className="text-3xl text-gray-400 dark:text-gray-500" />
        </div>
        {/* Username */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl text-gray-900 dark:text-white break-all">
            {profile.username}
            {profile.verified && <VerifiedBadge />}
          </span>
        </div>
      </div>

      {/* Followers List */}
      <div className="mt-4">
        <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white text-center">Followers</h2>
        {followers.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center">Not followed by anyone</div>
        ) : (
          <div
            className="flex flex-col gap-4 items-center"
            style={{
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>
              {`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            {followers.map((follower) => (
              <button
                key={follower._id}
                className="w-full max-w-xs px-4 py-2 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(follower.username)}`)}
              >
                {follower.username}
                {follower.verified && <VerifiedBadge />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Following List */}
      <div className="mt-4">
        <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white text-center">Following</h2>
        {following.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center">Follows no one</div>
        ) : (
          <div
            className="flex flex-col gap-4 items-center"
            style={{
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>
              {`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            {following.map((followedUser) => (
              <button
                key={followedUser._id}
                className="w-full max-w-xs px-4 py-2 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => navigate(`/dashboard/community/user/${encodeURIComponent(followedUser.username)}`)}
              >
                {followedUser.username}
                {followedUser.verified && <VerifiedBadge />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}