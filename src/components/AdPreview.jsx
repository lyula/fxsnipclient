import React, { useState } from 'react';
import { FaPlay, FaPause, FaExternalLinkAlt, FaImage, FaVideo } from 'react-icons/fa';

const AdPreview = ({ title, description, image, video, linkUrl, className = "" }) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const toggleVideo = () => {
    const video = document.getElementById('preview-video');
    if (video) {
      if (isVideoPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const renderMedia = () => {
    if (video) {
      return (
        <div className="relative group">
          <video
            id="preview-video"
            src={video}
            className="w-full h-32 object-cover rounded-lg"
            muted
            playsInline
            onClick={toggleVideo}
          />
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={toggleVideo}
          >
            <div className="bg-white rounded-full p-2">
              {isVideoPlaying ? (
                <FaPause className="text-gray-800" />
              ) : (
                <FaPlay className="text-gray-800 ml-0.5" />
              )}
            </div>
          </div>
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center">
            <FaVideo className="mr-1" />
            Video
          </div>
        </div>
      );
    } else if (image) {
      return (
        <div className="relative">
          <img
            src={image}
            alt="Ad preview"
            className="w-full h-32 object-cover rounded-lg"
          />
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center">
            <FaImage className="mr-1" />
            Image
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-gray-500 dark:text-gray-400 text-center">
            <FaImage className="mx-auto mb-1 text-xl" />
            <p className="text-sm">Upload media</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Ad Preview
        </h4>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Media */}
        {renderMedia()}

        {/* Text Content */}
        <div className="mt-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1 line-clamp-2">
            {title || "Your ad title will appear here"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-xs mb-2 line-clamp-2">
            {description || "Your ad description will appear here"}
          </p>

          {/* Link */}
          {linkUrl ? (
            <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs">
              <FaExternalLinkAlt className="mr-1" />
              <span className="truncate">{linkUrl}</span>
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-xs">
              Destination URL will appear here
            </div>
          )}
        </div>

        {/* Call to Action Button */}
        <button 
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
          disabled
        >
          Learn More
        </button>
      </div>
    </div>
  );
};

export default AdPreview;
