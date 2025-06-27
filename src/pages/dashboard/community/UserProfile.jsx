import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { FaEnvelope, FaUser } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";
import SHA256 from "crypto-js/sha256";
import { followUser, unfollowUser } from "../../../utils/api";
import { hashId as hashIdFunc } from "../../../utils/hash"; // Make sure this import exists
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

  // Fetch followers/following when tab is changed
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
        console.log("Following API response:", data);
      }
    }
    if (activeTab === "followers") fetchFollowers();
    if (activeTab === "following") fetchFollowing();
  }, [activeTab, username]);

  // Fetch current user info
  useEffect(() => {
    async function fetchCurrentUser() {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      const res = await fetch(`${API_BASE}/user/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const me = await res.json();
        setCurrentUser(me);
      }
    }
    fetchCurrentUser();
  }, []);

  // Fetch current user info AND profile before checking isFollowing
  useEffect(() => {
    if (
      currentUser &&
      profile &&
      Array.isArray(profile.followersHashed) &&
      currentUser._id
    ) {
      const hashedCurrentUserId = hashIdFunc(currentUser._id);
      setIsFollowing(profile.followersHashed.includes(hashedCurrentUserId));
    }
  }, [currentUser, profile]);

  const handleFollow = async () => {
    if (!profile || !profile._id) return;
    setFollowLoading(true);
    try {
      const res = await followUser(profile._id);
      if (res && res.message === "Followed") {
        // Update profile.followersHashed
        const hashedCurrentUserId = hashIdFunc(currentUser._id);
        setProfile((p) => ({
          ...p,
          followers: (p.followers ?? 0) + 1,
          followersHashed: [...(p.followersHashed || []), hashedCurrentUserId],
        }));
        // Optionally re-fetch current user
        // ...
      } else {
        alert(res.message || "Could not follow user.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
    setFollowLoading(false);
  };

  const handleUnfollow = async () => {
    if (!profile || !profile._id) return;
    setFollowLoading(true);
    try {
      const res = await unfollowUser(profile._id);
      if (res && res.message === "Unfollowed") {
        const hashedCurrentUserId = hashIdFunc(currentUser._id);
        setProfile((p) => ({
          ...p,
          followers: Math.max((p.followers ?? 1) - 1, 0),
          followersHashed: (p.followersHashed || []).filter(h => h !== hashedCurrentUserId),
        }));
        // Optionally re-fetch current user
        // ...
      } else {
        alert(res.message || "Could not unfollow user.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
    setFollowLoading(false);
  };

  // Check if we came from inbox
  const fromInbox = location.state?.fromInbox;
  const chatUsername = location.state?.chatUsername || username;

  // Check if we came from feed or sidebar
  const fromFeed = location.state?.fromFeed;
  const fromSidebar = location.state?.fromSidebar;

  // Check if viewing own profile
  const isOwnProfile = currentUser && profile && currentUser.username === profile.username;

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
      {/* Show correct back button depending on where user came from */}
      {fromInbox ? (
        <button
          onClick={() =>
            navigate(`/dashboard/inbox?chat=${encodeURIComponent(chatUsername)}`)
          }
          className="mb-4 px-4 py-2 rounded font-semibold text-white hover:opacity-90 transition"
          style={{ backgroundColor: "#a99d6b" }}
        >
          Back
        </button>
      ) : (
        <button
          onClick={() => {
            // If from sidebar or feed, always go to Vibe section
            if (fromSidebar || fromFeed) {
              navigate("/dashboard/community");
            } else {
              navigate(-1); // fallback: go back in history
            }
          }}
          className="mb-4 px-4 py-2 rounded font-semibold text-white hover:opacity-90 transition"
          style={{ backgroundColor: "#a99d6b" }}
        >
          Back
        </button>
      )}
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <FaUser className="text-3xl text-gray-400 dark:text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xl text-gray-900 dark:text-white break-all">
              {profile.username}
              {profile.verified && <VerifiedBadge />}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 break-all">
            {profile.country || ""}
          </div>
          <div className="flex gap-6 mt-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-lg text-[#1E3A8A] dark:text-[#a99d6b] underline">
                {formatCount(profile.followers ?? 0)}
              </span>
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
          <div className="flex flex-row gap-2 mt-4 w-full max-w-xs sm:max-w-none sm:w-auto sm:mt-4 justify-start">
            {isOwnProfile ? (
              <button
                className="flex-1 min-w-0 px-2 py-1 rounded-full font-semibold bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm sm:w-32 cursor-not-allowed"
                disabled
                title="You cannot follow yourself"
                style={{ transition: "background 0.2s, color 0.2s" }}
              >
                Follow
              </button>
            ) : (
              <button
                className={`flex-1 min-w-0 px-2 py-1 rounded-full font-semibold text-sm sm:w-32 ${
                  isFollowing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } transition`}
                disabled={followLoading}
                onClick={isFollowing ? handleUnfollow : handleFollow}
                title={isFollowing ? "Unfollow" : "Follow"}
                style={{ cursor: followLoading ? "not-allowed" : "pointer" }}
              >
                {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <button
              onClick={() => navigate(`/dashboard/inbox?chat=${encodeURIComponent(profile.username)}`)}
              className="flex-1 min-w-0 px-2 py-1 rounded-full bg-blue-500 text-white flex items-center justify-center gap-2 font-semibold hover:bg-blue-600 transition text-sm sm:w-32"
              title="Message"
            >
              <FaEnvelope /> Message
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col items-center mt-8">
        <div className="flex gap-8 border-b border-gray-200 dark:border-gray-700 justify-center w-full">
          <button
            className={`pb-2 font-semibold text-base transition ${
              activeTab === "posts"
                ? "border-b-2 border-[#1E3A8A] dark:border-[#a99d6b] text-[#1E3A8A] dark:text-[#a99d6b]"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`pb-2 font-semibold text-base transition ${
              activeTab === "followers"
                ? "border-b-2 border-[#1E3A8A] dark:border-[#a99d6b] text-[#1E3A8A] dark:text-[#a99d6b]"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("followers")}
          >
            Followers
          </button>
          <button
            className={`pb-2 font-semibold text-base transition ${
              activeTab === "following"
                ? "border-b-2 border-[#1E3A8A] dark:border-[#a99d6b] text-[#1E3A8A] dark:text-[#a99d6b]"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("following")}
          >
            Following
          </button>
        </div>
        {/* Tab Content: now directly below the tabs */}
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
                    scrollbarWidth: "none", // For Firefox
                    backgroundColor: "inherit",
                  }}
                >
                  <style>
                    {`
                      /* Hide scrollbar for Webkit browsers */
                      div::-webkit-scrollbar {
                        display: none;
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
                    scrollbarWidth: "none", // For Firefox
                    backgroundColor: "inherit",
                  }}
                >
                  <style>
                    {`
                      /* Hide scrollbar for Webkit browsers */
                      div::-webkit-scrollbar {
                        display: none;
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
      {/* End Tabs and Tab Content */}
    </div>
  );
}
