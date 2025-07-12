import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostInteractionBar from '../components/PostInteractionBar';
import VerifiedBadge from '../components/VerifiedBadge';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/auth$/, '');

export default function PublicPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    setIsAuthenticated(!!token && !!userId);
  }, []);

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/posts/${postId}`);
        if (!res.ok) throw new Error('Post not found');
        const data = await res.json();
        setPost(data.post || data);
      } catch (e) {
        setError(e.message || 'Error loading post');
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  // If authenticated, optionally redirect to main feed or show full post
  useEffect(() => {
    if (isAuthenticated && post) {
      // Optionally: navigate(`/dashboard/community?highlight=${postId}`);
      // Or just show the post with full interaction
    }
  }, [isAuthenticated, post, postId, navigate]);

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-8">{error}</div>;
  if (!post) return null;

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        {/* Author profile image and clickable username */}
        {post.author?.profileImage ? (
          <img
            src={post.author.profileImage}
            alt="Profile"
            className="w-10 h-10 rounded-full mr-3 cursor-pointer"
            onClick={() => post.author?._id && navigate(`/user-profile/${post.author._id}`)}
            title="View profile"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-3 cursor-pointer"
            onClick={() => post.author?._id && navigate(`/user-profile/${post.author._id}`)}
            title="View profile"
          >
            <span className="text-gray-600 dark:text-gray-300 text-xl font-bold">{post.author?.username?.[0]?.toUpperCase() || '?'}</span>
          </div>
        )}
        <div>
          <span
            className="font-semibold text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
            onClick={() => post.author?._id && navigate(`/user-profile/${post.author._id}`)}
            title="View profile"
          >
            {post.author?.username || 'Unknown'}
          </span>
          {post.author?.verified && <VerifiedBadge className="ml-1" />}
        </div>
      </div>
      <div className="mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-line">{post.content}</div>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="rounded-lg mb-4 max-h-96 object-contain mx-auto" />
      )}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(post.createdAt).toLocaleString()}</div>
      {/* Only show interaction bar if authenticated, else show read-only info */}
      {isAuthenticated ? (
        <PostInteractionBar post={post} />
      ) : (
        <div className="flex space-x-6 mt-4 text-gray-500 dark:text-gray-400">
          <span>Likes: {post.likes?.length || 0}</span>
          <span>Comments: {post.comments?.length || 0}</span>
          <span>Views: {post.views || 0}</span>
        </div>
      )}
      {!isAuthenticated && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <span>Sign up or log in to like, comment, or share this post.</span>
          <div className="mt-4 flex justify-center gap-4">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={() => navigate('/register')}
            >
              Create Account
            </button>
            <button
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
              onClick={() => navigate('/login')}
            >
              Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
