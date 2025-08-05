import React, { useRef, useState, useEffect } from "react";
import { FaSmile, FaPoll, FaImage, FaVideo, FaTimes, FaEllipsisV } from "react-icons/fa";
import { searchUsers } from "../../../utils/api";
import { uploadToCloudinary } from "../../../utils/cloudinaryUpload";
import FloatingMenu from "../../../components/common/FloatingMenu"; 
import { renderHighlightedContent } from "../../../utils/renderHighlight.jsx";

export default function CreatePostBox({ onPost, onClose, posting, postError }) {
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
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState("");
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const scrollToPosition = () => {
        const modalElement = modalRef.current;
        if (modalElement) {
          const textareaRect = textarea.getBoundingClientRect();
          const modalRect = modalElement.getBoundingClientRect();
          if (textareaRect.bottom > modalRect.bottom - 100) {
            textarea.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      };
      textarea.addEventListener("input", scrollToPosition);
      textarea.addEventListener("click", scrollToPosition);
      return () => {
        textarea.removeEventListener("input", scrollToPosition);
        textarea.removeEventListener("click", scrollToPosition);
      };
    }
  }, []);

  const cleanupPreview = () => {
    setPreviewFile(null);
    setPreviewType("");
  };

  const createFilePreview = (file, type) => {
    const url = URL.createObjectURL(file);
    setPreviewFile(url);
    setPreviewType(type);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      setVideo("");
      createFilePreview(file, "image");

      setIsUploading(true);
      setUploadProgress("Preparing image upload...");
      setUploadPercentage(0);

      try {
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
        }, 300);

        setUploadProgress("Uploading image to cloud...");

        const result = await uploadToCloudinary(file, {
          folder: "forex-journal/posts/images",
        });

        clearInterval(progressInterval);
        setUploadPercentage(100);

        if (result.success) {
          setImage(result.url);
          setUploadProgress("Image uploaded successfully!");
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

      setImage("");
      createFilePreview(file, "video");

      setIsUploading(true);
      setUploadProgress("Preparing video upload...");
      setUploadPercentage(0);

      try {
        const progressInterval = setInterval(() => {
          setUploadPercentage(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
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
    if (video) setVideo("");
    if (image) setImage("");
    cleanupPreview();
  };

  const handleEmojiClick = () => {
    setContent(prev => prev + "😊");
  };

  const handleSuggestionClick = (username) => {
    if (mentionStart === null || textareaRef.current == null) return;
    const beforeMention = content.slice(0, mentionStart);
    const afterMention = content.slice(textareaRef.current.selectionStart);
    const newContent = `${beforeMention}@${username} ${afterMention}`;
    setContent(newContent);
    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStart(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleSubmit = () => {
    if (!content.trim() || isUploading || posting) return;
    onPost(content, image, video);
    // Do not clear fields until post is successful
  };

  const canSubmit = content.trim() && !isUploading && !posting;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div ref={modalRef} className="relative w-full max-w-lg mx-auto min-h-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full relative max-h-[85vh] overflow-y-auto">
          {/* Close button */}
          <div className="sticky top-0 right-0 z-10 flex justify-end p-2">
            <button
              type="button"
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 shadow-md text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Close"
              disabled={posting}
            >
              <FaTimes size={16} />
            </button>
          </div>

          <div className="px-4 pb-4 -mt-2">
            {posting && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-200 text-center font-medium">
                Posting... Please wait.
              </div>
            )}
            {postError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-200 text-center font-medium">
                {postError}
              </div>
            )}
            {/* MEDIA PREVIEW SECTION */}
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

                {(previewType === "image" || (image && !video)) && (
                  <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                    <img
                      src={previewFile || image}
                      alt="Preview"
                      className="w-full h-auto object-cover rounded-lg"
                    />
                  </div>
                )}

                {(previewType === "video" || (video && !image)) && (
                  <div className="max-w-full max-h-48 overflow-hidden rounded-lg">
                    <video
                      src={previewFile || video}
                      controls
                      className="w-full h-auto object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  {uploadProgress}
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* TEXT INPUT AREA */}
            <div className="relative">
              <div className="relative w-full">
                {/* Highlight layer */}
                <div
                  className="pointer-events-none absolute inset-0 p-3 rounded-lg bg-white dark:bg-gray-800"
                  aria-hidden="true"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    width: "100%",
                    height: "100%",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    lineHeight: "inherit",
                    letterSpacing: "inherit",
                    fontWeight: "inherit",
                    color: "transparent",
                    userSelect: "none",
                    zIndex: 1,
                  }}
                >
                  {renderHighlightedContent(content)}
                </div>

                {/* Actual textarea */}
                <textarea
                  ref={textareaRef}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] resize-none bg-white dark:bg-gray-800 relative min-h-[120px] text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="What's on your mind?"
                  rows={5}
                  value={content}
                  onChange={handleContentChange}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    fontFamily: "inherit",
                    fontSize: "16px",
                    lineHeight: "inherit",
                    letterSpacing: "inherit",
                    fontWeight: "inherit",
                    boxSizing: "border-box",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  className="absolute z-70 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto"
                  style={{ top: "100%", left: 0, right: 0, minWidth: "180px" }}
                >
                  {suggestions.map((user) => (
                    <li
                      key={user._id}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                      onClick={() => handleSuggestionClick(user.username)}
                      style={{ zIndex: 1000 }}
                    >
                      @{user.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {/* Image Upload */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-gray-500 hover:text-[#a99d6b] transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={isUploading}
                  >
                    <FaImage size={18} />
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                    Add Image
                  </span>
                </div>

                {/* Video Upload */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="text-gray-500 hover:text-[#a99d6b] transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={isUploading}
                  >
                    <FaVideo size={18} />
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                    Add Video
                  </span>
                </div>

                {/* Emoji Button */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleEmojiClick}
                    className="text-gray-500 hover:text-[#a99d6b] transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FaSmile size={18} />
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                    Add Emoji
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  canSubmit
                    ? "bg-[#a99d6b] hover:bg-[#968B5C] text-white shadow-md hover:shadow-lg"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {isUploading ? "Uploading..." : "Post"}
              </button>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoChange}
          />
        </div>
      </div>
    </div>
  );
}
