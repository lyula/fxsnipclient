import React, { useState, useRef, useEffect, useMemo, createContext, useContext, Component } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaVolumeDown, FaChevronDown, FaChevronUp, FaEye, FaEyeSlash, FaExpand, FaCompress, FaArrowLeft } from 'react-icons/fa';

// Error Boundary Component
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in MediaDisplay:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          <h3>Something went wrong with the media player.</h3>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a context for managing mute state globally
const MuteContext = createContext({
  isMuted: false,
  setIsMuted: () => {},
});

// MuteContext Provider component to wrap around the app or components
export const MuteProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(true); // Default to muted to comply with autoplay policies
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [isImageCropped, setIsImageCropped] = useState(false);
  
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const imgRef = useRef(null);

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
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        setIsInViewport(inView);

        if (isVideoMedia && !isFullscreen) {
          if (!inView && isPlaying) {
            mediaRef.current?.pause();
            setIsPlaying(false);
            console.log('Video paused: out of viewport');
          } else if (inView && canPlay && !isPlaying && !manuallyPaused && !isManualControlActive()) {
            const playPromise = mediaRef.current?.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                  console.log('Video resumed: in viewport');
                })
                .catch((error) => {
                  console.error('Autoplay failed:', error);
                  setIsPlaying(false);
                  setMediaError(true);
                });
            }
          }
        }
      },
      {
        threshold: [0.5],
        rootMargin: '50px'
      }
    );

    observer.observe(mediaRef.current); // Fixed typo: Changed Observer to observer
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

    // Optimize video for mobile on load
    if (isVideoMedia && isActualMobile) {
      optimizeVideoForMobile(media);
      
      // Check mobile video support
      if (!checkMobileVideoSupport()) {
        console.error('Mobile device may not support MP4 video playback');
        setMediaError(true);
        return;
      }
    }

    const handleLoadedMetadata = () => {
      console.log('Media metadata loaded', {
        width: media.videoWidth || media.clientWidth,
        height: media.videoHeight || media.clientHeight,
        duration: media.duration,
        readyState: media.readyState,
        networkState: media.networkState
      });
      
      setVideoData({
        width: media.videoWidth || media.clientWidth,
        height: media.videoHeight || media.clientHeight,
        duration: media.duration
      });
      
      if (media.videoWidth && media.videoHeight) {
        const aspectRatio = media.videoWidth / media.videoHeight;
        setVideoAspectRatio(aspectRatio);
        
        if (aspectRatio < 0.75) {
          setVideoFormat('portrait');
        } else if (aspectRatio >= 0.75 && aspectRatio <= 1.33) {
          setVideoFormat('square');
        } else {
          setVideoFormat('landscape');
        }
        
        console.log(`Video format detected: ${aspectRatio < 0.75 ? 'portrait' : aspectRatio <= 1.33 ? 'square' : 'landscape'}`);
      }
      
      setDuration(media.duration);
      media.volume = volume;
      media.muted = isMuted;
    };

    const handleCanPlay = () => {
      console.log('Media can play - readyState:', media.readyState);
      setIsLoading(false);
      setCanPlay(true);
      setMediaError(false);
      
      // For mobile devices, try to play immediately if in viewport
      if (isActualMobile && isInViewport && !manuallyPaused && !isManualControlActive()) {
        const playPromise = media.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('Mobile autoplay failed (expected):', error.message);
            // Don't set error for autoplay failures on mobile
          });
        }
      }
    };

    const handleError = (e) => {
      const error = e.target.error;
      console.error('Media error details:', {
        code: error?.code,
        message: error?.message,
        src: media.src,
        readyState: media.readyState,
        networkState: media.networkState
      });
      
      // Try to recover from network errors
      if (error?.code === MediaError.MEDIA_ERR_NETWORK) {
        console.log('Network error detected, attempting to reload...');
        setTimeout(() => {
          media.load();
        }, 1000);
      } else {
        setMediaError(true);
        setIsLoading(false);
      }
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
    
    const handleVolumeChange = () => {
      setIsMuted(media.muted);
      setVolume(media.volume);
    };

    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('error', handleError);
    media.addEventListener('volumechange', handleVolumeChange);

    if (mediaError) {
      media.load();
    }

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('canplay', handleCanPlay);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('error', handleError);
      media.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [volume, userInteracted, isMuted, isInViewport, manuallyPaused, mediaError, isActualMobile]);

  // Auto-hide controls after 2 seconds
  useEffect(() => {
    if (!isPlaying || isFullscreen || showVolumeSlider) {
      setShowControls(true); // Show controls when paused, in fullscreen, or volume slider is active
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // When playing, show controls and set timeout to hide
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
      console.log('Controls hidden after 2 seconds');
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, isFullscreen, showVolumeSlider]);

  // Enhanced toggle play with manual control tracking
  const togglePlay = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
    if (isPlaying) {
      mediaRef.current.pause();
      setManuallyPaused(true);
    } else {
      const playPromise = mediaRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Play failed:', error);
          setMediaError(true);
        });
      }
      setManuallyPaused(false);
    }
  };

  // Modified toggleMute to ensure unmute works correctly
  const toggleMute = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    const newMuted = !mediaRef.current.muted;
    setIsMuted(newMuted);
    mediaRef.current.muted = newMuted;
    if (!newMuted && mediaRef.current.volume === 0) {
      const newVolume = 0.5;
      setVolume(newVolume);
      mediaRef.current.volume = newVolume;
    }
    showControlsWithTimeout(); // Show controls on mute/unmute
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
    showControlsWithTimeout(); // Show controls on fullscreen toggle
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
      mediaRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
      showControlsWithTimeout(); // Show controls on volume change
    }
  };

  const handleSeek = (e) => {
    if (mediaRef.current && duration > 0) {
      setUserInteracted(true);
      setLastManualAction(Date.now());
      showControlsWithTimeout();
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
    setLastManualAction(Date.now());
    
    showControlsWithTimeout(); // Show controls on interaction
    togglePlay();
  };

  const handleMouseMove = () => {
    if (!shouldUseMobileLayout) {
      showControlsWithTimeout();
    }
  };

  const handleReadMore = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCaptionClose = () => {
    setShowFullCaption(false);
    setIsExpanded(false);
  };

  const showControlsWithTimeout = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isPlaying && !isFullscreen) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
        console.log('Controls hidden after 2 seconds');
      }, 2000);
    }
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

  // Check if video URL is MP4 format
  const ensureMP4Format = (videoUrl) => {
    if (!videoUrl) return videoUrl;
    
    // If URL doesn't end with .mp4, try to force MP4 format
    if (!videoUrl.toLowerCase().includes('.mp4')) {
      console.warn('Video URL may not be MP4 format:', videoUrl);
    }
    
    return videoUrl;
  };

  // Mobile video compatibility check
  const checkMobileVideoSupport = () => {
    const video = document.createElement('video');
    const canPlayMP4 = video.canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
    const canPlayBasicMP4 = video.canPlayType('video/mp4');
    
    console.log('Mobile video support:', {
      mp4WithCodecs: canPlayMP4,
      basicMP4: canPlayBasicMP4,
      userAgent: navigator.userAgent
    });
    
    return canPlayMP4 !== '' || canPlayBasicMP4 !== '';
  };

  // Force video to use MP4 format
  const optimizeVideoForMobile = (videoElement) => {
    if (!videoElement) return;
    
    // Set mobile-specific attributes
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.setAttribute('x5-playsinline', 'true');
    videoElement.setAttribute('x5-video-player-type', 'h5');
    videoElement.setAttribute('x5-video-player-fullscreen', 'false');
    
    // Force muted for autoplay compatibility
    if (isActualMobile) {
      videoElement.muted = true;
    }
    
    return videoElement;
  };

  // Render image
  if (imageUrl && !hasMedia) {
    return (
      <ErrorBoundary>
        <div className="w-full overflow-x-hidden relative">
          {!hideMedia && (
            <div className="w-full overflow-x-hidden relative">
              <img
                ref={imgRef}
                src={imageUrl}
                alt={altText}
                className="w-full h-auto object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                loading="lazy"
                onError={() => setMediaError(true)}
                style={{ cursor: isImageCropped ? "zoom-in" : "default" }}
                onClick={() => isImageCropped && setShowImageModal(true)}
                onLoad={() => {
                  if (imgRef.current) {
                    const cropped =
                      imgRef.current.naturalHeight > imgRef.current.clientHeight + 2 ||
                      imgRef.current.naturalWidth > imgRef.current.clientWidth + 2;
                    console.log('Image loaded:', {
                      naturalHeight: imgRef.current.naturalHeight,
                      clientHeight: imgRef.current.clientHeight,
                      naturalWidth: imgRef.current.naturalWidth,
                      clientWidth: imgRef.current.clientWidth,
                      cropped
                    });
                    setIsImageCropped(cropped);
                  }
                }}
              />
              {/* Fullscreen switch button */}
              {isImageCropped && (
                <FaExpand
                  onClick={e => {
                    e.stopPropagation();
                    setShowImageModal(true);
                  }}
                  className="absolute bottom-2 right-2 cursor-pointer shadow-md"
                  size={28}
                  style={{
                    color: "#a99d6b",
                    background: "white",
                    borderRadius: "50%",
                    padding: "6px",
                    zIndex: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
                  }}
                  title="View full image"
                />
              )}
            </div>
          )}
          {renderImageCaption()}

          {/* Modal for full image */}
          {showImageModal && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90"
              onClick={() => setShowImageModal(false)}
              style={{ cursor: "zoom-out" }}
            >
              <FaArrowLeft
                onClick={e => {
                  e.stopPropagation();
                  setShowImageModal(false);
                }}
                className="absolute top-6 right-6 cursor-pointer"
                size={32}
                style={{ color: "#a99d6b", zIndex: 60, background: "white", borderRadius: "50%", padding: "6px" }}
                title="Back to Feed"
              />
              <img
                src={imageUrl}
                alt={altText}
                className="max-w-full max-h-full"
                style={{ objectFit: "contain" }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      </ErrorBoundary>
    );
  }

  // Render audio with enhanced controls
  if (isAudioMedia) {
    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    );
  }

  // Render video with automatic dimension-based layout
  if (isVideoMedia) {
    return (
      <ErrorBoundary>
        <div className="w-full overflow-x-hidden">
          {!hideMedia && (
            <div 
              ref={containerRef}
              className="relative bg-black overflow-hidden cursor-pointer w-full flex justify-center items-center"
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
                className="w-full max-w-full h-full object-contain"
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"  // Android WeChat support
                x5-video-player-type="h5"  // Force H5 player
                x5-video-player-fullscreen="false"  // Prevent forced fullscreen
                muted={isMuted}
                loop
                preload="metadata"  // Changed from "auto" to reduce loading time
                controls={false}
                onClick={handleMediaInteraction}
                onLoadStart={() => {
                  console.log('Video loading started');
                  setIsLoading(true);
                }}
                onCanPlayThrough={() => {
                  console.log('Video can play through');
                  setIsLoading(false);
                  setCanPlay(true);
                  setMediaError(false);
                }}
                onError={(e) => {
                  console.error('Video loading error:', e);
                  setMediaError(true);
                  setIsLoading(false);
                }}
                onLoadedMetadata={(e) => {
                  const video = e.target;
                  console.log('Video metadata loaded:', {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                  });
                  setDuration(video.duration);
                  
                  // Detect video format for mobile optimization
                  if (video.videoWidth && video.videoHeight) {
                    const aspectRatio = video.videoWidth / video.videoHeight;
                    setVideoAspectRatio(aspectRatio);
                    
                    if (aspectRatio < 0.8) {
                      setVideoFormat('portrait');
                    } else if (aspectRatio > 1.2) {
                      setVideoFormat('landscape');
                    } else {
                      setVideoFormat('square');
                    }
                  }
                }}
              >
                {/* Force MP4 format first - most compatible */}
                <source src={videoUrl} type="video/mp4; codecs=avc1.42E01E,mp4a.40.2" />
                <source src={videoUrl} type="video/mp4" />
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
                      {isActualMobile ? 'Optimized for mobile playback' : 'Click to play'}
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
                  showControls || !isPlaying || isFullscreen ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={shouldUseMobileLayout ? handleMediaInteraction : undefined}
                onMouseMove={shouldUseMobileLayout ? undefined : handleMouseMove}
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
      </ErrorBoundary>
    );
  }

  if (imageUrl) {
    return (
      <ErrorBoundary>
        <img
          src={imageUrl}
          alt={altText}
          className={`block ${className}`}
          style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
        />
      </ErrorBoundary>
    );
  }
  if (videoUrl) {
    return (
      <ErrorBoundary>
        <video
          src={videoUrl}
          controls
          className={`block ${className}`}
          style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="false"
          preload="metadata"
          onLoadStart={() => console.log('Fallback video loading...')}
          onCanPlayThrough={() => console.log('Fallback video ready')}
        />
      </ErrorBoundary>
    );
  }

  return null;
}