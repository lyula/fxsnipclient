import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaUser } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";
import VerifiedBadge from "../../../components/VerifiedBadge";
import ChatPost from "./ChatPost";
import { useAuth } from "../../../context/auth";
import { hashId } from "../../../utils/hash";

// Profile cache to avoid refetching same data
const profileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Use Auth context for current user
  const { user: currentUser } = useAuth();

  // Memoized values for performance
  const API_BASE = useMemo(() => 
    (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, ""),
    []
  );

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [localStorage.getItem("token")]); // depend on token for reactivity

  const cacheKey = `profile_${username}`;

  // Check cache for profile data
  const getCachedProfile = useCallback(() => {
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheKey]);

  // Cache profile data
  const setCachedProfile = useCallback((data) => {
    profileCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [cacheKey]);

  // Profile view tracking
  const trackProfileView = (profileId) => {
    if (!profileId || !currentUser) return;
    const viewKey = `profile_${profileId}_${currentUser._id || currentUser.id}`;
    const viewedProfiles = JSON.parse(localStorage.getItem("viewedProfiles") || "[]");
    if (!viewedProfiles.includes(viewKey) && String(currentUser._id || currentUser.id) !== String(profileId)) {
      viewedProfiles.push(viewKey);
      localStorage.setItem("viewedProfiles", JSON.stringify(viewedProfiles));
      fetchWithAuth(`${API_BASE}/user/view/${profileId}`, { method: "POST" }).catch(() => {});
    }
  };

  // Helper to always add Authorization header to fetch
  const fetchWithAuth = useCallback((url, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, {
      ...options,
      headers,
      mode: 'cors', // ensure CORS
      // do NOT set credentials: 'include' for JWT in header
    });
  }, []);

  // Fetch profile and counts
  const fetchProfileAndCounts = useCallback(async () => {
    setLoading(true);
    setButtonLoading(true);

    // Always clear cache for this user before fetching to ensure fresh data
    profileCache.delete(cacheKey);

    // Check cache first
    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached.profile);
      setFollowers(cached.followers || []);
      setFollowing(cached.following || []);
      setLoading(false);
      setButtonLoading(false);
      return;
    }

    try {
      // Execute all API calls in parallel for better performance
      const [profileRes, followersRes, followingRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/user/public/${encodeURIComponent(username)}`),
        fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`),
        fetchWithAuth(`${API_BASE}/user/following/${encodeURIComponent(username)}`)
      ]);

      // Process responses
      let profileData = null;
      let followersData = [];
      let followingData = [];

      if (profileRes.ok) {
        profileData = await profileRes.json();
        setProfile(profileData);
        console.log('[UserProfile DEBUG] profileData:', profileData); // DEBUG LOG
        // Track profile view
        if (profileData?._id) {
          trackProfileView(profileData._id);
        }
      } else {
        setProfile(null);
      }

      if (followersRes.ok) {
        const result = await followersRes.json();
        followersData = result.followers || [];
        setFollowers(followersData);
      }

      if (followingRes.ok) {
        const result = await followingRes.json();
        followingData = result.following || [];
        setFollowing(followingData);
      }

      // Cache the data
      if (profileData) {
        setCachedProfile({
          profile: profileData,
          followers: followersData,
          following: followingData
        });
      }
    } catch (error) {
      console.error("Error fetching profile or counts:", error);
    } finally {
      setLoading(false);
      setButtonLoading(false);
    }
  }, [username, API_BASE, fetchWithAuth, getCachedProfile, setCachedProfile]);

  // Fetch posts for this user with abort controller
  const fetchPosts = useCallback(async (profileId, signal) => {
    if (!profileId) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/posts/by-userid/${profileId}`, { signal });
      if (res.ok && !signal.aborted) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching posts:", error);
      }
    } finally {
      setLoadingPosts(false);
    }
  }, [API_BASE]);

  // Fetch profile and counts when username changes
  useEffect(() => {
    if (username) {
      fetchProfileAndCounts();
    }
  }, [username, fetchProfileAndCounts]);

  // Clear posts when username changes to prevent flash of previous user's posts
  useEffect(() => {
    setPosts([]);
  }, [username]);

  // Clear posts when profile changes (e.g., after switching users)
  useEffect(() => {
    setPosts([]);
  }, [profile?._id]);

  // Fetch posts when profile is available
  useEffect(() => {
    const controller = new AbortController();
    
    if (profile?._id) {
      fetchPosts(profile._id, controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [profile?._id, fetchPosts]);

  // Check if current user is following the profile user
  useEffect(() => {
    if (!currentUser || !profile) {
      setIsFollowing(false);
      return;
    }
    
    const followersHashed = Array.isArray(profile.followersHashed) ? profile.followersHashed : [];
    const currentUserId = String(currentUser._id || currentUser.id);
    const hashedCurrentUserId = hashId(currentUserId);
    
    setIsFollowing(followersHashed.includes(hashedCurrentUserId));
  }, [profile, currentUser]);

  // Like handler with debugging
  const handleLike = useCallback(async (postId, newLiked) => {
    // Only update the like button and count optimistically
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post._id === postId
          ? {
              ...post,
              likes: newLiked
                ? [...(post.likes || []), currentUser._id || currentUser.id]
                : (post.likes || []).filter(likeId => String(likeId) !== String(currentUser._id || currentUser.id))
            }
          : post
      )
    );
    try {
      const url = `${API_BASE}/posts/${postId}/like`;
      const response = await fetchWithAuth(url, { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to update like");
      }
      const updatedPost = await response.json();
      // Only update likes from server response
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? { ...post, likes: updatedPost.likes }
            : post
        )
      );
    } catch (error) {
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? {
                ...post,
                likes: !newLiked
                  ? [...(post.likes || []), currentUser._id || currentUser.id]
                  : (post.likes || []).filter(likeId => String(likeId) !== String(currentUser._id || currentUser.id))
              }
            : post
        )
      );
    }
  }, [API_BASE, fetchWithAuth, currentUser]);

  // Comment handler
  const handleComment = useCallback(async (postId, content) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prevPosts =>
          prevPosts.map(post => (post._id === postId ? updatedPost : post))
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }, [API_BASE, fetchWithAuth]);

  // Follow handler
  const handleFollow = useCallback(async () => {
    setFollowLoading(true);
    
    setIsFollowing(true);
    setProfile(prev => ({
      ...prev,
      followers: (prev.followers || 0) + 1,
      followersHashed: [
        ...(prev.followersHashed || []), 
        hashId(String(currentUser._id || currentUser.id))
      ]
    }));

    try {
      const response = await fetchWithAuth(`${API_BASE}/user/follow/${profile._id}`, { method: "POST" });

      if (!response.ok) {
        setIsFollowing(false);
        setProfile(prev => ({
          ...prev,
          followers: (prev.followers || 1) - 1,
          followersHashed: (prev.followersHashed || []).filter(
            id => id !== hashId(String(currentUser._id || currentUser.id))
          )
        }));
      } else {
        profileCache.delete(cacheKey);
      }
    } catch (error) {
      console.error("Error following user:", error);
      setIsFollowing(false);
      setProfile(prev => ({
        ...prev,
        followers: (prev.followers || 1) - 1
      }));
    } finally {
      setFollowLoading(false);
    }
  }, [profile, API_BASE, fetchWithAuth, currentUser, cacheKey]);

  // Unfollow handler
  const handleUnfollow = useCallback(async () => {
    setFollowLoading(true);
    
    setIsFollowing(false);
    setProfile(prev => ({
      ...prev,
      followers: Math.max((prev.followers || 1) - 1, 0),
      followersHashed: (prev.followersHashed || []).filter(
        id => id !== hashId(String(currentUser._id || currentUser.id))
      )
    }));

    try {
      const response = await fetchWithAuth(`${API_BASE}/user/unfollow/${profile._id}`, { method: "POST" });

      if (!response.ok) {
        setIsFollowing(true);
        setProfile(prev => ({
          ...prev,
          followers: (prev.followers || 0) + 1,
          followersHashed: [
            ...(prev.followersHashed || []), 
            hashId(String(currentUser._id || currentUser.id))
          ]
        }));
      } else {
        profileCache.delete(cacheKey);
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      setIsFollowing(true);
      setProfile(prev => ({
        ...prev,
        followers: (prev.followers || 0) + 1
      }));
    } finally {
      setFollowLoading(false);
    }
  }, [profile, API_BASE, fetchWithAuth, currentUser, cacheKey]);

  const handleMessage = useCallback(() => {
    navigate(`/dashboard/inbox?chat=${encodeURIComponent(profile.username)}`);
  }, [navigate, profile?.username]);

  // Reply handler
  const handleReply = useCallback(async (postId, replyText, commentId) => {
    // Handle reply logic - you can implement this based on your API
    console.log('Reply:', { postId, replyText, commentId });
  }, []);

  // View handler - Actually implement API call
  const handleView = useCallback(async (postId) => {
    // Extract original ID if it's a cycled post
    const originalPostId = postId.includes('_cycle_') ? postId.split('_cycle_')[0] : postId;
    
    try {
      await fetchWithAuth(`${API_BASE}/posts/${originalPostId}/view`, { method: "POST" });
    } catch (error) {
      console.error("Error tracking view:", error);
      // Ignore view tracking errors silently
    }
  }, [API_BASE, fetchWithAuth]);

  // Delete post handler
  const handleDeletePost = useCallback(async (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
  }, []);

  // Add debug logs for post, comment, and reply author profile images
  useEffect(() => {
    if (posts && posts.length > 0) {
      posts.forEach((post, i) => {
        console.log(`[UserProfile DEBUG] Post[${i}] author:`, post.author);
        console.log(`[UserProfile DEBUG] Post[${i}] author.profile:`, post.author?.profile);
        console.log(`[UserProfile DEBUG] Post[${i}] author.profileImage:`, post.author?.profile?.profileImage);
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach((comment, j) => {
            console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] author:`, comment.author);
            console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] author.profile:`, comment.author?.profile);
            console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] author.profileImage:`, comment.author?.profile?.profileImage);
            if (comment.replies && comment.replies.length > 0) {
              comment.replies.forEach((reply, k) => {
                console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] Reply[${k}] author:`, reply.author);
                console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] Reply[${k}] author.profile:`, reply.author?.profile);
                console.log(`[UserProfile DEBUG] Post[${i}] Comment[${j}] Reply[${k}] author.profileImage:`, reply.author?.profile?.profileImage);
              });
            }
          });
        }
      });
    }
  }, [posts]);

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
    <div style={{ backgroundColor: "inherit" }} className="w-full max-w-full overflow-x-hidden">
      <div className="max-w-2xl mx-auto p-4 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col items-center gap-2 mb-4" style={{ marginTop: "12px" }}>
          {/* Top row: Arrow | Avatar | Username+Badge */}
          <div className="flex gap-8">
            {/* Arrow on the left */}
            <span className="flex items-center cursor-pointer" onClick={() => navigate(-1)}>
              <FaArrowLeft className="text-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition" />
            </span>
            {/* Avatar next to arrow */}
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.profile?.profileImage ? (
                  <img
                    src={profile.profile.profileImage}
                    alt={profile.username + "'s profile"}
                    className="w-full h-full object-cover rounded-full"
                    style={{ minWidth: 0, minHeight: 0 }}
                  />
                ) : (
                  <FaUser className="text-3xl text-gray-400 dark:text-gray-500" />
                )}
              </div>
            </div>
            {/* Username+Badge to the right of avatar */}
            <div className="flex flex-col justify-center flex-grow">
              <span className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white break-all">
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
          <div className="w-full mt-4 max-w-full overflow-x-hidden">
            <div className="flex-1 overflow-y-auto hide-scrollbar w-full max-w-full overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {activeTab === "posts" && (
                <>
                  {loadingPosts ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] py-12">
                      <FaEnvelope className="hidden" /> {/* To ensure icon font loads if not already */}
                      <svg className="animate-spin text-3xl text-gray-400 mb-4" style={{ width: '2em', height: '2em' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      <span className="text-lg text-gray-600 dark:text-gray-300 font-medium">Loading posts...</span>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">No posts yet.</div>
                  ) : (
                    <div className="w-full max-w-full overflow-x-hidden">
                      <div className="w-full max-w-full overflow-x-hidden space-y-6">
                        {posts
                          .filter((post) => post.createdAt)
                          .sort((a, b) => {
                            const dateA = new Date(a.createdAt);
                            const dateB = new Date(b.createdAt);
                            if (isNaN(dateA) || isNaN(dateB)) return 0;
                            return dateB - dateA;
                          })
                          .slice(0, 70)
                          .map((post) => (
                            <div key={post._id} className="w-full max-w-full overflow-x-hidden">
                              <ChatPost
                                post={post}
                                onReply={handleReply}
                                onComment={handleComment}
                                onLike={handleLike}
                                onView={handleView}
                                onDelete={handleDeletePost}
                                currentUserId={currentUser?._id}
                                currentUsername={currentUser?.username}
                                currentUserVerified={currentUser?.verified}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
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
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
    </div>
  );
}