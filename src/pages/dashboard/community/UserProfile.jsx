import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaUser } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";
import VerifiedBadge from "../../../components/VerifiedBadge";
import Post from "../../../components/common/Post";
import { useAuth } from "../../../context/auth";
import { hashId } from "../../../utils/hash"; // Import the hash function

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
  const [posts, setPosts] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(true);

  // Use Auth context for current user
  const { user: currentUser } = useAuth();

  // Fetch profile, followers, and following
  useEffect(() => {
    async function fetchProfileAndCounts() {
      setLoading(true);
      setButtonLoading(true);
      const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
      try {
        const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        const followersRes = await fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`);
        if (followersRes.ok) {
          const followersData = await followersRes.json();
          setFollowers(followersData.followers || []);
        }

        const followingRes = await fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (followingRes.ok) {
          const followingData = await followingRes.json();
          setFollowing(followingData.following || []);
        }
      } catch (error) {
        console.error("Error fetching profile or counts:", error);
      } finally {
        setLoading(false);
        if (profile && currentUser) setButtonLoading(false);
      }
    }
    fetchProfileAndCounts();
  }, [username, currentUser]);

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

  // Check if current user is following the profile user - FIXED
  useEffect(() => {
    if (!currentUser || !profile) {
      setIsFollowing(false);
      return;
    }
    
    // Use followersHashed array and hash the current user's ID to check if following
    const followersHashed = Array.isArray(profile.followersHashed) ? profile.followersHashed : [];
    const currentUserId = String(currentUser._id || currentUser.id);
    const hashedCurrentUserId = hashId(currentUserId);
    
    setIsFollowing(followersHashed.includes(hashedCurrentUserId));
  }, [profile, currentUser]);

  // Like a post
  const handleLike = async (postId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, likes: [...post.likes, currentUser._id || currentUser.id] } : post
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Refresh profile data to get updated follower count and state
      const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Refresh profile data to get updated follower count and state
      const profileRes = await fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  // Handle message button click - NEW
  const handleMessage = () => {
    navigate(`/dashboard/inbox?chat=${encodeURIComponent(profile.username)}`);
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

  const currentUserId = currentUser && (currentUser._id || currentUser.id);

  return (
    <div style={{ backgroundColor: "inherit" }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex flex-col items-center gap-2 mb-4" style={{ marginTop: "12px" }}>
          <div className="flex items-center gap-4 justify-start w-full">
            <div className="cursor-pointer" onClick={() => navigate(-1)}>
              <FaArrowLeft className="text-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition" />
            </div>
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <FaUser className="text-3xl text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white break-all">
                {profile.username}
                {profile.verified && <VerifiedBadge />}
              </span>
            </div>
          </div>
          <div className="flex gap-8">
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
          <div className="flex w-full justify-center mt-2">
            <div className="flex gap-4">
              {buttonLoading || !currentUser || !profile?._id ? (
                <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-full"></div>
              ) : String(currentUserId) === String(profile._id) ? (
                <div className="h-10"></div>
              ) : (
                <>
                  {/* UPDATED FOLLOW BUTTON LOGIC */}
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
                  {/* UPDATED MESSAGE BUTTON */}
                  <button
                    className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                    onClick={handleMessage}
                  >
                    <FaEnvelope size={14} />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center mt-4">
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
                        if (isNaN(dateA) || isNaN(dateB)) return 0;
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
                            className="w-full rounded-full bg-gray-100 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-gray-900 dark:text-white font-semibold text-lg shadow hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
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
                            className="w-full rounded-full bg-gray-100 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-gray-900 dark:text-white font-semibold text-lg shadow hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
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
      </div>
    </div>
  );
}