const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

// Register
export async function registerUser(data) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Login
export async function loginUser(data) {
  const res = await fetch(`${BASE_URL}/login`, {
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
  const res = await fetch(`${BASE_URL.replace("/auth", "")}/user/profile`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
}

// Update Profile
export async function updateProfile(data) {
  const res = await fetch(`${BASE_URL.replace("/auth", "")}/user/profile`, {
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
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
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
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
  const res = await fetch(`${API_BASE}/user/unfollow/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

// Search users by username or email
export async function searchUsers(query) {
  const res = await fetch(
    `${BASE_URL.replace("/auth", "")}/user/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  return res.json();
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");

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
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
  const res = await fetch(`${API_BASE}/user/notifications`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Get unread notification count
export async function getUnreadNotificationCount() {
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
  const res = await fetch(`${API_BASE}/user/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}

// Mark all notifications as read
export async function markNotificationsRead() {
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
  const res = await fetch(`${API_BASE}/user/notifications/mark-read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}