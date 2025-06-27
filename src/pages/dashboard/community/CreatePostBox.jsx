import React, { useState } from "react";

export default function CreatePostBox({ onPost, onClose }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");

  const handleSubmit = () => {
    if (content.trim()) {
      onPost(content, image);
      setContent("");
      setImage("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full max-w-md">
        <textarea
          className="w-full p-2 border rounded-lg mb-2"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          type="text"
          className="w-full p-2 border rounded-lg mb-2"
          placeholder="Image URL (optional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            onClick={handleSubmit}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}