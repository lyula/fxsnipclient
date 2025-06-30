// File: src/components/media/MediaDisplay.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaVolumeDown, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Responsive media display component for posts
 * Handles images and videos with mobile-friendly video controls and caption management
 * Features full-height video display with minimal caption overlay
 */
export default function MediaDisplay({ imageUrl, videoUrl, altText = "Media content", caption = "" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoData, setVideoData] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Caption management states
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [hideMedia, setHideMedia] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const volumeTimeoutRef = useRef(null);

  // Device detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Caption configuration
  const CAPTION_TRUNCATE_LENGTH = 100; // Reduced for minimal overlay
  const CAPTION_LONG_THRESHOLD = 200; // Reduced threshold
  
  const shouldTruncate = caption && caption.length > CAPTION_TRUNCATE_LENGTH;
  const isLongCaption = caption && caption.length > CAPTION_LONG_THRESHOLD;
  
  const displayCaption = shouldTruncate && !isExpanded 
    ? caption.substring(0, CAPTION_TRUNCATE_LENGTH) + "..."
    : caption;

  // Intersection Observer for viewport detection and autoplay
  useEffect(() => {
    if (!videoUrl || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inViewport = entry.isIntersecting && entry.intersectionRatio > 0.3;
          setIsInViewport(inViewport);
          
          if (inViewport && canPlay && !userInteracted && videoRef.current) {
            videoRef.current.play().catch((error) => {
              console.log('Autoplay failed:', error);
            });
          } else if (!inViewport && isPlaying && videoRef.current) {
            videoRef.current.pause();
          }
        });
      },
      {
        threshold: [0.3, 0.5, 0.7],
        rootMargin: '-10px'
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [canPlay, userInteracted, isPlaying, videoUrl]);

  // Enhanced video loading with mobile compatibility
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      const video = videoRef.current;
      setIsLoading(true);
      setVideoError(false);
      setCanPlay(false);
      
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded');
        const { videoWidth, videoHeight } = video;
        const aspectRatio = videoWidth / videoHeight;
        
        const isMobileFormat = aspectRatio < 0.75;
        const isSquareFormat = aspectRatio >= 0.75 && aspectRatio <= 1.33;
        const isLandscapeFormat = aspectRatio > 1.33;
        
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
        video.volume = volume;
      };

      const handleCanPlay = () => {
        console.log('Video can play');
        setIsLoading(false);
        setCanPlay(true);
      };

      const handleCanPlayThrough = () => {
        console.log('Video can play through');
        setIsLoading(false);
        setCanPlay(true);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      const handlePause = () => setIsPlaying(false);
      
      const handleError = (e) => {
        console.error('Video error:', e.target.error);
        setVideoError(true);
        setIsLoading(false);
      };

      const handleLoadStart = () => {
        console.log('Video load started');
        setIsLoading(true);
      };

      const handleWaiting = () => {
        if (userInteracted) {
          setIsLoading(true);
        }
      };

      const handlePlaying = () => {
        setIsLoading(false);
      };

      const handleVolumeChange = () => {
        setIsMuted(video.muted);
        setVolume(video.volume);
      };

      const handleSuspend = () => {
        console.log('Video loading suspended (iOS)');
        if (isIOS) {
          setIsLoading(false);
          setCanPlay(true);
        }
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('volumechange', handleVolumeChange);
      video.addEventListener('suspend', handleSuspend);

      const timeoutDuration = isIOS ? 15000 : 8000;
      const loadingTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn('Video loading timeout');
          setIsLoading(false);
          setCanPlay(true);
        }
      }, timeoutDuration);

      return () => {
        clearTimeout(loadingTimeout);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('suspend', handleSuspend);
      };
    }
  }, [videoUrl, isIOS, userInteracted, volume]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying && !isMobile) {
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
  }, [showControls, isPlaying, isMobile]);

  // Auto-hide volume slider
  useEffect(() => {
    if (showVolumeSlider) {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false);
      }, 3000);
    }
    
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, [showVolumeSlider]);

  const togglePlay = async () => {
    if (videoRef.current) {
      setUserInteracted(true);
      
      try {
        if (isPlaying) {
          await videoRef.current.pause();
        } else {
          if (isIOS && videoRef.current.currentTime === 0) {
            videoRef.current.load();
            setTimeout(async () => {
              try {
                await videoRef.current.play();
              } catch (iosError) {
                console.warn('iOS play failed:', iosError);
              }
            }, 100);
          } else if (isAndroid && videoRef.current.currentTime === 0) {
            videoRef.current.currentTime = 0.1;
            await videoRef.current.play();
          } else {
            await videoRef.current.play();
          }
        }
      } catch (error) {
        console.error('Play/pause error:', error);
        
        if (!isPlaying) {
          try {
            if (isIOS) {
              videoRef.current.load();
              setTimeout(() => {
                videoRef.current.play().catch(console.warn);
              }, 200);
            } else {
              videoRef.current.currentTime = 0.1;
              videoRef.current.play().catch(console.warn);
            }
          } catch (fallbackError) {
            console.warn('Fallback play failed:', fallbackError);
          }
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      setUserInteracted(true);
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume) => {
    if (videoRef.current) {
      setUserInteracted(true);
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleVolumeClick = () => {
    setShowVolumeSlider(!showVolumeSlider);
    setUserInteracted(true);
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration > 0) {
      setUserInteracted(true);
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

  const handleVideoInteraction = (e) => {
    e.preventDefault();
    setUserInteracted(true);
    setShowControls(true);
    togglePlay();
  };

  const handleMouseMove = () => {
    if (!isMobile) {
      setShowControls(true);
    }
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
      togglePlay();
    }
  };

  const handleCaptionClose = () => {
    setShowFullCaption(false);
    setIsExpanded(false);
    setHideMedia(false);
  };

  // Render minimal caption overlay for videos
  const renderVideoCaption = () => {
    if (!caption) return null;

    return (
      <div className="absolute top-3 left-3 right-3 z-30">
        <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-2">
          <div className="text-white text-sm leading-relaxed">
            {shouldTruncate && !isExpanded ? displayCaption : caption}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              {shouldTruncate && (
                <button
                  onClick={handleReadMore}
                  className="flex items-center gap-1 text-blue-300 hover:text-blue-200 text-xs font-medium transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <FaChevronUp size={8} />
                      Less
                    </>
                  ) : (
                    <>
                      <FaChevronDown size={8} />
                      More
                    </>
                  )}
                </button>
              )}
              
              {isLongCaption && isExpanded && (
                <button
                  onClick={toggleMediaVisibility}
                  className="flex items-center gap-1 text-gray-300 hover:text-white text-xs font-medium transition-colors"
                >
                  {hideMedia ? (
                    <>
                      <FaEye size={8} />
                      Show video
                    </>
                  ) : (
                    <>
                      <FaEyeSlash size={8} />
                      Hide video
                    </>
                  )}
                </button>
              )}
            </div>

            {(isExpanded || showFullCaption) && (
              <button
                onClick={handleCaptionClose}
                className="text-gray-300 hover:text-white text-xs transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render standard caption for images
  const renderImageCaption = () => {
    if (!caption) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {displayCaption}
        </div>
        
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
        
        {isExpanded && caption.length > 200 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {caption.length} characters
          </div>
        )}
      </div>
    );
  };

  // Render image with standard layout
  if (imageUrl && !videoUrl) {
    return (
      <div className="w-full max-w-full overflow-hidden">
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
        
        {renderImageCaption()}
      </div>
    );
  }

  // Render video with full-height layout
  if (videoUrl) {
    return (
      <div className="w-full h-full relative">
        {!hideMedia && (
          <div 
            ref={containerRef}
            className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => !isMobile && setShowControls(isPlaying ? false : true)}
            style={{ 
              minHeight: '60vh', // Minimum height for mobile
              height: 'calc(100vh - 200px)' // Full height minus header/tabs space
            }}
          >
            {/* Caption overlay */}
            {caption && renderVideoCaption()}

            {/* Autoplay indicator */}
            {isInViewport && !userInteracted && canPlay && (
              <div className="absolute top-3 right-3 bg-green-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs z-20">
                Auto-playing
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !videoError && !canPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <div className="text-sm">Loading video...</div>
                  <div className="text-xs text-gray-300 mt-2">
                    {isIOS ? 'Preparing for iOS...' : isAndroid ? 'Optimizing for Android...' : 'Will autoplay when in view'}
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                <div className="text-center text-white p-4">
                  <div className="text-sm mb-2">Video failed to load</div>
                  <div className="text-xs text-gray-300 mb-3">
                    {isIOS ? 'Try tapping the video to play' : 'Tap to retry or play'}
                  </div>
                  <button
                    onClick={() => {
                      setVideoError(false);
                      setIsLoading(true);
                      setUserInteracted(true);
                      videoRef.current?.load();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Video element with full coverage */}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline={true}
              webkit-playsinline={isIOS ? "true" : undefined}
              preload={isMobile ? "metadata" : "metadata"}
              controls={false}
              onClick={handleVideoInteraction}
              onTouchStart={handleVideoInteraction}
              onTouchEnd={(e) => e.preventDefault()}
            >
              Your browser does not support the video tag.
            </video>

            {/* Video controls overlay */}
            <div 
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                showControls || !isPlaying || isMobile ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Center play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={handleVideoInteraction}
                  onTouchStart={handleVideoInteraction}
                  className={`bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all duration-200 hover:scale-110 touch-manipulation ${
                    isMobile ? 'p-6' : 'p-5'
                  }`}
                >
                  {isPlaying ? <FaPause size={isMobile ? 32 : 28} /> : <FaPlay size={isMobile ? 32 : 28} />}
                </button>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress bar */}
                <div 
                  className={`w-full bg-gray-600 rounded-full mb-4 cursor-pointer touch-manipulation ${
                    isMobile ? 'h-5' : 'h-4'
                  }`}
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={handleVideoInteraction}
                      onTouchStart={handleVideoInteraction}
                      className={`hover:text-blue-300 transition-colors touch-manipulation ${
                        isMobile ? 'p-3' : 'p-2'
                      }`}
                    >
                      {isPlaying ? <FaPause size={isMobile ? 20 : 18} /> : <FaPlay size={isMobile ? 20 : 18} />}
                    </button>
                    
                    {/* Volume controls */}
                    <div className="relative">
                      <button 
                        onClick={isMobile ? toggleMute : handleVolumeClick}
                        className={`hover:text-blue-300 transition-colors touch-manipulation ${
                          isMobile ? 'p-3' : 'p-2'
                        }`}
                      >
                        {isMuted || volume === 0 ? (
                          <FaVolumeMute size={isMobile ? 20 : 18} />
                        ) : volume < 0.5 ? (
                          <FaVolumeDown size={isMobile ? 20 : 18} />
                        ) : (
                          <FaVolumeUp size={isMobile ? 20 : 18} />
                        )}
                      </button>
                      
                      {/* Volume slider for desktop */}
                      {!isMobile && showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black bg-opacity-75 p-2 rounded">
                          <div className="flex flex-col items-center">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volume}
                              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none slider"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
                              }}
                            />
                            <span className="text-xs mt-1">{Math.round(volume * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <span className={isMobile ? 'text-lg' : 'text-base'}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Format and device indicator */}
                  {videoData && (
                    <div className="text-sm bg-black bg-opacity-50 px-3 py-2 rounded flex items-center gap-2">
                      {videoData.isMobileFormat ? '📱' : 
                       videoData.isSquareFormat ? '⬜' : 
                       '🖥️'}
                      {isIOS && <span>🍎</span>}
                      {isAndroid && <span>🤖</span>}
                      {isInViewport && <span>👁️</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Full caption view when video is hidden */}
        {hideMedia && caption && (
          <div className="h-full flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="max-w-2xl text-center">
              <div className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {caption}
              </div>
              <button
                onClick={toggleMediaVisibility}
                className="flex items-center gap-2 mx-auto text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                <FaEye size={16} />
                Show video
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // No media or caption to display
  return null;
}