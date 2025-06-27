import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaUser } from "react-icons/fa"; // Import the arrow icon
import { formatCount } from "../../../utils/formatNumber";
import { useSwipeable } from "react-swipeable"; // Import react-swipeable
import VerifiedBadge from "../../../components/VerifiedBadge";

export default function UserProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [currentUser, setCurrentUser] = useState(null);

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
        setFollowers(followersData.followers || []);
      }

      // Fetch following
      const followingRes = await fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowing(followingData.following || []);
      }
    } catch (error) {
      console.error("Error fetching profile or counts:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchProfileAndCounts();
}, [username]);

  useEffect(() => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    async function fetchFollowers() {
      const res = await fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers || []);
      }
    }
    async function fetchFollowing() {
      const res = await fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following || []);
      }
    }
    if (activeTab === "followers") fetchFollowers();
    if (activeTab === "following") fetchFollowing();
  }, [activeTab, username]);

  const tabs = ["posts", "followers", "following"];

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    },
    trackMouse: true, // Enable swipe detection with mouse for PC
  });

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
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: "inherit",
        paddingTop: "64px",
      }}
      {...swipeHandlers} // Attach swipe handlers to the main container
    >
      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 overflow-hidden">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-2 mb-4" style={{ marginTop: "32px" }}>
          {/* First Row: Back Button, User Icon, and Username */}
          <div className="flex items-center gap-4 justify-start" style={{ marginRight: "calc(50% - 150px)" }}>
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

          {/* Second Row: Followers and Following Counts */}
          <div className="flex gap-8" style={{ marginRight: "calc(50% - 220px)" }}>
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg text-gray-900 dark:text-white">{followers.length}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg text-gray-900 dark:text-white">{following.length}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Following</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col items-center mt-8">
          <div className="flex gap-8 border-b border-gray-200 dark:border-gray-700 justify-center w-full">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`pb-2 font-semibold text-base transition ${
                  activeTab === tab
                    ? "border-b-2 border-[#1E3A8A] dark:border-[#a99d6b] text-[#1E3A8A] dark:text-[#a99d6b]"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {/* Tab Content */}
          <div className="w-full mt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {activeTab === "posts" && (
              <>
                <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white text-center">Posts</h2>
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No posts yet.
                </div>
              </>
            )}
            {activeTab === "followers" && (
              <>
                {followers.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center">Not followed by anyone</div>
                ) : (
                  <div
                    className="flex flex-col gap-4 items-center"
                    style={{
                      maxHeight: "calc(100vh - 200px)",
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      WebkitOverflowScrolling: "touch", // Enables smooth scrolling on mobile
                      backgroundColor: "inherit",
                    }}
                  >
                    <style>
                      {`
                        div::-webkit-scrollbar {
                          display: none; // Hides scrollbar for better mobile experience
                        }
                      `}
                    </style>
                    {followers.map((follower) => (
                      <button
                        key={follower._id}
                        className="w-full max-w-xs px-4 py-2 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        style={{ cursor: "pointer", marginBottom: "8px" }}
                        onClick={() =>
                          navigate(`/dashboard/community/user/${encodeURIComponent(follower.username)}`)
                        }
                        title={`View ${follower.username}'s profile`}
                      >
                        {follower.username}
                        {follower.verified && <VerifiedBadge />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === "following" && (
              <>
                {following.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center">Follows no one</div>
                ) : (
                  <div
                    className="flex flex-col gap-4 items-center"
                    style={{
                      maxHeight: "calc(100vh - 200px)",
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      WebkitOverflowScrolling: "touch", // Enables smooth scrolling on mobile
                      backgroundColor: "inherit",
                    }}
                  >
                    <style>
                      {`
                        div::-webkit-scrollbar {
                          display: none; // Hides scrollbar for better mobile experience
                        }
                      `}
                    </style>
                    {following.map((followedUser) => (
                      <button
                        key={followedUser._id}
                        className="w-full max-w-xs px-4 py-2 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        style={{ cursor: "pointer", marginBottom: "8px" }}
                        onClick={() =>
                          navigate(`/dashboard/community/user/${encodeURIComponent(followedUser.username)}`)
                        }
                        title={`View ${followedUser.username}'s profile`}
                      >
                        {followedUser.username}
                        {followedUser.verified && <VerifiedBadge />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
