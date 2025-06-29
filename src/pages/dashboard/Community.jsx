import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";
import { incrementPostViews } from "../../utils/api";

export default function Community({ user }) {
  const [activeTab, setActiveTab] = useState("forYou");
  const [showCreate, setShowCreate] = useState(false);
  const [postsForYou, setPostsForYou] = useState([]);
  const [postsFollowing, setPostsFollowing] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const location = useLocation();
  const postRefs = useRef({});

  // Fetch posts from backend for "For You" tab
  useEffect(() => {
    if (activeTab === "forYou") {
      const fetchPosts = async () => {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
        try {
          const res = await fetch(`${API_BASE}/posts`);
          if (res.ok) {
            const data = await res.json();
            setPostsForYou(data);
          }
        } catch (error) {
          console.error("Error fetching posts:", error);
        }
      };
      fetchPosts();
    }
  }, [activeTab]);

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
  }, [location.search, postsForYou]);

  // Create a new post
  const handleNewPost = async (content, image) => {
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
        setPostsForYou((prevPosts) => [newPost, ...prevPosts]);
        setActiveTab("forYou");
        setShowCreate(false);
      } else {
        console.error("Failed to create post");
      }
    } catch (error) {
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
        // Update local state
        setPostsForYou((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId ? data : post
          )
        );
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
        // Update local state
        setPostsForYou((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId ? data : post
          )
        );
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
    const viewedKey = "viewedPosts";
    let viewedPosts = [];
    try {
      viewedPosts = JSON.parse(localStorage.getItem(viewedKey)) || [];
    } catch {
      viewedPosts = [];
    }

    // If already viewed, do nothing
    if (viewedPosts.includes(postId)) return;

    // Mark as viewed in localStorage
    viewedPosts.push(postId);
    localStorage.setItem(viewedKey, JSON.stringify(viewedPosts));

    // Optimistically update local state
    setPostsForYou((prevPosts) =>
      prevPosts.map((post) =>
        post._id === postId
          ? { ...post, views: (post.views || 0) + 1 }
          : post
      )
    );

    // Update backend and sync view count
    try {
      const res = await incrementPostViews(postId);
      setPostsForYou((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? { ...post, views: res.views }
            : post
        )
      );
    } catch (e) {
      console.error("Failed to increment post views", e);
    }
  };

  // Delete a post
  const handleDeletePost = (postId) => {
    setPostsForYou((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  return (
    <div className="flex flex-col h-full max-h-full">
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
        {activeTab === "following" && <UserSearch currentUser={user} />}
        <ChatList
          posts={
            activeTab === "forYou"
              ? [...postsForYou]
                  .filter((post) => post._id && post.createdAt)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              : postsFollowing
          }
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