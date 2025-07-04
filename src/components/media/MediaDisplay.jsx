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

// MuteContext Provider component
export const MuteProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
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
  const { isMuted, setIsMuted } = useContext(MuteContext);
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
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [lastManualAction, setLastManualAction] = useState(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [videoFormat, setVideoFormat] = useState('landscape');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [hideMedia, setHideMedia] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isImageCropped, setIsImageCropped] = useState(false);
  
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const imgRef = useRef(null);

  const isActualMobile = useMemo(() => {
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenSizeMobile = window.screen.width <= 768 || window.screen.height <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mediaQueryMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasOrientationAPI = 'orientation' in window;
    
    return userAgentMobile || (screenSizeMobile && isTouchDevice) || (mediaQueryMobile && isTouchDevice) || hasOrientationAPI;
  }, []);

  const shouldUseMobileLayout = videoFormat === 'portrait' || isActualMobile;
  const hasAudio = Boolean(audioUrl);
  const hasVideo = Boolean(videoUrl);
  const hasMedia = hasAudio || hasVideo;
  const isVideoMedia = hasVideo;
  const isAudioMedia = hasAudio && !hasVideo;
  const shouldTruncate = caption && caption.length > 200;
  const displayCaption = shouldTruncate && !isExpanded ? 
    caption.substring(0, 200) + '...' : caption;

  const MANUAL_CONTROL_TIMEOUT = 10000;

  const isManualControlActive = () => {
    return lastManualAction && (Date.now() - lastManualAction) < MANUAL_CONTROL_TIMEOUT;
  };

  useEffect(() => {
    if (!mediaRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        setIsInViewport(inView);

        if (isVideoMedia && !isFullscreen) {
          if (!inView) {
            if (isPlaying) {
              mediaRef.current?.pause();
              setIsPlaying(false);
            }
          } else if (inView && canPlay && !isPlaying && !manuallyPaused && !isManualControlActive()) {
            const playPromise = mediaRef.current?.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
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

    observer.observe(mediaRef.current);
    return () => observer.disconnect();
  }, [canPlay, isPlaying, manuallyPaused, isVideoMedia, isFullscreen]);

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

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isVideoMedia && isActualMobile) {
      optimizeVideoForMobile(media);
      
      if (!checkMobileVideoSupport()) {
        console.error('Mobile device may not support MP4 video playback');
        setMediaError(true);
        return;
      }
    }

    const handleLoadedMetadata = () => {
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
        } else if (aspectRatio <= 1.33) {
          setVideoFormat('square');
        } else {
          setVideoFormat('landscape');
        }
      }
      
      setDuration(media.duration);
      media.volume = volume;
      media.muted = isMuted;
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setCanPlay(true);
      setMediaError(false);
      
      if (isActualMobile && isInViewport && !manuallyPaused && !isManualControlActive()) {
        const playPromise = media.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('Mobile autoplay failed (expected):', error.message);
          });
        }
      }
    };

    const handleError = (e) => {
      const error = e.target.error;
      if (error?.code === MediaError.MEDIA_ERR_NETWORK) {
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
    };
    
    const handlePause = () => {
      setIsPlaying(false);
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

    setIsPlaying(!media.paused);

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

  useEffect(() => {
    if (!isPlaying || isFullscreen || showVolumeSlider) {
      setShowControls(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, isFullscreen, showVolumeSlider]);

  const optimizeVideoForMobile = (videoElement) => {
    if (!videoElement) return;
    
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.setAttribute('x5-playsinline', 'true');
    videoElement.setAttribute('x5-video-player-type', 'h5');
    videoElement.setAttribute('x5-video-player-fullscreen', 'false');
    
    if (isActualMobile) {
      videoElement.muted = !userInteracted;
    }
    
    return videoElement;
  };

  const checkMobileVideoSupport = () => {
    const video = document.createElement('video');
    const canPlayMP4 = video.canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
    const canPlayBasicMP4 = video.canPlayType('video/mp4');
    
    return canPlayMP4 !== '' || canPlayBasicMP4 !== '';
  };

  const initMobileAudioContext = () => {
    if (!isActualMobile) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      try {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(err => {
            console.warn('Failed to resume audio context:', err);
          });
        }
      } catch (err) {
        console.warn('Failed to create audio context:', err);
      }
    }
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
  if (isActualMobile) {
  initMobileAudioContext();
}
    
    if (isPlaying) {
      mediaRef.current.pause();
      setManuallyPaused(true);
    } else {
      if (isActualMobile && mediaRef.current.muted && !isMuted) {
        mediaRef.current.muted = false;
      }
      
      const playPromise = mediaRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setManuallyPaused(false);
        }).catch((error) => {
          if (isActualMobile && !mediaRef.current.muted) {
            mediaRef.current.muted = true;
            setIsMuted(true);
            const mutedPlayPromise = mediaRef.current.play();
            if (mutedPlayPromise !== undefined) {
              mutedPlayPromise.then(() => {
                setManuallyPaused(false);
              }).catch(() => {
                setMediaError(true);
              });
            }
          } else {
            setMediaError(true);
          }
        });
      }
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
   if (isActualMobile) {
  initMobileAudioContext();
}
    
    const newMuted = !mediaRef.current.muted;
    
    if (isActualMobile && !newMuted) {
      initMobileAudioContext();
      // Small delay to ensure audio context is ready
      setTimeout(() => {
        mediaRef.current.muted = newMuted;
        setIsMuted(newMuted);
        if (!newMuted && mediaRef.current.volume === 0) {
          const newVolume = 0.5;
          setVolume(newVolume);
          mediaRef.current.volume = newVolume;
        }
      }, 100);
    } else {
      mediaRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && mediaRef.current.volume === 0) {
        const newVolume = 0.5;
        setVolume(newVolume);
        mediaRef.current.volume = newVolume;
      }
    }
    
    showControlsWithTimeout();
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
    showControlsWithTimeout();
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
      showControlsWithTimeout();
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
    showControlsWithTimeout();
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
    
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

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

  const ensureMP4Format = (videoUrl) => {
    if (!videoUrl) return videoUrl;
    
    if (!videoUrl.toLowerCase().includes('.mp4')) {
      console.warn('Video URL may not be MP4 format:', videoUrl);
    }
    
    return videoUrl;
  };

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
                    setIsImageCropped(cropped);
                  }
                }}
              />
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

  if (isAudioMedia) {
    return (
      <ErrorBoundary>
        <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {!hideMedia && (
            <div className="p-4">
              <audio
                ref={mediaRef}
                src={audioUrl}
                className="w-full"
                preload="metadata"
                controls={false}
              >
                Your browser does not support the audio tag.
              </audio>

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

                <button
                  onClick={toggleMediaVisibility}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  title="Hide audio player"
                >
                  <FaEyeSlash size={14} />
                </button>
              </div>

              <div
                className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2 mt-3 cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

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

  if (isVideoMedia) {
    return (
      <ErrorBoundary>
        <div className="w-full overflow-x-hidden">
          {!hideMedia && (
            <div 
              ref={containerRef}
              className="relative overflow-hidden cursor-pointer w-full"
              style={{
                minHeight: shouldUseMobileLayout ? 'auto' : 'auto',
                height: isFullscreen ? '100vh' : 'auto',
                background: 'transparent',
                maxWidth: '100vw'
              }}
              onClick={handleMediaInteraction}
              onMouseMove={handleMouseMove}
            >
              <video
                ref={mediaRef}
                src={ensureMP4Format(videoUrl)}
                className="w-full block"
                style={{
                  height: 'auto',
                  maxHeight: shouldUseMobileLayout ? '70vh' : '60vh',
                  objectFit: 'cover',
                  display: 'block',
                  backgroundColor: 'transparent'
                }}
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                x5-video-player-type="h5"
                x5-video-player-fullscreen="false"
                muted={isMuted}
                loop
                preload="metadata"
                controls={false}
                onLoadStart={() => {
                  setIsLoading(true);
                }}
                onCanPlayThrough={() => {
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
                  setDuration(video.duration);
                  
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
                <source src={ensureMP4Format(videoUrl)} type="video/mp4; codecs=avc1.42E01E,mp4a.40.2" />
                <source src={ensureMP4Format(videoUrl)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              <div 
                className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ zIndex: 10 }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                    showControlsWithTimeout();
                  }}
                  className={`text-white rounded-full transition-all duration-200 hover:scale-110 pointer-events-auto ${
                    shouldUseMobileLayout 
                      ? 'p-6 bg-black/70 border-2 border-white/90'
                      : 'p-5 bg-black/60 hover:bg-black/80'
                  }`}
                  style={{
                    minWidth: shouldUseMobileLayout ? '80px' : '70px',
                    minHeight: shouldUseMobileLayout ? '80px' : '70px',
                    zIndex: 20
                  }}
                >
                  {isPlaying ? (
                    <FaPause size={shouldUseMobileLayout ? 32 : 28} />
                  ) : (
                    <FaPlay size={shouldUseMobileLayout ? 32 : 28} />
                  )}
                </button>

                <div 
                  className={`absolute bottom-12 left-4 pointer-events-none transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ zIndex: 15 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                      showControlsWithTimeout();
                    }}
                    className={`text-white rounded-full transition-all duration-200 hover:scale-110 pointer-events-auto ${
                      shouldUseMobileLayout 
                        ? 'p-2 bg-black/60 border border-white/70'
                        : 'p-2 bg-black/50 hover:bg-black/70'
                    }`}
                    style={{
                      minWidth: shouldUseMobileLayout ? '36px' : '32px',
                      minHeight: shouldUseMobileLayout ? '36px' : '32px',
                      zIndex: 20
                    }}
                  >
                    {isMuted ? (
                      <FaVolumeMute size={shouldUseMobileLayout ? 16 : 14} />
                    ) : (
                      <FaVolumeUp size={shouldUseMobileLayout ? 16 : 14} />
                    )}
                  </button>
                </div>
              </div>

              {isLoading && !mediaError && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                  style={{ zIndex: 15 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}

              {mediaError && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white"
                  style={{ zIndex: 15 }}
                >
                  <div className="text-lg font-semibold mb-2">Video failed to load</div>
                  <button
                    onClick={() => {
                      setMediaError(false);
                      setIsLoading(true);
                      mediaRef.current?.load();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {renderVideoCaption()}
            </div>
          )}
          
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

  return null;
}