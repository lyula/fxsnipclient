import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";

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
          postRefs.current[postId].scrollIntoView({ behavior: "smooth", block: "center" });
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
        setActiveTab("forYou"); // This will trigger the useEffect to refetch posts
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
        if (activeTab === "forYou") {
          const refreshed = await fetch(`${API_BASE}/posts`);
          if (refreshed.ok) setPostsForYou(await refreshed.json());
        }
      } else {
        console.error("Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
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
        if (activeTab === "forYou") {
          const refreshed = await fetch(`${API_BASE}/posts`);
          if (refreshed.ok) setPostsForYou(await refreshed.json());
        }
      } else {
        console.error("Failed to add reply");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  // Like a post
  const handleLike = async (postId) => {
    // Optimistically update the UI
    setPostsForYou((prevPosts) =>
      prevPosts.map((post) =>
        post._id === postId
          ? {
              ...post,
              likes: Array.isArray(post.likes)
                ? [...post.likes, user._id] // Add current user's ID
                : [user._id],
            }
          : post
      )
    );

    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) {
        // If backend fails, revert the optimistic update
        setPostsForYou((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  likes: Array.isArray(post.likes)
                    ? post.likes.filter((id) => id !== user._id)
                    : [],
                }
              : post
          )
        );
        console.error("Failed to like post");
      }
      // Optionally, you can refetch posts here if you want to ensure full sync
    } catch (error) {
      // Revert optimistic update on error
      setPostsForYou((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: Array.isArray(post.likes)
                  ? post.likes.filter((id) => id !== user._id)
                  : [],
              }
            : post
        )
      );
      console.error("Error liking post:", error);
    }
  };

  // View a post (local state only)
  const handleView = (postId) => {
    // Optionally implement view tracking logic here
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
      <div className="flex-1 overflow-y-auto px-2 py-4 bg-gray-50 dark:bg-gray-800 scrollbar-hide">
        {activeTab === "following" && (
          <div className="mb-4">
            <UserSearch currentUser={user} />
          </div>
        )}
        <ChatList
          posts={
            activeTab === "forYou"
              ? [...postsForYou]
                  .filter((post) => post.createdAt)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              : postsFollowing
          }
          postRefs={postRefs}
          onReply={handleReply}
          onComment={handleComment}
          onLike={handleLike}
          onView={handleView}
          currentUserId={user?._id}
        />
      </div>
    </div>
  );
}