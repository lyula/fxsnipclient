
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
    mediaRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setIsMuted(newMuted); // Update context
  };

  const handleVolumeChange = (e) => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
    const newVolume = parseFloat(e.target.value);
    mediaRef.current.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      mediaRef.current.muted = true;
      setIsMuted(true);
    } else if (mediaRef.current.muted) {
      mediaRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
    if (!isFullscreen) {
      const requestFullscreen = mediaRef.current.requestFullscreen || 
        mediaRef.current.webkitRequestFullscreen ||
        mediaRef.current.mozRequestFullScreen ||
        mediaRef.current.msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(mediaRef.current);
      }
    } else {
      const exitFullscreen = document.exitFullscreen || 
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      
      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
    }
  };

  const handleProgressChange = (e) => {
    if (!mediaRef.current) return;
    
    setUserInteracted(true);
    setLastManualAction(Date.now());
    
    const newTime = parseFloat(e.target.value);
    mediaRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleExpandCaption = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleImageModal = () => {
    setShowImageModal(!showImageModal);
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
      const aspectRatio = naturalWidth / naturalHeight;
      const isCropped = clientWidth < naturalWidth || clientHeight < naturalHeight;
      setIsImageCropped(isCropped);
      
      if (aspectRatio < 0.75) {
        setVideoFormat('portrait');
      } else if (aspectRatio <= 1.33) {
        setVideoFormat('square');
      } else {
        setVideoFormat('landscape');
      }
      
      setIsLoading(false);
    }
  };

  const toggleMediaVisibility = () => {
    setHideMedia(!hideMedia);
  };

  const renderImageCaption = () => {
    if (!caption) return null;
    
    return (
      <div className="w-screen max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-3 break-words break-keep-all overflow-wrap-normal">
        {displayCaption}
        {shouldTruncate && (
          <button 
            onClick={toggleExpandCaption}
            className="text-blue-600 dark:text-blue-400 hover:underline ml-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    );
  };

  const renderVideoCaption = () => {
    if (!caption) return null;

    const captionClasses = showCaptionOverlay 
      ? 'absolute bottom-4 left-4 right-4 bg-black/50 text-white p-2 rounded'
      : 'text-sm text-gray-700 dark:text-gray-300 mt-2 break-words break-keep-all overflow-wrap-normal';

    return (
      <div className={captionClasses}>
        {displayCaption}
        {shouldTruncate && (
          <button 
            onClick={toggleExpandCaption}
            className="text-blue-300 hover:underline ml-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    );
  };

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={togglePlay}
            className="text-white hover:text-gray-300"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="text-white hover:text-gray-300"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <FaVolumeMute size={20} />
              ) : volume < 0.5 ? (
                <FaVolumeDown size={20} />
              ) : (
                <FaVolumeUp size={20} />
              )}
            </button>
            {showVolumeSlider && (
              <div className="absolute bottom-12 left-0 w-24 bg-gray-800 p-2 rounded">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full"
                  orient="vertical"
                />
              </div>
            )}
          </div>
          
          <span className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMediaVisibility}
            className="text-white hover:text-gray-300"
            aria-label={hideMedia ? 'Show media' : 'Hide media'}
          >
            {hideMedia ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
          </button>
          
          <button 
            onClick={toggleFullscreen}
            className="text-white hover:text-gray-300"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <FaCompress size={20} /> : <FaExpand size={20} />}
          </button>
        </div>
      </div>
    );
  };

  const renderImageContent = () => {
    if (hideMedia) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <button 
            onClick={toggleMediaVisibility}
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FaEye size={24} />
            <span className="ml-2">Show Image</span>
          </button>
        </div>
      );
    }

    return (
      <>
        <img
          ref={imgRef}
          src={imageUrl}
          alt={altText}
          className={`w-full h-auto object-contain ${className} ${isImageCropped ? 'cursor-pointer' : ''}`}
          onLoad={handleImageLoad}
          onError={() => setMediaError(true)}
          onClick={isImageCropped ? toggleImageModal : undefined}
        />
        {renderImageCaption()}
      </>
    );
  };

  const renderVideoContent = () => {
    if (hideMedia) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <button 
            onClick={toggleMediaVisibility}
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FaEye size={24} />
            <span className="ml-2">Show Video</span>
          </button>
        </div>
      );
    }

    return (
      <div className="relative" style={{ aspectRatio: videoAspectRatio || '16/9' }}>
        <video
          ref={mediaRef}
          src={videoUrl}
          className={`w-full h-auto ${className}`}
          playsInline
          muted={isMuted}
          onClick={togglePlay}
        />
        {renderControls()}
        {showCaptionOverlay && renderVideoCaption()}
      </div>
    );
  };

  const renderAudioContent = () => {
    if (hideMedia) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <button 
            onClick={toggleMediaVisibility}
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FaEye size={24} />
            <span className="ml-2">Show Audio</span>
          </button>
        </div>
      );
    }

    return (
      <div className="relative w-full">
        <audio
          ref={mediaRef}
          src={audioUrl}
          className="w-full"
          onClick={togglePlay}
        />
        {renderControls()}
      </div>
    );
  };

  const renderImageModal = () => {
    if (!showImageModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="relative max-w-full max-h-full">
          <button 
            onClick={toggleImageModal}
            className="absolute top-4 left-4 text-white hover:text-gray-300"
            aria-label="Close modal"
          >
            <FaArrowLeft size={24} />
          </button>
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-[90vh] object-contain"
          />
          {renderImageCaption()}
        </div>
      </div>
    );
  };

  if (mediaError) {
    return (
      <div className="w-full p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
        <p>Failed to load media.</p>
        <button 
          onClick={() => {
            setMediaError(false);
            setIsLoading(true);
            if (mediaRef.current) mediaRef.current.load();
          }}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        ref={containerRef}
        className={`relative w-full ${shouldUseMobileLayout ? 'max-w-md mx-auto' : ''}`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {imageUrl && renderImageContent()}
        {isVideoMedia && renderVideoContent()}
        {isAudioMedia && renderAudioContent()}
        {!showCaptionOverlay && (isVideoMedia || isAudioMedia) && renderVideoCaption()}
        {renderImageModal()}
      </div>
    </ErrorBoundary>
  );
}