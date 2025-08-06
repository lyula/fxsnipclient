
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Register
export async function registerUser(data) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Login
export async function loginUser(data) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server error: " + text);
  }
}

// Get Profile
export async function getProfile() {
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Update Profile
export async function updateProfile(data) {
  const res = await fetch(`${API_BASE}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Follow a user
export async function followUser(userId) {
  if (!userId) throw new Error("User ID is required");
  const res = await fetch(`${API_BASE}/user/follow/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

// Unfollow a user
export async function unfollowUser(userId) {
  if (!userId) throw new Error("User ID is required");
  const res = await fetch(`${API_BASE}/user/unfollow/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

// Get current user's following list
export async function getCurrentUserFollowing() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error('No authentication token found');
    }

    // First get current user's profile to get username
    const profileRes = await fetch(`${API_BASE}/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!profileRes.ok) {
      if (profileRes.status === 401) {
        throw new Error('Authentication failed - token may be invalid or expired (401)');
      }
      throw new Error(`Failed to get user profile (${profileRes.status})`);
    }
    
    const profile = await profileRes.json();
    if (!profile || !profile.username) {
      throw new Error('No username found in profile');
    }
    
    console.log('[API] Got user profile, fetching following list for:', profile.username);
    
    // Then get following list using username
    const followingRes = await fetch(`${API_BASE}/user/following/${profile.username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!followingRes.ok) {
      if (followingRes.status === 401) {
        throw new Error('Authentication failed - token may be invalid or expired (401)');
      }
      throw new Error(`Failed to get following list (${followingRes.status})`);
    }
    
    const data = await followingRes.json();
    console.log('[API] Following list response:', data);
    return data.following || [];
  } catch (error) {
    console.error('Error fetching current user following:', error);
    throw error; // Re-throw to let caller handle it
  }
}

// Search users by username or email
export async function searchUsers(query) {
  const res = await fetch(
    `${API_BASE}/user/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  return res.json();
}

// Send a message
export async function sendMessage(to, text) {
  const res = await fetch(`${API_BASE}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ to, text }),
  });
  return res.json();
}

// Get conversation with a user
export async function getConversation(userId) {
  const res = await fetch(`${API_BASE}/message/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Get all conversations
export async function getConversations() {
  const res = await fetch(`${API_BASE}/message`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Get notifications
export async function getNotifications() {
  const res = await fetch(`${API_BASE}/user/notifications`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Get unread notification count
export async function getUnreadNotificationCount() {
  const res = await fetch(`${API_BASE}/user/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Mark all notifications as read
export async function markNotificationsRead() {
  const res = await fetch(`${API_BASE}/user/notifications/mark-read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Add a comment to a post
export async function addCommentToPost(postId, content) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content }), // <-- use content, not text
  });
  return res.json();
}

// Like a post
export async function likePost(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Increment post views
export async function incrementPostViews(postId) {
  if (!postId) throw new Error("Post ID is required");
  const res = await fetch(`${API_BASE}/posts/${postId}/view`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to increment post views");
  return res.json();
}

// Like a comment
export async function likeComment(postId, commentId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Like a reply
export async function likeReply(postId, commentId, replyId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Edit a post
export async function editPost(postId, content, image) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content, image }),
  });
  return res.json();
}

// Delete a post
export async function deletePost(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Edit a comment
export async function editComment(postId, commentId, content) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

// Delete a comment
export async function deleteComment(postId, commentId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Edit a reply
export async function editReply(postId, commentId, replyId, content) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

// Delete a reply
export async function deleteReply(postId, commentId, replyId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Create a post
export async function createPost(content, image) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content, image }),
  });
  return res.json();
}

// Add this to api.js
export async function addReplyToComment(postId, commentId, content) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

// Get unread conversation count
export async function getUnreadConversationCount() {
  const res = await fetch(`${API_BASE}/message/unread-count`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Get users who liked a post
export async function getPostLikes(postId, limit = 100) {
  const res = await fetch(`${API_BASE}/posts/${postId}/likes?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Get latest badge payment for current user
export async function getLatestBadgePayment() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const res = await fetchWithAuth(`${API_BASE}/badge-payments/latest`);
  return res.json();
}

// Helper to always add Authorization header to fetch
export function fetchWithAuth(url, options = {}) {
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
}

// Get profile images for a list of user IDs or usernames
export async function getProfileImages({ userIds = [], usernames = [] }) {
  const res = await fetch(`${API_BASE}/user/profile-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ userIds, usernames }),
  });
  return res.json();
}

// Increment share count for a post
export async function incrementPostShareCount(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to increment share count");
  return res.json();
}

// Search posts by content or author username
export async function searchPosts(query, limit = 20, offset = 0) {
  const res = await fetch(
    `${API_BASE}/posts/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  return res.json();
}

// Get profile suggestions for a user
export async function getProfileSuggestions(userId) {
  const res = await fetch(`${API_BASE}/user/suggestions/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (!res.ok) throw new Error("Failed to get profile suggestions");
  return res.json();
}