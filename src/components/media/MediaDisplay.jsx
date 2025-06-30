// File: src/components/media/MediaDisplay.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Responsive media display component for posts
 * Handles images and videos with mobile-friendly video controls and caption management
 */
export default function MediaDisplay({ imageUrl, videoUrl, altText = "Media content", caption = "" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoData, setVideoData] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Caption management states
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [hideMedia, setHideMedia] = useState(false);
  
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);

  // Caption configuration
  const CAPTION_TRUNCATE_LENGTH = 150; // Characters before truncation
  const CAPTION_LONG_THRESHOLD = 300; // Characters that trigger hide media option
  
  const shouldTruncate = caption && caption.length > CAPTION_TRUNCATE_LENGTH;
  const isLongCaption = caption && caption.length > CAPTION_LONG_THRESHOLD;
  
  const displayCaption = shouldTruncate && !isExpanded 
    ? caption.substring(0, CAPTION_TRUNCATE_LENGTH) + "..."
    : caption;

  // Detect video format and aspect ratio
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        const { videoWidth, videoHeight } = video;
        const aspectRatio = videoWidth / videoHeight;
        
        // Detect mobile format (portrait or near square)
        const isMobileFormat = aspectRatio < 0.75; // Portrait
        const isSquareFormat = aspectRatio >= 0.75 && aspectRatio <= 1.33; // Square-ish
        const isLandscapeFormat = aspectRatio > 1.33; // Landscape/YouTube-style
        
        setVideoData({
          width: videoWidth,
          height: videoHeight,
          aspectRatio,
          isMobileFormat,
          isSquareFormat,
          isLandscapeFormat,
          duration: video.duration
        });
        
        setDuration(video.duration);
        setIsLoading(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [videoUrl]);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (showControls && isPlaying) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = () => {
    setShowControls(true);
    togglePlay();
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleReadMore = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && isLongCaption) {
      setShowFullCaption(true);
    }
  };

  const toggleMediaVisibility = () => {
    setHideMedia(!hideMedia);
    if (hideMedia && isPlaying) {
      // Pause video when showing it again
      togglePlay();
    }
  };

  const handleCaptionClose = () => {
    setShowFullCaption(false);
    setIsExpanded(false);
    setHideMedia(false);
  };

  // Render caption component
  const renderCaption = () => {
    if (!caption) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {displayCaption}
        </div>
        
        {/* Caption controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {shouldTruncate && (
              <button
                onClick={handleReadMore}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium transition-colors"
              >
                {isExpanded ? (
                  <>
                    <FaChevronUp size={10} />
                    Read less
                  </>
                ) : (
                  <>
                    <FaChevronDown size={10} />
                    Read more
                  </>
                )}
              </button>
            )}
            
            {isLongCaption && isExpanded && (videoUrl || imageUrl) && (
              <button
                onClick={toggleMediaVisibility}
                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-medium transition-colors"
              >
                {hideMedia ? (
                  <>
                    <FaEye size={10} />
                    Show {videoUrl ? 'video' : 'image'}
                  </>
                ) : (
                  <>
                    <FaEyeSlash size={10} />
                    Hide {videoUrl ? 'video' : 'image'}
                  </>
                )}
              </button>
            )}
          </div>

          {showFullCaption && (
            <button
              onClick={handleCaptionClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Character count for long captions */}
        {isExpanded && caption.length > 200 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {caption.length} characters
          </div>
        )}
      </div>
    );
  };

  // Render image
  if (imageUrl && !videoUrl) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        {/* Image */}
        {!hideMedia && (
          <div className="w-full max-w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={altText}
              className="rounded-lg w-full max-h-80 object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">Image failed to load</div>';
              }}
            />
          </div>
        )}
        
        {/* Caption */}
        {renderCaption()}
      </div>
    );
  }

  // Render video
  if (videoUrl) {
    // Better container sizing for posts
    const containerClasses = videoData 
      ? videoData.isMobileFormat 
        ? "w-full max-w-xs mx-auto" // Mobile format: smaller, centered, max 320px
        : videoData.isSquareFormat
        ? "w-full max-w-sm mx-auto" // Square format: medium, centered, max 384px
        : "w-full max-w-full" // Landscape format: full width but constrained
      : "w-full max-w-full";

    // Better video sizing with proper constraints
    const videoClasses = videoData
      ? videoData.isMobileFormat
        ? "w-full h-auto max-h-96 rounded-lg shadow-lg object-cover" // Mobile: tall but constrained
        : videoData.isSquareFormat
        ? "w-full h-auto max-h-80 rounded-lg shadow-lg object-cover" // Square: medium height
        : "w-full h-auto max-h-72 rounded-lg shadow-lg object-cover" // Landscape: shorter height
      : "w-full h-auto max-h-80 rounded-lg shadow-lg object-cover";

    return (
      <div className="w-full max-w-full">
        {/* Video */}
        {!hideMedia && (
          <div className={containerClasses}>
            <div 
              className="relative bg-black rounded-lg overflow-hidden cursor-pointer w-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(isPlaying ? false : true)}
              style={{ maxHeight: '400px' }} // Additional constraint
            >
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}

              {/* Video element */}
              <video
                ref={videoRef}
                src={videoUrl}
                className={videoClasses}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                onClick={handleVideoClick}
                onError={(e) => {
                  console.error('Video failed to load:', e);
                  setIsLoading(false);
                }}
              >
                Your browser does not support the video tag.
              </video>

              {/* Video controls overlay */}
              <div 
                className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Center play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={togglePlay}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 hover:scale-110"
                  >
                    {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                  </button>
                </div>

                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {/* Progress bar */}
                  <div 
                    className="w-full h-1 bg-gray-600 rounded-full mb-2 cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <button onClick={togglePlay} className="hover:text-blue-300 transition-colors">
                        {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
                      </button>
                      <button onClick={toggleMute} className="hover:text-blue-300 transition-colors">
                        {isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
                      </button>
                      <span className="text-xs">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* Format indicator */}
                    {videoData && (
                      <div className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                        {videoData.isMobileFormat ? '📱' : 
                         videoData.isSquareFormat ? '⬜' : 
                         '🖥️'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Caption */}
        {renderCaption()}
      </div>
    );
  }

  // No media to display, just caption
  if (caption) {
    return renderCaption();
  }

  // No media or caption to display
  return null;
}