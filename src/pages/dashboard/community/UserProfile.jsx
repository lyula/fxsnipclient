import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaUser } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";
import VerifiedBadge from "../../../components/VerifiedBadge";
import Post from "../../../components/common/Post";

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
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || "posts");
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);

  // Fetch profile, followers, and following
  useEffect(() => {
    async function fetchProfileAndCounts() {
      setLoading(true);
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      try {
        // Profile
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

        // Followers
        const followersRes = await fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`);
        if (followersRes.ok) {
          const followersData = await followersRes.json();
          setFollowers(followersData.followers || []);
        }

        // Following
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

  // Fetch posts for this user
  useEffect(() => {
    async function fetchPosts() {
      if (!profile?._id) return;
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      try {
        const res = await fetch(`${API_BASE}/posts/by-userid/${profile._id}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    }
    fetchPosts();
  }, [profile?._id]);

  // Set current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) {
      setCurrentUser(null);
      return;
    }
    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // Check if current user is following this profile
      if (user && profile && Array.isArray(profile.followers)) {
        const isUserFollowing = profile.followers.map(String).includes(String(user.id));
        setIsFollowing(isUserFollowing);
      } else {
        setIsFollowing(false);
      }
    } catch (e) {
      setCurrentUser(null);
    }
  }, [profile, navigate]);

  // Like a post
  const handleLike = async (postId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: [...post.likes, currentUser.id] } : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  // Comment on a post
  const handleComment = async (postId, content) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prevPosts) =>
          prevPosts.map((post) => (post._id === postId ? updatedPost : post))
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Follow user
  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      await fetch(`${API_BASE}/user/follow/${profile._id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      // Re-fetch profile to update followers
      const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (e) {
      console.error("Error following user:", e);
    }
    setFollowLoading(false);
  };

  // Unfollow user
  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      await fetch(`${API_BASE}/user/unfollow/${profile._id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      // Re-fetch profile to update followers
      const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (e) {
      console.error("Error unfollowing user:", e);
    }
    setFollowLoading(false);
  };

  const tabs = ["posts", "followers", "following"];

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
    <div style={{ backgroundColor: "inherit" }}>
      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
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
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setActiveTab("followers")}
              title="View followers"
            >
              <span className="font-bold text-lg text-gray-900 dark:text-white">{followers.length}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Followers</span>
            </div>
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setActiveTab("following")}
              title="View following"
            >
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
          <div className="w-full mt-4">
            <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
              {activeTab === "posts" && (
                <>
                  {posts.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">No posts yet.</div>
                  ) : (
                    posts
                      .filter((post) => post.createdAt)
                      .sort((a, b) => {
                        const dateA = new Date(a.createdAt);
                        const dateB = new Date(b.createdAt);
                        if (isNaN(dateA) || isNaN(dateB)) {
                          return 0;
                        }
                        return dateB - dateA;
                      })
                      .slice(0, 70)
                      .map((post) => (
                        <Link
                          key={post._id}
                          to={`/dashboard/community?postId=${post._id}`}
                          style={{ display: "block", textDecoration: "none" }}
                        >
                          <Post post={post} onLike={handleLike} onComment={handleComment} />
                        </Link>
                      ))
                  )}
                </>
              )}
              {activeTab === "followers" && (
                <>
                  {followers.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">No followers yet.</div>
                  ) : (
                    <div className="flex flex-col gap-4 items-center">
                      {followers.slice(0, 70).map((follower) => (
                        <Link
                          key={follower._id}
                          to={`/dashboard/community/user/${encodeURIComponent(follower.username)}`}
                          state={{ defaultTab: "posts" }}
                          style={{ width: "75%", maxWidth: 400, textDecoration: "none" }}
                        >
                          <div
                            className="w-full rounded-full bg-gray-700 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-white font-semibold text-lg shadow hover:bg-gray-600 dark:hover:bg-gray-700 transition cursor-pointer"
                            style={{ outline: "none", border: "none" }}
                          >
                            {follower.username}
                            {follower.verified && <VerifiedBadge />}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
              {activeTab === "following" && (
                <>
                  {following.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">Not following anyone yet.</div>
                  ) : (
                    <div className="flex flex-col gap-4 items-center">
                      {following.slice(0, 70).map((user) => (
                        <Link
                          key={user._id}
                          to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
                          state={{ defaultTab: "posts" }}
                          style={{ width: "75%", maxWidth: 400, textDecoration: "none" }}
                        >
                          <div
                            className="w-full rounded-full bg-gray-700 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-white font-semibold text-lg shadow hover:bg-gray-600 dark:hover:bg-gray-700 transition cursor-pointer"
                            style={{ outline: "none", border: "none" }}
                          >
                            {user.username}
                            {user.verified && <VerifiedBadge />}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {/* Follow/Message Buttons */}
        {currentUser && profile && String(currentUser.id) !== String(profile._id) && (
          <div className="flex gap-4 mt-4">
            {isFollowing ? (
              <button
                className="px-6 py-2 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition"
                disabled={followLoading}
                onClick={handleUnfollow}
              >
                {followLoading ? "..." : "Following"}
              </button>
            ) : (
              <button
                className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                disabled={followLoading}
                onClick={handleFollow}
              >
                {followLoading ? "..." : "Follow"}
              </button>
            )}
            <button
              className="px-6 py-2 rounded-full bg-gray-600 text-white font-semibold hover:bg-gray-700 transition"
              // Add your message handler here if needed
            >
              <FaEnvelope className="inline mr-2" />
              Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
