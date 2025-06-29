import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import { incrementPostViews } from "../../utils/api";
import { useDashboard } from "../../context/dashboard";

export default function Community({ user }) {
  const [activeTab, setActiveTab] = useState("forYou");
  const [showCreate, setShowCreate] = useState(false);
  const [postsFollowing, setPostsFollowing] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const location = useLocation();
  const postRefs = useRef({});

  // Use Dashboard Context instead of local state for posts
  const {
    communityPosts,
    fetchCommunityPosts,
    loadingStates,
    addPostOptimistically,
    updatePost,
    deletePost
  } = useDashboard();

  // Load posts on mount (with caching)
  useEffect(() => {
    fetchCommunityPosts();
  }, [fetchCommunityPosts]);

  // Scroll to post if postId is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("postId");
    if (postId) {
      setActiveTab("forYou");
      setTimeout(() => {
        if (postRefs.current[postId]) {
          postRefs.current[postId].scrollIntoView({ behavior: "auto", block: "center" });
        }
      }, 300); // Wait for posts to render
    }
  }, [location.search, communityPosts]);

  // Create a new post with optimistic updates
  const handleNewPost = async (content, image) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticPost = {
      _id: tempId,
      content,
      image,
      author: {
        _id: user._id,
        username: user.username,
        verified: user.verified,
        countryFlag: user.countryFlag
      },
      likes: [],
      comments: [],
      views: 0,
      createdAt: new Date().toISOString(),
      sending: true
    };

    // Add optimistically
    addPostOptimistically(optimisticPost);
    setActiveTab("forYou");
    setShowCreate(false);

    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, image }),
      });
      
      if (res.ok) {
        const newPost = await res.json();
        // Replace optimistic post with real post
        updatePost(tempId, { ...newPost, sending: false });
      } else {
        // Mark as failed
        updatePost(tempId, { ...optimisticPost, sending: false, failed: true });
        console.error("Failed to create post");
      }
    } catch (error) {
      // Mark as failed
      updatePost(tempId, { ...optimisticPost, sending: false, failed: true });
      console.error("Error creating post:", error);
    }
  };

  // Add a comment to a post
  const handleComment = async (postId, commentContent) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentContent }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update cached post
        updatePost(postId, data);
        return data; // Return the updated post
      } else {
        console.error("Failed to add comment");
        return null;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  };

  // Add a reply to a comment
  const handleReply = async (postId, replyContent, commentId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update cached post
        updatePost(postId, data);
        return data; // Return the updated post
      } else {
        console.error("Failed to add reply");
        return null;
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      return null;
    }
  };

  // Like a post (Let ChatPost handle optimistic updates)
  const handleLike = async (postId) => {
    // Don't do optimistic updates here - let ChatPost handle it
    // Just call the API - ChatPost already handles the optimistic updates
    return; // ChatPost handles everything
  };

  // View a post (local state only)
  const handleView = async (postId) => {
    if (!postId) return;

    // Use localStorage to track viewed posts
    const viewedPosts = JSON.parse(localStorage.getItem("viewedPosts") || "[]");
    if (!viewedPosts.includes(postId)) {
      viewedPosts.push(postId);
      localStorage.setItem("viewedPosts", JSON.stringify(viewedPosts));

      // Update view count in cache
      const post = communityPosts.find(p => p._id === postId);
      if (post) {
        updatePost(postId, { ...post, views: (post.views || 0) + 1 });
      }

      // Call API in background
      try {
        await incrementPostViews(postId);
      } catch (error) {
        console.error("Error incrementing post views:", error);
      }
    }
  };

  // Delete a post
  const handleDeletePost = async (postId) => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        // Remove from cache
        deletePost(postId);
      } else {
        console.error("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  // Show cached data immediately with background refresh indicator
  const showLoading = loadingStates.posts && communityPosts.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      <CommunityTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreatePost={() => setShowCreate(true)}
      />
      {showCreate && (
        <CreatePostBox
          onPost={handleNewPost}
          onClose={() => setShowCreate(false)}
        />
      )}
      <div className="flex-1 overflow-y-auto px-2 py-4 bg-gray-50 dark:bg-gray-800 hide-scrollbar">
        {/* Loading indicator for background refresh */}
        {loadingStates.posts && communityPosts.length > 0 && (
          <div className="mb-4 p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-center text-sm rounded">
            Refreshing posts...
          </div>
        )}

        {showLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading posts...
          </div>
        ) : activeTab === "following" ? (
          <UserSearch currentUser={user} />
        ) : communityPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No posts yet. Be the first to share something!
          </div>
        ) : (
          <ChatList
            posts={communityPosts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
            postRefs={postRefs}
            onReply={handleReply}
            onComment={handleComment}
            onLike={handleLike}
            onView={handleView}
            onDelete={handleDeletePost}
            currentUserId={user?._id}
            currentUsername={user?.username}
            currentUserVerified={user?.verified}
          />
        )}
      </div>

      {/* Floating Create Post Button */}
      <button
        className="fixed bottom-20 sm:bottom-8 right-8 md:right-24 z-50 flex items-center gap-2 px-5 py-3 bg-[#a99d6b] text-white rounded-full font-semibold shadow-lg hover:bg-[#c2b77a] transition"
        onClick={() => setShowCreate(true)}
      >
        <FaPlus className="text-lg" />
        <span className="hidden sm:inline">Create Post</span>
      </button>

      {/* Post Modal */}
      {showCreate && (
        <CreatePostBox
          onPost={(content, image, video) => {
            handleNewPost(content, image, video);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}