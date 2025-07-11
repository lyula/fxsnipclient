import React, { useState, useEffect } from "react";
import { getProfile, updateProfile, getLatestBadgePayment } from "../../utils/api";
import { useAuth } from "../../context/auth";
import VerifiedBadge from "../../components/VerifiedBadge";
import BlueBadgeModal from "../../components/BlueBadgeModal";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";

export default function Profile() {
  const { refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: "", email: "" });
  const [profileForm, setProfileForm] = useState({
    bio: "",
    profileImage: "",
    website: "",
    location: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const [showBlueBadgeModal, setShowBlueBadgeModal] = useState(false);
  const [badgeExpiry, setBadgeExpiry] = useState(null);

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
          // Set profile form fields from nested profile object
          setProfileForm({
            bio: data.profile?.bio || "",
            profileImage: data.profile?.profileImage || "",
            website: data.profile?.website || "",
            location: data.profile?.location || ""
          });
          fetchFollowerCounts(data.username);
          // Fetch badge expiry if verified
          if (data.verified) {
            getLatestBadgePayment().then((payment) => {
              if (payment && payment.periodEnd) {
                setBadgeExpiry(payment.periodEnd);
              }
            });
          } else {
            setBadgeExpiry(null);
          }
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

  // Periodically refresh profile to update badge status if expired
  useEffect(() => {
    const interval = setInterval(() => {
      getProfile().then((data) => {
        if (data && data.username) {
          setUser(data);
          setForm({ username: data.username, email: data.email });
          fetchFollowerCounts(data.username);
          if (data.verified) {
            getLatestBadgePayment().then((payment) => {
              if (payment && payment.periodEnd) {
                setBadgeExpiry(payment.periodEnd);
              } else {
                setBadgeExpiry(null);
              }
            });
          } else {
            setBadgeExpiry(null);
          }
        }
      });
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
  };

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
    setMessage("");
  };

  const handleEdit = () => {
    setEditMode(true);
    setForm({ username: user.username, email: user.email });
    setProfileForm({
      bio: user.profile?.bio || "",
      profileImage: user.profile?.profileImage || "",
      website: user.profile?.website || "",
      location: user.profile?.location || ""
    });
    setMessage("");
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({ username: user.username, email: user.email });
    setProfileForm({
      bio: user.profile?.bio || "",
      profileImage: user.profile?.profileImage || "",
      website: user.profile?.website || "",
      location: user.profile?.location || ""
    });
    setMessage("");
  };

  // Cloudinary upload handler
  const handleProfileImageUpload = async (file) => {
    if (!file) return;
    setMessage("Uploading image...");
    // Use the Cloudinary utility and specify folder
    const result = await uploadToCloudinary(file, { folder: "profile_pictures" });
    if (result.success && result.url) {
      setProfileForm((prev) => ({
        ...prev,
        profileImage: result.url,
        profileImagePublicId: result.publicId
      }));
      setEditMode(true);
      setMessage("Image uploaded. Click Save to update profile.");
    } else {
      setMessage("Image upload failed.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    // Check if username is the same as current username
    if (form.username === user.username && form.email === user.email && JSON.stringify(profileForm) === JSON.stringify({
      bio: user.profile?.bio || "",
      profileImage: user.profile?.profileImage || "",
      website: user.profile?.website || "",
      location: user.profile?.location || ""
    })) {
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
      // Optimistically update UI before API call
      setUser({
        ...user,
        username: form.username,
        email: form.email,
        profile: { ...user.profile, ...profileForm }
      });
      setEditMode(false);
      setMessage("Saving...");
      const res = await updateProfile({
        username: form.username,
        email: form.email,
        profile: profileForm
      });
      if (res.username && res.email) {
        setUser({ ...user, username: res.username, email: res.email, profile: res.profile });
        setMessage("Profile updated!");
        refreshUser();
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
    <div className="max-w-md flex-1 min-h-0 mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-8 mb-8">
      {/* IG-style profile image and stats */}
      <div className="flex flex-col items-center mb-6">
        {/* Profile image and edit button */}
        <div className="relative w-24 h-24 mb-3">
          {user.profile?.profileImage ? (
            <img
              src={user.profile.profileImage}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-gray-300 dark:border-gray-700"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#a99d6b] flex items-center justify-center text-white text-4xl font-bold select-none">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Edit profile image button and file input */}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="profile-image-upload"
            onChange={e => {
              const file = e.target.files[0];
              if (file) handleProfileImageUpload(file);
            }}
            ref={input => (window.profileImageInput = input)}
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow hover:bg-blue-700 focus:outline-none"
            title="Edit profile picture"
            onClick={() => window.profileImageInput && window.profileImageInput.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2a2.828 2.828 0 11-4-4 2.828 2.828 0 014 4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25V19.5a2.25 2.25 0 01-2.25 2.25h-10.5A2.25 2.25 0 014.5 19.5v-10.5A2.25 2.25 0 016.75 6.75h5.25" />
            </svg>
          </button>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Bio:
          </span>
          {editMode ? (
            <input
              type="text"
              name="bio"
              value={profileForm.bio}
              onChange={handleProfileChange}
              className="border rounded px-2 py-1 flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              {user.profile?.bio || "Not set"}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Website:
          </span>
          {editMode ? (
            <input
              type="text"
              name="website"
              value={profileForm.website}
              onChange={handleProfileChange}
              className="border rounded px-2 py-1 flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              {user.profile?.website || "Not set"}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32">
            Location:
          </span>
          {editMode ? (
            <input
              type="text"
              name="location"
              value={profileForm.location}
              onChange={handleProfileChange}
              className="border rounded px-2 py-1 flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              {user.profile?.location || "Not set"}
            </span>
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-3 flex-col sm:flex-row">
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
          <>
            <button
              onClick={handleEdit}
              className="bg-[#a99d6b] text-white px-4 py-2 rounded font-semibold hover:bg-[#8c845c] transition w-full"
            >
              Edit Profile
            </button>
            {/* Only show Get Blue Badge if not verified or no expiry */}
            {!(user.verified && badgeExpiry) && (
              <button
                onClick={() => setShowBlueBadgeModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition w-full mt-2"
              >
                Get Blue Badge
              </button>
            )}
          </>
        )}
      </div>
      {/* Blue badge expiry info */}
      {user.verified && badgeExpiry && (
        <div className="mt-4 flex flex-col items-center">
          <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4 flex flex-col items-center transition-colors duration-200">
            <span className="text-gray-800 dark:text-gray-100 font-semibold text-center">
              Your blue badge expires on {new Date(badgeExpiry).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}
      {message && (
        <div className="mt-4 text-green-600 text-center font-semibold">
          {message}
        </div>
      )}
      <BlueBadgeModal open={showBlueBadgeModal} onClose={() => setShowBlueBadgeModal(false)} />
    </div>
  );
}