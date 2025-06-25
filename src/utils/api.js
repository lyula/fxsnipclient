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