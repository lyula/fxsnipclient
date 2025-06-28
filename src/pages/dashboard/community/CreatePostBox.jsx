import React, { useRef, useState } from "react";
import { FaSmile, FaPoll, FaImage, FaVideo, FaTimes } from "react-icons/fa";

export default function CreatePostBox({ onPost, onClose }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleSubmit = () => {
    if (content.trim()) {
      onPost(content, image, video);
      setContent("");
      setImage("");
      setVideo("");
      onClose();
    }
  };

  const handleEmojiClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleVideoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-md flex justify-center">
        {/* Close button above the box */}
        <button
          type="button"
          className="absolute -top-4 -right-4 z-20 bg-white dark:bg-gray-800 rounded-full p-2 shadow text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full relative">
          <textarea
            ref={textareaRef}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] resize-none"
            placeholder="What's on your mind?"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-4 text-xl text-gray-500 dark:text-gray-400">
              {/* Emoji */}
              <div className="relative group">
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={handleEmojiClick}
                >
                  <FaSmile />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Add emoji
                </span>
              </div>
              {/* Poll */}
              <div className="relative group">
                <button type="button" className="focus:outline-none">
                  <FaPoll />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Create poll
                </span>
              </div>
              {/* Image */}
              <div className="relative group">
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() =>
                    imageInputRef.current && imageInputRef.current.click()
                  }
                >
                  <FaImage />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Attach image
                </span>
              </div>
              {/* Video */}
              <div className="relative group">
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() =>
                    videoInputRef.current && videoInputRef.current.click()
                  }
                >
                  <FaVideo />
                </button>
                <input
                  type="file"
                  accept="video/*"
                  ref={videoInputRef}
                  style={{ display: "none" }}
                  onChange={handleVideoChange}
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Attach video
                </span>
              </div>
            </div>
            <button
              className="bg-[#a99d6b] text-white px-6 py-2 rounded-full font-semibold shadow hover:bg-[#c2b77a] transition"
              onClick={handleSubmit}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}