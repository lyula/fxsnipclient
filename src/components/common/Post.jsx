import React, { useState } from "react";
import { FaHeart, FaComment } from "react-icons/fa";
import VerifiedBadge from "../VerifiedBadge";

export default function Post({ post, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      onComment(post._id, comment);
      setComment("");
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-900 dark:text-white">{post.author.username}</span>
        {post.author.verified && <VerifiedBadge />}
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
      <div className="flex items-center gap-4">
        <button
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-red-500"
          onClick={() => onLike(post._id)}
        >
          <FaHeart />
          <span>{post.likes.length}</span>
        </button>
        <button
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-500"
          onClick={() => setShowComments(!showComments)}
        >
          <FaComment />
          <span>{post.comments.length}</span>
        </button>
      </div>
      {showComments && (
        <div className="mt-4">
          <div className="mb-2">
            {post.comments.map((comment) => (
              <div key={comment._id} className="text-gray-700 dark:text-gray-300">
                <span className="font-bold">{comment.author.username}</span>: {comment.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="border rounded-lg p-2 flex-grow"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={handleCommentSubmit}
            >
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}