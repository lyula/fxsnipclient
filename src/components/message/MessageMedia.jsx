import React from 'react';

/**
 * MessageMedia component handles rendering and preview of media files (image, video, or file link)
 * and the preview UI for uploads in the chatbox.
 *
 * Props:
 * - mediaUrl: string (Cloudinary/file URL)
 * - mediaFile: File (optional, for preview before upload)
 * - mediaPreview: string (optional, preview URL for local file)
 * - onRemove: function (optional, for removing selected media)
 * - className: string (optional, for styling)
 */
const MessageMedia = ({ mediaUrl, mediaFile, mediaPreview, onRemove, className = '', onClick }) => {
  // Render preview for local file before upload
  if (mediaPreview && mediaFile) {
    if (mediaFile.type.startsWith('image')) {
      return (
        <div className={`mb-2 relative flex items-center ${className}`}>
          <img src={mediaPreview} alt="preview" className="max-h-32 rounded shadow mr-2" />
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">Remove</button>
          )}
        </div>
      );
    }
    if (mediaFile.type.startsWith('video')) {
      return (
        <div className={`mb-2 relative flex items-center ${className}`}>
          <video src={mediaPreview} controls className="max-h-32 rounded shadow mr-2" />
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">Remove</button>
          )}
        </div>
      );
    }
    // For other file types
    return (
      <div className={`mb-2 relative flex items-center ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="inline-block bg-gray-200 dark:bg-gray-700 rounded p-2">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{mediaFile.name}</span>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">Remove</button>
        )}
      </div>
    );
  }

  // Render media from a URL (already uploaded)
  if (mediaUrl) {
    if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <img
          src={mediaUrl}
          alt="media"
          className={`max-h-64 rounded shadow cursor-pointer ${className}`}
          onClick={onClick}
          style={onClick ? { cursor: 'zoom-in' } : {}}
        />
      );
    }
    if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return <video src={mediaUrl} controls className={`max-h-64 rounded shadow ${className}`} />;
    }
    return <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={`underline text-blue-500 ${className}`}>View file</a>;
  }

  return null;
};

export default MessageMedia;
