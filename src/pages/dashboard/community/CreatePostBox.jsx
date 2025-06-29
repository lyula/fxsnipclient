import React, { useRef, useState } from "react";
import { FaSmile, FaPoll, FaImage, FaVideo, FaTimes } from "react-icons/fa";
import { searchUsers } from "../../../utils/api";

export default function CreatePostBox({ onPost, onClose }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Handle textarea input for mentions
  const handleContentChange = async (e) => {
    const value = e.target.value;
    setContent(value);

    const caret = e.target.selectionStart;
    const textUpToCaret = value.slice(0, caret);
    const mentionMatch = textUpToCaret.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStart(caret - mentionMatch[1].length - 1);
      setShowSuggestions(true);
      try {
        const users = await searchUsers(mentionMatch[1]);
        console.log("SUGGESTIONS:", users); // <-- Add this
        setSuggestions(users.users || []);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
      setMentionStart(null);
    }
  };

  // Insert selected username into textarea
  const handleSuggestionClick = (username) => {
    if (mentionStart === null) return;
    const before = content.slice(0, mentionStart);
    const after = content.slice(textareaRef.current.selectionStart);
    const newContent = `${before}@${username} ${after}`;
    setContent(newContent);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    setMentionStart(null);
    // Move caret to after inserted username
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = (
          before +
          "@" +
          username +
          " "
        ).length;
      }
    }, 0);
  };

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

  function renderHighlightedContent(content) {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      /^@\w+$/.test(part)
        ? <span key={i} className="text-blue-600">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
      <div className="relative w-full max-w-md flex justify-center">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full relative z-50">
          <div className="relative">
            <div className="relative w-full">
              {/* Highlight layer */}
              <div
                className="pointer-events-none absolute inset-0 w-full h-full p-3 rounded-lg whitespace-pre-wrap break-words"
                style={{
                  background: "white",
                  zIndex: 1,
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  letterSpacing: "inherit",
                  fontWeight: "inherit"
                }}
                aria-hidden="true"
              >
                {renderHighlightedContent(content)}
              </div>
              {/* Transparent text textarea on top */}
              <textarea
                ref={textareaRef}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] resize-none bg-transparent relative"
                placeholder="What's on your mind?"
                rows={3}
                value={content}
                onChange={handleContentChange}
                style={{
                  position: "relative",
                  zIndex: 2,
                  color: "transparent",
                  caretColor: "#222",
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  letterSpacing: "inherit",
                  fontWeight: "inherit"
                }}
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="z-70 bg-white border border-gray-200 rounded shadow mt-1 w-full">
                {suggestions.slice(0, 5).map((user) => (
                  <li
                    key={user._id || user.username}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(user.username)}
                  >
                    <span className="text-blue-600">@{user.username}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          <button
            type="button"
            className="absolute -top-4 -right-4 z-60 bg-white dark:bg-gray-800 rounded-full p-2 shadow text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl focus:outline-none"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}