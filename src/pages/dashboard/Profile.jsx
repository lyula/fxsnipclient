import React, { useState, useEffect } from "react";
import { getProfile, updateProfile } from "../../utils/api";
import { useAuth } from "../../context/auth";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function Profile() {
  const { refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: "", email: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);

  // API base URL
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");

  // Auth headers
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };

  // Fetch follower and following counts
  const fetchFollowerCounts = async (username) => {
    if (!username) return;
    
    setCountsLoading(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch(`${API_BASE}/user/followers/${encodeURIComponent(username)}`),
        fetch(`${API_BASE}/user/following/${encodeURIComponent(username)}`, {
          headers: authHeaders,
        })
      ]);

      if (followersRes.ok) {
        const result = await followersRes.json();
        setFollowers(result.followers || []);
      }

      if (followingRes.ok) {
        const result = await followingRes.json();
        setFollowing(result.following || []);
      }
    } catch (error) {
      console.error("Error fetching follower counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data && data.username) {
          setUser(data);
          setForm({ username: data.username, email: data.email });
          // Fetch follower counts after getting user data
          fetchFollowerCounts(data.username);
        } else {
          setMessage(data.message || "Failed to load profile.");
        }
        setLoading(false);
      })
      .catch(() => {
        setMessage("Failed to load profile.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
  };

  const handleEdit = () => {
    setEditMode(true);
    setForm({ username: user.username, email: user.email });
    setMessage("");
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({ username: user.username, email: user.email });
    setMessage("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    // Check if username is the same as current username
    if (form.username === user.username && form.email === user.email) {
      setMessage("No changes to save.");
      return;
    }

    // Client-side username validation (same as registration)
    if (form.username !== user.username) {
      const usernameRegex = /^(?!.*[_.]{2})[a-zA-Z0-9](?!.*[_.]{2})[a-zA-Z0-9._]{1,28}[a-zA-Z0-9]$/;
      if (
        !form.username ||
        !usernameRegex.test(form.username) ||
        form.username.length < 3 ||
        form.username.length > 30 ||
        /^\d+$/.test(form.username) ||
        form.username.includes("@") ||
        form.username.includes(" ") // Add space check
      ) {
        setMessage("Invalid username. Use 3-30 letters, numbers, underscores, or periods. Cannot be only numbers, start/end with period/underscore, contain '@', or have spaces.");
        return;
      }
    }

    try {
      const res = await updateProfile(form);
      if (res.username && res.email) {
        setUser({ ...user, username: res.username, email: res.email });
        setEditMode(false);
        setMessage("Profile updated!");
        refreshUser(); // Refresh global user data
        // If username changed, refetch follower counts
        if (res.username !== user.username) {
          fetchFollowerCounts(res.username);
        }
      } else {
        setMessage(res.message || "Update failed.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-8 mb-8 text-center">
        <span className="text-gray-500 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-8 mb-8 text-center">
        <span className="text-red-500 dark:text-red-400">
          {message || "No profile data."}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-8 mb-8">
      {/* IG-style profile image and stats */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-[#a99d6b] flex items-center justify-center text-white text-4xl font-bold mb-3 select-none">
          {user.username?.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center justify-center gap-2 w-full mb-2">
          <span className="block text-[#1E3A8A] dark:text-white font-semibold text-base text-center truncate w-full" title={user?.username}>
            {user?.username}
            {user?.verified && <VerifiedBadge />}
          </span>
        </div>
        <div className="flex items-center justify-center gap-10 w-full mb-2">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-[#1E3A8A] dark:text-[#a99d6b]">
              {countsLoading ? "..." : followers.length}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Followers
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-[#1E3A8A] dark:text-[#a99d6b]">
              {countsLoading ? "..." : following.length}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Following
            </span>
          </div>
        </div>
      </div>
      {/* Profile details */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Date Joined:
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : user.joined 
              ? new Date(user.joined).toLocaleDateString()
              : "Not available"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Username:
          </span>
          {editMode ? (
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="border rounded px-2 py-1 flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              {user.username}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Email:
          </span>
          {editMode ? (
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="border rounded px-2 py-1 flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        {editMode ? (
          <>
            <button
              onClick={handleSave}
              className="bg-[#a99d6b] text-white px-4 py-2 rounded font-semibold hover:bg-[#8c845c] transition w-full"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition w-full"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleEdit}
            className="bg-[#a99d6b] text-white px-4 py-2 rounded font-semibold hover:bg-[#8c845c] transition w-full"
          >
            Edit Profile
          </button>
        )}
      </div>
      {message && (
        <div className="mt-4 text-green-600 text-center font-semibold">
          {message}
        </div>
      )}
    </div>
  );
}