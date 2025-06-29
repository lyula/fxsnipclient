import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaUser } from "react-icons/fa";
import { formatCount } from "../../../utils/formatNumber";
import VerifiedBadge from "../../../components/VerifiedBadge";
import Post from "../../../components/common/Post";
import { useAuth } from "../../../context/auth";
import { hashId } from "../../../utils/hash";

// Profile cache to avoid refetching same data
const profileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track viewed profiles and posts to prevent multiple views per session
const viewedProfiles = new Set();
const viewedPosts = new Set();

// Post view tracking component
const PostViewTracker = ({ post, onView, children }) => {
  const elementRef = useRef(null);
  const hasBeenViewed = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasBeenViewed.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Post is 50% visible
            if (!hasBeenViewed.current && !viewedPosts.has(post._id)) {
              hasBeenViewed.current = true;
              viewedPosts.add(post._id);
              onView(post._id);
            }
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the post is visible
        rootMargin: '0px'
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [post._id, onView]);

  return (
    <div ref={elementRef}>
      {children}
    </div>
  );
};

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

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }), []);

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

  // Track profile view (only once per session per profile)
  const trackProfileView = useCallback(async (profileId) => {
    const viewKey = `${profileId}_${currentUser?._id || 'anonymous'}`;
    
    // Only track if not already viewed in this session and not viewing own profile
    if (!viewedProfiles.has(viewKey) && currentUser?._id !== profileId) {
      viewedProfiles.add(viewKey);
      
      try {
        await fetch(`${API_BASE}/user/view/${profileId}`, {
          method: "POST",
          headers: authHeaders,
        });
      } catch (error) {
        console.error("Error tracking profile view:", error);
      }
    }
  }, [API_BASE, authHeaders, currentUser]);

  // Track post view (only once per session per post)
  const trackPostView = useCallback(async (postId) => {
    if (!currentUser) return; // Only track for logged-in users
    
    try {
      const response = await fetch(`${API_BASE}/posts/${postId}/view`, {
        method: "POST",
        headers: authHeaders,
      });
      
      if (response.ok) {
        // Optimistically update local post view count
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId 
              ? { ...post, views: (post.views || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error tracking post view:", error);
    }
  }, [API_BASE, authHeaders, currentUser]);

  // Fetch profile, followers, and following with parallel execution and caching
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
      
      // Track view for cached profile too
      if (cached.profile?._id) {
        trackProfileView(cached.profile._id);
      }
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
  }, [username, API_BASE, authHeaders, getCachedProfile, setCachedProfile, trackProfileView]);

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

  // Main effect - fetch profile data and posts in parallel
  useEffect(() => {
    const controller = new AbortController();
    
    const loadData = async () => {
      await fetchProfileAndCounts();
    };

    loadData();

    return () => {
      controller.abort();
    };
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

  // Check if current user is following the profile user - memoized for performance
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

  // Optimized like handler with optimistic updates
  const handleLike = useCallback(async (postId) => {
    // Optimistic update
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post._id === postId 
          ? { ...post, likes: [...post.likes, currentUser._id || currentUser.id] }
          : post
      )
    );

    try {
      await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders,
      });
    } catch (error) {
      console.error("Error liking post:", error);
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId 
            ? { ...post, likes: post.likes.filter(id => id !== (currentUser._id || currentUser.id)) }
            : post
        )
      );
    }
  }, [API_BASE, authHeaders, currentUser]);

  // Optimized comment handler
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

  // Optimized follow handler with optimistic updates and cache invalidation
  const handleFollow = useCallback(async () => {
    setFollowLoading(true);
    
    // Optimistic update
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
        // Revert optimistic update on error
        setIsFollowing(false);
        setProfile(prev => ({
          ...prev,
          followers: (prev.followers || 1) - 1,
          followersHashed: (prev.followersHashed || []).filter(
            id => id !== hashId(String(currentUser._id || currentUser.id))
          )
        }));
      } else {
        // Clear cache for fresh data next time
        profileCache.delete(cacheKey);
      }
    } catch (error) {
      console.error("Error following user:", error);
      // Revert optimistic update on error
      setIsFollowing(false);
      setProfile(prev => ({
        ...prev,
        followers: (prev.followers || 1) - 1
      }));
    } finally {
      setFollowLoading(false);
    }
  }, [profile, API_BASE, authHeaders, currentUser, cacheKey]);

  // Optimized unfollow handler with optimistic updates and cache invalidation
  const handleUnfollow = useCallback(async () => {
    setFollowLoading(true);
    
    // Optimistic update
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
        // Revert optimistic update on error
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
        // Clear cache for fresh data next time
        profileCache.delete(cacheKey);
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      // Revert optimistic update on error
      setIsFollowing(true);
      setProfile(prev => ({
        ...prev,
        followers: (prev.followers || 0) + 1
      }));
    } finally {
      setFollowLoading(false);
    }
  }, [profile, API_BASE, authHeaders, currentUser, cacheKey]);

  // Handle message button click - memoized
  const handleMessage = useCallback(() => {
    navigate(`/dashboard/inbox?chat=${encodeURIComponent(profile.username)}`);
  }, [navigate, profile?.username]);

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
                        <PostViewTracker 
                          key={post._id} 
                          post={post} 
                          onView={trackPostView}
                        >
                          <Link
                            to={`/dashboard/community?postId=${post._id}`}
                            style={{ display: "block", textDecoration: "none" }}
                          >
                            <Post post={post} onLike={handleLike} onComment={handleComment} />
                          </Link>
                        </PostViewTracker>
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