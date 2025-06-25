import React, { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import ChatList from "./community/ChatList";
import CommunityTabs from "./community/CommunityTabs";
import CreatePostBox from "./community/CreatePostBox";
import UserSearch from "./community/UserSearch";

// Dummy users for posts (keep as is or update if needed)
const users = [
	{
		name: "Jane Trader",
		avatar: "https://randomuser.me/api/portraits/women/44.jpg",
		verified: "blue", // blue badge
	},
	{
		name: "John FX",
		avatar: "https://randomuser.me/api/portraits/men/32.jpg",
		verified: "grey", // grey badge
	},
	{
		name: "Alice Markets",
		avatar: "https://randomuser.me/api/portraits/women/68.jpg",
		verified: null,
	},
];

// Add a post from zack after the ad, move Jane's post to the bottom
const initialPostsForYou = [
	{
		id: 100,
		user: "ad",
		avatar: (
			<img
				src="https://ui-avatars.com/api/?name=Ad"
				alt="Ad"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		verified: null,
		content: "📊 Master forex trading with real-time chart analysis and stay ahead of the market!",
		isAd: true,
		image: "https://images.unsplash.com/photo-1556740772-1a741367b93e?auto=format&fit=crop&w=600&q=80", // forex trading dummy image
		replies: [],
		comments: [],
		likes: 0,
		views: 0,
		timestamp: "Ad",
	},
	{
		id: 2,
		user: "zack",
		avatar: (
			<img
				src="https://ui-avatars.com/api/?name=Zack"
				alt="Zack"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		verified: null,
		content: "Excited to share my latest EUR/USD trade setup! 🚀",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 5,
		views: 15,
		timestamp: "Just now",
	},
	{
		id: 3,
		user: users[1].name,
		avatar: (
			<img
				src={users[1].avatar}
				alt="John"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		verified: users[1].verified,
		content: "GBP/USD setup looking bullish. Anyone else watching this?",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 1,
		views: 8,
		timestamp: "5m ago",
	},
	{
		id: 1,
		user: "Jane Trader",
		avatar: (
			<img
				src={users[0].avatar}
				alt="Jane"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		verified: users[0].verified,
		content: "Just closed a EUR/USD long for +40 pips! 🚀",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 2,
		views: 12,
		timestamp: "2m ago",
	},
];

const initialPostsFollowing = [
	{
		id: 4,
		user: users[2].name,
		avatar: (
			<img
				src={users[2].avatar}
				alt="Alice"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		content: "AUD/JPY breakout confirmed. Targeting 97.50.",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 3,
		views: 15,
		timestamp: "1m ago",
	},
	{
		id: 5,
		user: users[0].name,
		avatar: (
			<img
				src={users[0].avatar}
				alt="Jane"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		content: "Risk management is key! Never risk more than 2% per trade.",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 4,
		views: 20,
		timestamp: "10m ago",
	},
	{
		id: 6,
		user: users[1].name,
		avatar: (
			<img
				src={users[1].avatar}
				alt="John"
				className="w-8 h-8 rounded-full inline-block"
			/>
		),
		content: "USD/CAD rangebound. Waiting for a breakout.",
		isAd: false,
		image: "",
		replies: [],
		comments: [],
		likes: 1,
		views: 7,
		timestamp: "15m ago",
	},
];

export default function Community({ user }) {
	const [activeTab, setActiveTab] = useState("forYou");
	const [showCreate, setShowCreate] = useState(false);
	const [postsForYou, setPostsForYou] = useState(initialPostsForYou);
	const [postsFollowing, setPostsFollowing] = useState(initialPostsFollowing);
	const [showUserSearch, setShowUserSearch] = useState(false);

	// Handlers for posts
	const handleNewPost = (content, image) => {
		const newPost = {
			id: Date.now(),
			user: user?.username || "You",
			avatar: (
				<img
					src={user?.avatar || "https://randomuser.me/api/portraits/men/1.jpg"}
					alt="You"
					className="w-8 h-8 rounded-full inline-block"
				/>
			),
			content,
			isAd: false,
			image: image || "",
			replies: [],
			comments: [],
			likes: 0,
			views: 0,
			timestamp: "Now",
		};
		if (activeTab === "forYou") {
			setPostsForYou([newPost, ...postsForYou]);
		} else {
			setPostsFollowing([newPost, ...postsFollowing]);
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

	const handleFollow = (userId) => {
		const hashedId = hashId(userId);
		setCurrentUser((prev) => ({
			...prev,
			followingHashed: [...prev.followingHashed, hashedId],
		}));
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
					onReply={handleReply}
					onComment={handleComment}
					onLike={handleLike}
					onView={handleView}
				/>
			</div>
		</div>
	);
}