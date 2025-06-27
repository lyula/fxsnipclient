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

  // Handlers for posts
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

  const handleReply = (postId, replyContent) => {
    const updatePosts = (posts) =>
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: [
                ...post.replies,
                { user: user?.username || "You", content: replyContent, timestamp: "Now" },
              ],
            }
          : post
      );
    if (activeTab === "forYou") setPostsForYou(updatePosts(postsForYou));
    else setPostsFollowing(updatePosts(postsFollowing));
  };

  const handleComment = (postId, commentContent) => {
    const updatePosts = (posts) =>
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                { user: user?.username || "You", content: commentContent, timestamp: "Now" },
              ],
            }
          : post
      );
    if (activeTab === "forYou") setPostsForYou(updatePosts(postsForYou));
    else setPostsFollowing(updatePosts(postsFollowing));
  };

  const handleLike = (postId) => {
    const updatePosts = (posts) =>
      posts.map((post) =>
        post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post
      );
    if (activeTab === "forYou") setPostsForYou(updatePosts(postsForYou));
    else setPostsFollowing(updatePosts(postsFollowing));
  };

  const handleView = (postId) => {
    const updatePosts = (posts) =>
      posts.map((post) =>
        post.id === postId ? { ...post, views: (post.views || 0) + 1 } : post
      );
    if (activeTab === "forYou") setPostsForYou(updatePosts(postsForYou));
    else setPostsFollowing(updatePosts(postsFollowing));
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
          posts={activeTab === "forYou" ? postsForYou : postsFollowing}
          postRefs={postRefs}
          onReply={handleReply}
          onComment={handleComment}
          onLike={handleLike}
          onView={handleView}
        />
      </div>
    </div>
  );
}