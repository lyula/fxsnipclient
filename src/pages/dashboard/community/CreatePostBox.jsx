import React, { useRef, useState } from "react";
import { FaSmile, FaPoll, FaImage, FaVideo, FaTimes } from "react-icons/fa";
import { searchUsers } from "../../../utils/api";
import { uploadToCloudinary } from "../../../utils/cloudinaryUpload";

export default function CreatePostBox({ onPost, onClose }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [previewFile, setPreviewFile] = useState(null); // For immediate preview
  const [previewType, setPreviewType] = useState(""); // 'image' or 'video'
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
        console.log("SUGGESTIONS:", users);
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
    // Don't allow submission if upload is in progress or no content
    if (isUploading || !content.trim()) {
      return;
    }
    
    onPost(content, image, video);
    setContent("");
    setImage("");
    setVideo("");
    cleanupPreview(); // Clean up preview when submitting
    onClose();
  };

  const handleEmojiClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Create immediate preview from file
  const createFilePreview = (file, type) => {
    // Clean up any existing preview first
    cleanupPreview();
    
    const url = URL.createObjectURL(file);
    setPreviewFile(url);
    setPreviewType(type);
  };

  // Clean up preview URL when removing media
  const cleanupPreview = () => {
    if (previewFile && previewFile.startsWith('blob:')) {
      URL.revokeObjectURL(previewFile);
    }
    setPreviewFile(null);
    setPreviewType("");
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Clear any existing video
      setVideo("");
      
      // Create immediate preview
      createFilePreview(file, "image");
      
      setIsUploading(true);
      setUploadProgress("Preparing image upload...");
      setUploadPercentage(0);

      try {
        // Simulate progress updates during upload
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => {
            if (prev < 90) {
              return prev + Math.random() * 10;
            }
            return prev;
          });
        }, 200);

        setUploadProgress("Uploading image to cloud...");
        
        const result = await uploadToCloudinary(file, {
          folder: "forex-journal/posts/images",
        });

        clearInterval(progressInterval);
        setUploadPercentage(100);

        if (result.success) {
          setImage(result.url);
          setUploadProgress("Image uploaded successfully!");
          
          // Keep the preview but clear progress after delay
          setTimeout(() => {
            setUploadProgress("");
            setUploadPercentage(0);
          }, 1500);
        } else {
          console.error("Image upload failed:", result.error);
          setUploadProgress("Upload failed. Please try again.");
          cleanupPreview();
          setImage("");
        }
      } catch (error) {
        console.error("Image upload error:", error);
        setUploadProgress("Upload failed. Please try again.");
        cleanupPreview();
        setImage("");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    }
  };

  const handleVideoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Clear any existing image
      setImage("");
      
      // Create immediate preview
      createFilePreview(file, "video");
      
      setIsUploading(true);
      setUploadProgress("Preparing video upload...");
      setUploadPercentage(0);

      try {
        // Simulate progress updates during upload
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => {
            if (prev < 85) {
              return prev + Math.random() * 8;
            }
            return prev;
          });
        }, 300);

        setUploadProgress("Uploading video to cloud... This may take a moment.");
        
        const result = await uploadToCloudinary(file, {
          folder: "forex-journal/posts/videos",
        });

        clearInterval(progressInterval);
        setUploadPercentage(100);

        if (result.success) {
          setVideo(result.url);
          setUploadProgress("Video uploaded successfully!");
          
          // Keep the preview but clear progress after delay
          setTimeout(() => {
            setUploadProgress("");
            setUploadPercentage(0);
          }, 1500);
        } else {
          console.error("Video upload failed:", result.error);
          setUploadProgress("Upload failed. Please try again.");
          cleanupPreview();
          setVideo("");
        }
      } catch (error) {
        console.error("Video upload error:", error);
        setUploadProgress("Upload failed. Please try again.");
        cleanupPreview();
        setVideo("");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    }
  };

  const removeMedia = () => {
    if (video) {
      setVideo("");
    }
    if (image) {
      setImage("");
    }
    cleanupPreview();
  };

  function renderHighlightedContent(content) {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      /^@\w+$/.test(part)
        ? <span key={i} className="text-blue-600">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  // Check if we can submit (content exists and no upload in progress)
  const canSubmit = content.trim() && !isUploading;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
      <div className="relative w-full max-w-md flex justify-center">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full relative z-50">
          
          {/* 🎯 MEDIA PREVIEW SECTION - MOVED TO TOP AS FIRST ITEM */}
          {(previewFile || image || video) && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(previewType === "video" || video) ? "Video Preview:" : "Image Preview:"}
                </span>
                <button
                  type="button"
                  onClick={removeMedia}
                  className="text-red-500 hover:text-red-700 text-sm"
                  disabled={isUploading}
                >
                  Remove
                </button>
              </div>
              
              {/* Image Preview - Show preview file first, then uploaded image */}
              {(previewType === "image" || (image && !video)) && (
                <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                  <img
                    src={previewFile || image}
                    alt="Preview"
                    className="w-full h-auto object-cover rounded-lg"
                    style={{ maxHeight: "200px" }}
                  />
                </div>
              )}
              
              {/* Video Preview - Show preview file first, then uploaded video */}
              {(previewType === "video" || video) && (
                <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                  <video
                    src={previewFile || video}
                    controls
                    className="w-full h-auto object-cover rounded-lg"
                    style={{ maxHeight: "200px" }}
                  />
                </div>
              )}
              
              {/* Status Indicators */}
              {previewFile && !image && !video && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {isUploading ? "Uploading to cloud..." : "Ready to upload"}
                </div>
              )}
              
              {((image && !isUploading) || (video && !isUploading)) && (
                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Upload completed successfully! Ready to post.
                </div>
              )}
            </div>
          )}

          {/* 📊 UPLOAD PROGRESS INDICATOR */}
          {isUploading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  {uploadProgress}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300 font-medium">
                  {Math.round(uploadPercentage)}%
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 📝 TEXT INPUT AREA */}
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
          
          {/* 🔘 BUTTONS AREA */}
          <div className="flex items-center justify-between mt-3">
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
                  className={`focus:outline-none ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isUploading && imageInputRef.current && imageInputRef.current.click()}
                  disabled={isUploading}
                >
                  <FaImage />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                  disabled={isUploading}
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Attach image
                </span>
              </div>
              
              {/* Video */}
              <div className="relative group">
                <button
                  type="button"
                  className={`focus:outline-none ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isUploading && videoInputRef.current && videoInputRef.current.click()}
                  disabled={isUploading}
                >
                  <FaVideo />
                </button>
                <input
                  type="file"
                  accept="video/*"
                  ref={videoInputRef}
                  style={{ display: "none" }}
                  onChange={handleVideoChange}
                  disabled={isUploading}
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  Attach video
                </span>
              </div>
            </div>
            
            {/* Post Button - Disabled during upload */}
            <button
              className={`px-6 py-2 rounded-full font-semibold shadow transition ${
                canSubmit
                  ? 'bg-[#a99d6b] text-white hover:bg-[#c2b77a]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isUploading ? 'Uploading...' : 'Post'}
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