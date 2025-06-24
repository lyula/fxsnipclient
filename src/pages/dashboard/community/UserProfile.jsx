import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";
import ChatPost from "./ChatPost";

// Dummy user data for demonstration
const dummyUsers = {
  "Jane Trader": {
    name: "Jane Trader",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    verified: "blue",
    followers: 120,
    following: 80,
    isFollowing: false,
    joined: "2025-06-23",
    posts: [
      {
        id: 101,
        user: "Jane Trader",
        avatar: <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Jane" className="w-8 h-8 rounded-full inline-block" />,
        verified: "blue",
        content: "Just closed a EUR/USD long for +40 pips! 🚀",
        isAd: false,
        image: "",
        replies: [],
        comments: [],
        likes: 2,
        views: 12,
        timestamp: "2m ago",
      },
    ],
  },
  "John FX": {
    name: "John FX",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    verified: "grey",
    followers: 90,
    following: 50,
    isFollowing: true,
    joined: "2022-11-03",
    posts: [
      {
        id: 102,
        user: "John FX",
        avatar: <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="John" className="w-8 h-8 rounded-full inline-block" />,
        verified: "grey",
        content: "GBP/USD setup looking bullish. Anyone else watching this?",
        isAd: false,
        image: "",
        replies: [],
        comments: [],
        likes: 1,
        views: 8,
        timestamp: "5m ago",
      },
    ],
  },
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const user = dummyUsers[username] || dummyUsers["Jane Trader"];
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [followers, setFollowers] = useState(user.followers);

  const handleFollow = () => {
    if (!isFollowing) setFollowers(count => count + 1);
    else setFollowers(count => count - 1);
    setIsFollowing(f => !f);
  };

  const handleMessage = () => {
    navigate("/dashboard/inbox", { state: { to: user.name } });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate("/dashboard/community")}
        className="mb-4 px-4 py-2 rounded bg-[#a99d6b] text-white font-semibold hover:bg-[#8c845c] transition"
      >
        &larr; Back to Feed
      </button>
      <div className="flex items-center gap-4 mb-4">
        <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-gray-900 dark:text-white">{user.name}</span>
            {user.verified === "blue" && (
              <span title="Blue verified" className="text-blue-500"><svg width="18" height="18" fill="currentColor"><circle cx="9" cy="9" r="8"/></svg></span>
            )}
            {user.verified === "grey" && (
              <span title="Grey verified" className="text-gray-400"><svg width="18" height="18" fill="currentColor"><circle cx="9" cy="9" r="8"/></svg></span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span>{followers} Followers</span> · <span>{user.following} Following</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Joined on: {formatDate(user.joined)}
          </div>
        </div>
        <button
          className={`ml-auto px-4 py-1 rounded-full font-semibold ${
            isFollowing
              ? "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              : "bg-[#1E3A8A] text-white"
          }`}
          onClick={handleFollow}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
        <button
          onClick={handleMessage}
          className="ml-2 px-3 py-1 rounded-full bg-blue-500 text-white flex items-center gap-2 font-semibold hover:bg-blue-600 transition"
          title="Message"
        >
          <FaEnvelope /> Message
        </button>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Posts</h2>
        <div className="space-y-4">
          {user.posts.map(post => (
            <ChatPost
              key={post.id}
              post={post}
              onView={() => {}}
              onLike={() => {}}
              onReply={() => {}}
              onComment={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}