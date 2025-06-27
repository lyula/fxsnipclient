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
  const [activeTab, setActiveTab] = useState("posts");
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);

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
          <div className="w-full mt-4">
            <div
              className="max-h-[400px] overflow-y-auto hide-scrollbar"
            >
              {activeTab === "posts" && (
                        <>
                          {posts.length === 0 ? (
                            <div className="text-gray-500 dark:text-gray-400 text-center py-8">No posts yet.</div>
                          ) : (
                            posts.slice(0, 70).map((post) => (
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
                        <button
                          key={follower._id}
                          className="w-3/4 md:w-1/2 rounded-full bg-gray-700 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-white font-semibold text-lg shadow hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                          style={{ outline: "none", border: "none" }}
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
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">Not following anyone yet.</div>
                  ) : (
                    <div className="flex flex-col gap-4 items-center">
                      {following.slice(0, 70).map((user) => (
                        <button
                          key={user._id}
                          className="w-3/4 md:w-1/2 rounded-full bg-gray-700 dark:bg-gray-800 px-6 py-3 flex items-center justify-center gap-2 text-white font-semibold text-lg shadow hover:bg-gray-600 dark:hover:bg-gray-700 transition"
                          style={{ outline: "none", border: "none" }}
                        >
                          {user.username}
                          {user.verified && <VerifiedBadge />}
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
    </div>
  );
}
