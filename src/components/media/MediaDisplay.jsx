import React, { useState, useRef, useEffect, useMemo, createContext, useContext } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaVolumeDown, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash, FaExpand, FaCompress } from 'react-icons/fa';

// Create a context for managing mute state globally
const MuteContext = createContext({
  isMuted: false,
  setIsMuted: () => {},
});

// MuteContext Provider component to wrap around the app or components
export const MuteProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted (sound on)
  return (
    <MuteContext.Provider value={{ isMuted, setIsMuted }}>
      {children}
    </MuteContext.Provider>
  );
};

/**
 * Enhanced media display component with automatic video dimension detection
 */
export default function MediaDisplay({ 
  imageUrl, 
  videoUrl, 
  audioUrl, 
  altText = "Media content", 
  caption = "", 
  showCaptionOverlay = false,
  className = ""
}) {
  const { isMuted, setIsMuted } = useContext(MuteContext); // Use global mute state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoData, setVideoData] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track manual control state
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [lastManualAction, setLastManualAction] = useState(null);
  
  // Track video dimensions for automatic format detection
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [videoFormat, setVideoFormat] = useState('landscape'); // 'portrait', 'square', 'landscape'
  
  // Caption management states
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [hideMedia, setHideMedia] = useState(false);
  
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const volumeTimeoutRef = useRef(null);

  // Enhanced device detection
  const isActualMobile = useMemo(() => {
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenSizeMobile = window.screen.width <= 768 || window.screen.height <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mediaQueryMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasOrientationAPI = 'orientation' in window;
    
    return userAgentMobile || (screenSizeMobile && isTouchDevice) || (mediaQueryMobile && isTouchDevice) || hasOrientationAPI;
  }, []);

  // Determine if we should use mobile-style rendering based on video format
  const shouldUseMobileLayout = videoFormat === 'portrait' || isActualMobile;

  // Determine media types
  const hasAudio = Boolean(audioUrl);
  const hasVideo = Boolean(videoUrl);
  const hasMedia = hasAudio || hasVideo;
  const isVideoMedia = hasVideo;
  const isAudioMedia = hasAudio && !hasVideo;

  // Caption processing
  const shouldTruncate = caption && caption.length > 200;
  const displayCaption = shouldTruncate && !isExpanded ? 
    caption.substring(0, 200) + '...' : caption;

  // Manual control timeout - user actions take precedence for 10 seconds
  const MANUAL_CONTROL_TIMEOUT = 10000;

  const isManualControlActive = () => {
    return lastManualAction && (Date.now() - lastManualAction) < MANUAL_CONTROL_TIMEOUT;
  };

  // Enhanced intersection observer for viewport detection
  useEffect(() => {
    if (!mediaRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.3;
        setIsInViewport(inView);

        if (isVideoMedia && !isFullscreen) {
          if (!inView && isPlaying) {
            // Pause video when it leaves viewport
            mediaRef.current?.pause();
            setIsPlaying(false);
            console.log('Video paused: out of viewport');
          } else if (inView && canPlay && !isPlaying && !manuallyPaused && !isManualControlActive()) {
            // Resume video when it enters viewport, unless manually paused
            mediaRef.current?.play().catch((error) => {
              console.error('Autoplay failed:', error);
            });
            setIsPlaying(true);
            console.log('Video resumed: in viewport');
          }
        }
      },
      {
        threshold: [0.3],
        rootMargin: '0px'
      }
    );

    observer.observe(mediaRef.current);
    return () => observer.disconnect();
  }, [canPlay, isPlaying, manuallyPaused, isVideoMedia, isFullscreen]);

  // Enhanced fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Enhanced media event handlers with automatic dimension detection
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleLoadedMetadata = () => {
      console.log('Media metadata loaded');
      setVideoData({
        width: media.videoWidth || media.clientWidth,
        height: media.videoHeight || media.clientHeight,
        duration: media.duration
      });
      
      // Automatic video format detection based on aspect ratio
      if (media.videoWidth && media.videoHeight) {
        const aspectRatio = media.videoWidth / media.videoHeight;
        setVideoAspectRatio(aspectRatio);
        
        // Determine video format based on aspect ratio
        if (aspectRatio < 0.75) {
          // Portrait videos (9:16, 3:4, etc.)
          setVideoFormat('portrait');
        } else if (aspectRatio >= 0.75 && aspectRatio <= 1.33) {
          // Square-ish videos (1:1, 4:3, etc.)
          setVideoFormat('square');
        } else {
          // Landscape videos (16:9, 21:9, etc.)
          setVideoFormat('landscape');
        }
        
        console.log(`Video detected: ${media.videoWidth}x${media.videoHeight}, aspect ratio: ${aspectRatio.toFixed(2)}, format: ${aspectRatio < 0.75 ? 'portrait' : aspectRatio <= 1.33 ? 'square' : 'landscape'}`);
      }
      
      setDuration(media.duration);
      media.volume = volume;
      media.muted = isMuted; // Apply global mute state
    };

    const handleCanPlay = () => {
      console.log('Media can play');
      setIsLoading(false);
      setCanPlay(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      console.log('Media started playing');
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      console.log('Media paused');
    };
    
    const handleError = (e) => {
      console.error('Media error:', e.target.error);
      setMediaError(true);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleWaiting = () => {
      if (userInteracted) {
        setIsLoading(true);
      }
    };

    const handlePlaying =  () => {
      setIsLoading(false);
    };

    const handleVolumeChange = () => {
      setIsMuted(mediaRef.current.muted);
      setVolume(mediaRef.current.volume);
    };

    // Add event listeners
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('error', handleError);
    media.addEventListener('loadstart', handleLoadStart);
    media.addEventListener('waiting', handleWaiting);
    media.addEventListener('playing', handlePlaying);
    media.addEventListener('volumechange', handleVolumeChange);

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('canplay', handleCanPlay);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('error', handleError);
      media.removeEventListener('loadstart', handleLoadStart);
      media.removeEventListener('waiting', handleWaiting);
      media.removeEventListener('playing', handlePlaying);
      media.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [volume, userInteracted, isMuted, setIsMuted]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!shouldUseMobileLayout && showControls && isPlaying && !isFullscreen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showControls, isPlaying, shouldUseMobileLayout, isFullscreen]);

  // Enhanced toggle play with manual control tracking
  const togglePlay = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
    if (isPlaying) {
      mediaRef.current.pause();
      setManuallyPaused(true);
    } else {
      setManuallyPaused(false);
      mediaRef.current.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    const newMuted = !isMuted;
    setIsMuted(newMuted); // Update global mute state
    mediaRef.current.muted = newMuted;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        } else if (containerRef.current.mozRequestFullScreen) {
          await containerRef.current.mozRequestFullScreen();
        } else if (containerRef.current.msRequestFullscreen) {
          await containerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const toggleMediaVisibility = () => {
    setHideMedia(!hideMedia);
  };

  const handleVolumeChangeSlider = (newVolume) => {
    if (mediaRef.current) {
      setUserInteracted(true);
      setLastManualAction(Date.now());
      setVolume(newVolume);
      mediaRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
    }
  };

  const handleSeek = (e) => {
    if (mediaRef.current && duration > 0) {
      setUserInteracted(true);
      setLastManualAction(Date.now());
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMediaInteraction = (e) => {
    e.preventDefault();
    setUserInteracted(true);
    setShowControls(true);
    togglePlay();
  };

  const handleMouseMove = () => {
    if (!shouldUseMobileLayout) {
      setShowControls(true);
    }
  };

  const handleReadMore = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCaptionClose = () => {
    setShowFullCaption(false);
    setIsExpanded(false);
  };

  // Render video caption overlay (only when explicitly enabled via prop)
  const renderVideoCaption = () => {
    if (!caption || !showCaptionOverlay) return null;

    return (
      <div className={"absolute top-4 left-4 right-4 z-30 " + (showFullCaption ? "bottom-20" : "")}>
        <div className={
          "bg-black bg-opacity-75 text-white p-3 rounded-lg backdrop-blur-sm " +
          (showFullCaption ? "max-h-full overflow-y-auto" : "max-h-32 overflow-hidden")
        }>
          <div className="text-sm leading-relaxed">
            {showFullCaption ? caption : displayCaption}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {shouldTruncate && !showFullCaption && (
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                >
                  <FaChevronDown size={10} />
                  Read full caption
                </button>
              )}
              
              {shouldTruncate && !showFullCaption && (
                <button
                  onClick={handleReadMore}
                  className="flex items-center gap-1 text-gray-300 hover:text-white text-xs transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <FaChevronUp size={10} />
                      Less
                    </>
                  ) : (
                    <>
                      <FaChevronDown size={10} />
                      More
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
      <>
        <div className="w-screen max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
          {displayCaption}
        </div>
        
        {shouldTruncate && (
          <button
            onClick={handleReadMore}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium transition-colors mt-2"
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
        
        {isExpanded && caption.length > 200 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {caption.length} characters
          </div>
        )}
      </>
    );
  };

  // Render image
  if (imageUrl && !hasMedia) {
    return (
      <div className="w-full overflow-x-hidden">
        {!hideMedia && (
          <div className="w-full overflow-x-hidden">
            <img
              src={imageUrl}
              alt={altText}
              className="w-full h-auto object-cover border border-gray-200 dark:border-gray-600 shadow-sm" // no rounded
              loading="lazy"
              onError={() => setMediaError(true)}
            />
          </div>
        )}
        {renderImageCaption()}
      </div>
    );
  }

  // Render audio with enhanced controls
  if (isAudioMedia) {
    return (
      <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        {!hideMedia && (
          <div className="p-4">
            {/* Audio element */}
            <audio
              ref={mediaRef}
              src={audioUrl}
              className="w-full"
              preload="metadata"
              controls={false}
            >
              Your browser does not support the audio tag.
            </audio>

            {/* Custom audio controls */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3 mt-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors"
                >
                  {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                </button>
                
                <button
                  onClick={toggleMute}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {isMuted ? (
                    <FaVolumeMute size={16} />
                  ) : volume < 0.5 ? (
                    <FaVolumeDown size={16} />
                  ) : (
                    <FaVolumeUp size={16} />
                  )}
                </button>
                
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Show/hide media toggle */}
              <button
                onClick={toggleMediaVisibility}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Hide audio player"
              >
                <FaEyeSlash size={14} />
              </button>
            </div>

            {/* Progress bar */}
            <div
              className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2 mt-3 cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Loading/Error states */}
            {isLoading && !mediaError && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading audio...</div>
              </div>
            )}

            {mediaError && (
              <div className="text-center py-4">
                <div className="text-sm text-red-600 dark:text-red-400 mb-2">Audio failed to load</div>
                <button
                  onClick={() => {
                    setMediaError(false);
                    setIsLoading(true);
                    mediaRef.current?.load();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render video with automatic dimension-based layout
  if (isVideoMedia) {
    return (
      <div className="w-full overflow-x-hidden">
        {!hideMedia && (
          <div 
            ref={containerRef}
            className="relative bg-black overflow-hidden cursor-pointer w-screen max-w-none"
            style={{
              minHeight: isFullscreen ? '100vh' : shouldUseMobileLayout ? '60vh' : '50vh',
              height: isFullscreen ? '100vh' : shouldUseMobileLayout ? '60vh' : '50vh',
              aspectRatio: videoFormat === 'portrait' ? '9/16' :
                          videoFormat === 'square' ? '1/1' :
                          videoAspectRatio || 'auto',
              maxWidth: '100vw'
            }}
          >
            <video
              ref={mediaRef}
              src={videoUrl}
              className="w-full max-w-full h-full object-contain" // no rounded
              muted={isMuted}
              loop
              playsInline={true}
              webkit-playsinline="true"
              preload="metadata"
              controls={false}
              onClick={handleMediaInteraction}
            >
              Your browser does not support the video tag.
            </video>
            {/* Autoplay indicator */}
            {isInViewport && !userInteracted && canPlay && !isFullscreen && (
              <div className="absolute top-3 right-3 bg-green-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs z-20">
                Auto-playing
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !mediaError && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <div className="text-sm">Loading video...</div>
                  <div className="text-xs text-gray-300 mt-2">
                    {shouldUseMobileLayout ? 'Optimizing for mobile format...' : 'Will autoplay when in view'}
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {mediaError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                <div className="text-center text-white p-4">
                  <div className="text-sm mb-2">Video failed to load</div>
                  <button
                    onClick={() => {
                      setMediaError(false);
                      setIsLoading(true);
                      setUserInteracted(true);
                      mediaRef.current?.load();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Video controls overlay */}
            <div 
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                showControls || !isPlaying || shouldUseMobileLayout || isFullscreen ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Center play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={handleMediaInteraction}
                  className={`bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all duration-200 hover:scale-110 ${
                    shouldUseMobileLayout ? 'p-6' : 'p-5'
                  }`}
                >
                  {isPlaying ? <FaPause size={shouldUseMobileLayout ? 32 : 28} /> : <FaPlay size={shouldUseMobileLayout ? 32 : 28} />}
                </button>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress bar */}
                <div 
                  className={`w-full bg-gray-600 rounded-full mb-4 cursor-pointer ${
                    shouldUseMobileLayout ? 'h-3' : 'h-2'
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
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleMediaInteraction}
                      className="hover:text-blue-300 transition-colors"
                    >
                      {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
                    </button>
                    
                    {/* Volume controls */}
                    <button 
                      onClick={toggleMute}
                      className="hover:text-blue-300 transition-colors"
                    >
                      {isMuted ? (
                        <FaVolumeMute size={18} />
                      ) : volume < 0.5 ? (
                        <FaVolumeDown size={18} />
                      ) : (
                        <FaVolumeUp size={18} />
                      )}
                    </button>
                    
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Fullscreen toggle */}
                    <button
                      onClick={toggleFullscreen}
                      className="hover:text-blue-300 transition-colors"
                      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? (
                        <FaCompress size={18} />
                      ) : (
                        <FaExpand size={18} />
                      )}
                    </button>

                    {/* Status indicators */}
                    <div className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded flex items-center gap-1">
                      {shouldUseMobileLayout && <span>📱</span>}
                      {isInViewport && <span>👁️</span>}
                      {isFullscreen && <span>🔳</span>}
                      {manuallyPaused && <span>⏸️</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Full caption view when video is hidden */}
        {hideMedia && caption && (
          <div className="w-full flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
        
        {/* Caption below video */}
        {!hideMedia && caption && (
          <>
            <div className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              {displayCaption}
            </div>
            {shouldTruncate && (
              <button
                onClick={handleReadMore}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium transition-colors mt-2"
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
          </>
        )}
      </div>
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={altText}
        className={`block ${className}`}
        style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
      />
    );
  }
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        className={`block ${className}`}
        style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
      />
    );
  }
  return null;
}