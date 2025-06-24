import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaEnvelope, FaUser, FaUsers } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";

export default function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const profileData = await res.json();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [username]);

  // Fetch followers list
  useEffect(() => {
    async function fetchFollowers() {
      if (!username) return;
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers || []);
      }
    }
    fetchFollowers();
  }, [username, showFollowers]);

  // Check if current user is following this profile
  useEffect(() => {
    async function checkFollowing() {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/user/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const me = await res.json();
        // If you have a following list in your profile, check if this user is in it
        if (me && me.followingHashed && profile && profile._id) {
          setIsFollowing(me.followingHashed.includes(profile._id));
        }
      }
    }
    if (profile && profile._id) checkFollowing();
  }, [profile]);

  const handleFollow = async () => {
    setFollowLoading(true);
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    const res = await fetch(`${API_BASE}/user/follow/${profile._id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      setIsFollowing(true);
      setProfile(p => ({ ...p, followers: (p.followers ?? 0) + 1 }));
    }
    setFollowLoading(false);
  };

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
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => {
          navigate("/dashboard/community?tab=following");
        }}
        className="mb-4 px-4 py-2 rounded bg-[#a99d6b] text-white font-semibold hover:bg-[#8c845c] transition"
      >
        &larr; Back to Following
      </button>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <FaUser className="text-3xl text-gray-400 dark:text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xl text-gray-900 dark:text-white break-all">{profile.username}</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 break-all">
            {profile.country || ""}
          </div>
          <div className="flex gap-6 mt-2">
            <div className="flex flex-col items-center">
              <button
                className="bg-transparent border-none p-0 m-0"
                onClick={() => setShowFollowers(true)}
                title="View followers"
              >
                <span className="font-bold text-lg text-[#1E3A8A] dark:text-[#a99d6b] underline">
                  {formatCount(profile.followers ?? 0)}
                </span>
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Followers
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg text-[#1E3A8A] dark:text-[#a99d6b]">
                {formatCount(profile.following ?? 0)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Following
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Joined: {profile.joined ? new Date(profile.joined).toLocaleDateString() : ""}
          </div>
          {/* Responsive buttons below date, aligned at start of screen */}
          <div className="flex flex-row gap-2 mt-4 w-full max-w-xs sm:max-w-none sm:w-auto sm:mt-4 justify-start">
            <button
              className="flex-1 min-w-0 px-2 py-1 rounded-full font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 text-sm sm:w-32"
              disabled={isFollowing || followLoading}
              onClick={handleFollow}
              title={isFollowing ? "Already following" : "Follow"}
            >
              {isFollowing ? "Following" : followLoading ? "..." : "Follow"}
            </button>
            <button
              onClick={() => navigate("/dashboard/inbox", { state: { to: profile.username } })}
              className="flex-1 min-w-0 px-2 py-1 rounded-full bg-blue-500 text-white flex items-center justify-center gap-2 font-semibold hover:bg-blue-600 transition text-sm sm:w-32"
              title="Message"
            >
              <FaEnvelope /> Message
            </button>
          </div>
        </div>
      </div>
      {/* Followers Modal */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => setShowFollowers(false)}
              title="Close"
            >
              ×
            </button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FaUsers /> Followers
            </h3>
            {followers.length === 0 ? (
              <div className="text-gray-500 text-center">No followers yet.</div>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {followers.map(f => (
                  <li key={f._id} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                    <FaUser className="text-gray-400" />
                    <span className="font-semibold">{f.username}</span>
                    {f.country && (
                      <span className="text-xs text-gray-500">{f.country}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <hr className="my-6 border-gray-200 dark:border-gray-700" />
      <div>
        <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Posts</h2>
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          No posts yet.
        </div>
      </div>
    </div>
  );
}