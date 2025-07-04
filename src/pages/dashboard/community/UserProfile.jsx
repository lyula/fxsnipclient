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
  }, []);

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
    
    // Use localStorage to track viewed profiles
    const viewedProfiles = JSON.parse(localStorage.getItem("viewedProfiles") || "[]");
    
    // Only track if not already viewed and not viewing own profile
    if (!viewedProfiles.includes(viewKey) && String(currentUser._id || currentUser.id) !== String(profileId)) {
      viewedProfiles.push(viewKey);
      localStorage.setItem("viewedProfiles", JSON.stringify(viewedProfiles));
      
      // Call API in background
      fetch(`${API_BASE}/user/view/${profileId}`, {
        method: "POST",
        headers: authHeaders,
      }).catch(() => {}); // Ignore errors
    }
  };

  // Fetch profile and counts
  const fetchProfileAndCounts = useCallback(async () => {
    setLoading(true);
    setButtonLoading(true);

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
        fetch(`${API_BASE}/user/public/${encodeURIComponent(username)}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`),
        fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
          headers: authHeaders,
        })
      ]);

      // Process responses
      let profileData = null;
      let followersData = [];
      let followingData = [];

      if (profileRes.ok) {
        profileData = await profileRes.json();
        setProfile(profileData);
        
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
  }, [username, API_BASE, authHeaders, getCachedProfile, setCachedProfile]);

  // Fetch posts for this user with abort controller
  const fetchPosts = useCallback(async (profileId, signal) => {
    if (!profileId) return;
    
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
    }
  }, [API_BASE]);

  // Fetch profile and counts when username changes
  useEffect(() => {
    if (username) {
      fetchProfileAndCounts();
    }
  }, [username, fetchProfileAndCounts]);

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
  const handleLike = useCallback(async (postId) => {
    console.log('handleLike called with postId:', postId);
    
    // Extract original ID if it's a cycled post
    const originalPostId = postId.includes('_cycle_') ? postId.split('_cycle_')[0] : postId;
    console.log('originalPostId:', originalPostId);
    
    // Check if currently liked
    const currentPost = posts.find(post => post._id === postId);
    const currentUserId = currentUser._id || currentUser.id;
    const isCurrentlyLiked = currentPost?.likes?.some(likeId => String(likeId) === String(currentUserId));
    
    console.log('currentPost likes:', currentPost?.likes);
    console.log('currentUserId:', currentUserId);
    console.log('isCurrentlyLiked:', isCurrentlyLiked);
    
    // Optimistic update - toggle the like
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post._id === postId 
          ? { 
              ...post, 
              likes: isCurrentlyLiked 
                ? (post.likes || []).filter(likeId => String(likeId) !== String(currentUserId))
                : [...(post.likes || []), currentUserId]
            }
          : post
      )
    );

    try {
      const url = `${API_BASE}/posts/${originalPostId}/like`;
      console.log('Making request to:', url);
      console.log('With headers:', authHeaders);
      
      const response = await fetch(url, {
        method: "POST",
        headers: authHeaders,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Get the updated post data from server
      const updatedPost = await response.json();
      
      // Update with server response
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId 
            ? { ...post, likes: updatedPost.likes }
            : post
        )
      );

    } catch (error) {
      console.error("Full error details:", error);
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId 
            ? { 
                ...post, 
                likes: isCurrentlyLiked
                  ? [...(post.likes || []), currentUserId]  // Revert: add back if was liked
                  : (post.likes || []).filter(likeId => String(likeId) !== String(currentUserId)) // Revert: remove if wasn't liked
              }
            : post
        )
      );
    }
  }, [API_BASE, authHeaders, currentUser, posts]);

  // Comment handler
  const handleComment = useCallback(async (postId, content) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
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
  }, [API_BASE, authHeaders]);

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
      const response = await fetch(`${API_BASE}/user/follow/${profile._id}`, {
        method: "POST",
        headers: authHeaders,
      });

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
  }, [profile, API_BASE, authHeaders, currentUser, cacheKey]);

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
      const response = await fetch(`${API_BASE}/user/unfollow/${profile._id}`, {
        method: "POST",
        headers: authHeaders,
      });

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
  }, [profile, API_BASE, authHeaders, currentUser, cacheKey]);

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
      await fetch(`${API_BASE}/posts/${originalPostId}/view`, {
        method: "POST",
        headers: authHeaders,
      });
    } catch (error) {
      console.error("Error tracking view:", error);
      // Ignore view tracking errors silently
    }
  }, [API_BASE, authHeaders]);

  // Delete post handler
  const handleDeletePost = useCallback(async (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
  }, []);

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
          <div className="w-full mt-4">
            <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                        <div key={post._id}>
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