import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaExternalLinkAlt, FaEye, FaMousePointer, FaCalendarAlt, FaDollarSign, FaGlobe, FaFlag, FaUser, FaVolumeMute, FaVolumeUp, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import AdsInteractionBar from './AdsInteractionBar';
import {
  likeAd,
  shareAd,
  viewAd,
  getAdInteractions
} from '../utils/adInteractionsApi';

const AdCard = ({ ad, onEdit, onDelete, onView, onClick, showAnalytics = false, isInFeed = false }) => {
  const [liked, setLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shares, setShares] = useState(0);
  const [views, setViews] = useState(0);
  const [normalizedLikes, setNormalizedLikes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // Fetch ad interactions on mount (for feed ads)
  useEffect(() => {
    if (isInFeed && ad._id) {
      getAdInteractions(ad._id).then(data => {
        setLiked(data.likes?.some(u => u._id === ad.currentUserId));
        setLikesUsers(data.likes || []);
        setNormalizedLikes(data.likes || []);
        setShares(data.shares?.length || 0);
        setViews(data.viewCount || 0);
      });
    }
  }, [ad._id, isInFeed, ad.currentUserId]);

  // Track view on mount (for feed ads)
  useEffect(() => {
    if (isInFeed && ad._id) {
      viewAd(ad._id).then(data => {
        setViews(data.viewCount || 0);
      });
    }
  }, [ad._id, isInFeed]);

  const handleLike = async () => {
    setLikeAnimating(true);
    try {
      const data = await likeAd(ad._id);
      // The backend now returns the full AdInteraction object, so update all relevant states
      setLiked(data.likes?.some(u => u._id === ad.currentUserId));
      setLikesUsers(data.likes || []);
      setNormalizedLikes(data.likes || []);
    } finally {
      setTimeout(() => setLikeAnimating(false), 400);
    }
  };

  const handleShare = async () => {
    await shareAd(ad._id);
    setShares(s => s + 1);
  };
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Reset video error when ad changes
  useEffect(() => {
    setVideoError(false);
    setIsVideoPlaying(false);
    setIsMuted(true);
  }, [ad._id]);

  // Auto-play video when component mounts (for ads with videos)
  useEffect(() => {
    const videoUrl = Array.isArray(ad.video) ? ad.video[0] : ad.video;
    if (videoUrl && !videoError) {
      const video = document.getElementById(`video-${ad._id}`);
      if (video) {
        video.play().then(() => {
          setIsVideoPlaying(true);
        }).catch((error) => {
          console.log('Auto-play prevented:', error);
          setIsVideoPlaying(false);
        });
      }
    }
  }, [ad._id, ad.video, videoError]);

  // Track impression when ad is in view (for feed ads)
  useEffect(() => {
    if (isInFeed && onView && !hasTrackedImpression) {
      // Track impression after a brief delay to ensure the ad is actually visible
      const timer = setTimeout(() => {
        onView();
        setHasTrackedImpression(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInFeed, onView, hasTrackedImpression]);

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500',
      pending_payment: 'bg-yellow-500',
      pending_approval: 'bg-orange-500',
      active: 'bg-green-500',
      paused: 'bg-blue-500',
      completed: 'bg-purple-500',
      cancelled: 'bg-red-500',
      rejected: 'bg-red-600'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status) => {
    const texts = {
      draft: 'Draft',
      pending_payment: 'Pending Payment',
      pending_approval: 'Pending Approval',
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected'
    };
    return texts[status] || status;
  };

  const toggleVideo = () => {
    const video = document.getElementById(`video-${ad._id}`);
    if (video) {
      if (isVideoPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation(); // Prevent triggering video play/pause
    const video = document.getElementById(`video-${ad._id}`);
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  const handleVideoError = (error) => {
    setVideoError(true);
  };

  // Session media cache: preload and cache viewed media URLs
  const cacheMediaInSession = (url, type) => {
    if (!url) return;
    const cacheKey = `adMediaCache:${url}`;
    if (!sessionStorage.getItem(cacheKey)) {
      // Preload
      if (type === 'image') {
        const img = new window.Image();
        img.src = url;
      } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
      }
      sessionStorage.setItem(cacheKey, '1');
    }
  };

  const renderMedia = () => {
    // Handle video (can be string or array)
    const videoUrl = Array.isArray(ad.video) ? ad.video[0] : ad.video;
    // Determine media height based on context
    const mediaHeight = isInFeed ? "h-48" : "h-40"; // Larger height for feed ads
    if (videoUrl && !videoError) {
      cacheMediaInSession(videoUrl, 'video');
      return (
        <div className="relative group">
          <video
            id={`video-${ad._id}`}
            src={videoUrl}
            className={`w-full ${mediaHeight} object-cover rounded-lg`}
            muted={isMuted}
            playsInline
            loop
            autoPlay
            onError={handleVideoError}
            onClick={toggleVideo}
          />
          {/* Play/Pause overlay - center */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={toggleVideo}
          >
            <div className="bg-white rounded-full p-3">
              {isVideoPlaying ? (
                <FaPause className="text-gray-800 text-xl" />
              ) : (
                <FaPlay className="text-gray-800 text-xl ml-1" />
              )}
            </div>
          </div>
          {/* Mute/Unmute button - bottom right */}
          <div className="absolute bottom-2 right-2">
            <button
              onClick={toggleMute}
              className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all duration-200"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <FaVolumeMute className="text-sm" />
              ) : (
                <FaVolumeUp className="text-sm" />
              )}
            </button>
          </div>
        </div>
      );
    }
    // Handle image (can be string or array)
    const imageUrl = Array.isArray(ad.image) ? ad.image[0] : ad.image;
    if (imageUrl) {
      cacheMediaInSession(imageUrl, 'image');
      return (
        <div className="relative">
          <img
            src={imageUrl}
            alt={ad.title}
            className={`w-full ${mediaHeight} object-cover rounded-lg`}
            onError={(e) => {
              e.target.src = '/api/placeholder/400/200?text=Image+Not+Found';
            }}
          />
        </div>
      );
    }
    // No media
    return (
      <div className={`w-full ${mediaHeight} bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center`}>
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <FaEye className="mx-auto mb-2 text-2xl" />
          <p>No media</p>
        </div>
      </div>
    );
  };

  const renderTargeting = () => {
    if (ad.targetingType === 'global') {
      return (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <FaGlobe className="mr-1" />
          Global Targeting
        </div>
      );
    } else {
      const countryCount = ad.targetCountries?.length || 0;
      return (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <FaFlag className="mr-1" />
          {countryCount} {countryCount === 1 ? 'Country' : 'Countries'}
        </div>
      );
    }
  };

  return (
    <div className={`rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${isInFeed ? 'h-auto' : 'h-[520px]'} flex flex-col bg-white dark:bg-gray-800`}>
      {/* User Info Header */}
      {ad.userId && (
        <div className="flex items-center p-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 transition-opacity flex-shrink-0 overflow-hidden cursor-pointer">
            {ad.userId.profile?.profileImage ? (
              <img
                src={ad.userId.profile.profileImage}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-avatar.png';
                }}
              />
            ) : (
              <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {ad.userId.username || 'Unknown User'}
                </span>
                {(ad.userId.verified || ad.userId.profile?.verified) && <VerifiedBadge />}
              </div>
              {/* AD tag for feed ads - positioned on the right */}
              {isInFeed && (
                <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-bold rounded uppercase">
                  AD
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sponsored
            </div>
          </div>
        </div>
      )}

      {/* Media Section */}
      <div className={isInFeed ? "p-3 pb-0" : "p-4 pb-0"}>
        {renderMedia()}
      </div>

      {/* Content Section */}
      <div className={`${isInFeed ? "p-3" : "p-4"} flex-1 flex flex-col justify-between`}>
        {!isInFeed && showDetails ? (
          /* Detailed View - only shows back button and hidden details */
          <div className="space-y-2">
            {/* Back Button */}
            <button
              onClick={() => setShowDetails(false)}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-medium transition-colors mb-2"
            >
              <FaArrowLeft className="text-xs" />
              Back to Overview
            </button>

            {/* Targeting Information */}
            <div>
              <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">Targeting Information</h4>
              <div className="space-y-0.5">
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                  {ad.targetingType === 'global' ? (
                    <>
                      <FaGlobe className="mr-1 text-xs" />
                      Global Targeting
                    </>
                  ) : (
                    <>
                      <FaFlag className="mr-1 text-xs" />
                      {ad.targetCountries?.length || 0} {(ad.targetCountries?.length || 0) === 1 ? 'Country' : 'Countries'}
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Audience: {ad.targetUserbase?.label || 'Not specified'}
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div>
              <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">Campaign Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <FaCalendarAlt className="mr-1 text-xs" />
                  {ad.duration} day{ad.duration !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <FaDollarSign className="mr-1 text-xs" />
                  {formatCurrency(ad.pricing?.totalPriceUSD || 0)}
                </div>
              </div>
            </div>

            {/* Campaign Schedule */}
            {ad.schedule && (
              <div>
                <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">Schedule</h4>
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                  {ad.schedule.startDate && (
                    <div>Start: {formatDate(ad.schedule.startDate)}</div>
                  )}
                  {ad.schedule.endDate && (
                    <div>End: {formatDate(ad.schedule.endDate)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons for Details View */}
            <div className="flex gap-2 pt-1">
              {onEdit && ['draft', 'rejected'].includes(ad.status) && (
                <button
                  onClick={() => onEdit(ad)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && ['draft', 'pending_payment'].includes(ad.status) && (
                <button
                  onClick={() => onDelete(ad)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal View - default content */
          <div className={`flex flex-col h-full ${isInFeed ? '' : 'justify-between'}`}>
            <div>
              {/* Status Badge - Admin only */}
              {!isInFeed && (
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(ad.status)}`}>
                    {getStatusText(ad.status)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {ad.category}
                  </span>
                </div>
              )}

              {/* Title and Description */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                {ad.title}
              </h3>
              <p className={`text-gray-600 dark:text-gray-300 text-sm ${isInFeed ? 'mb-2' : 'mb-3'} line-clamp-2`}>
                {ad.description}
              </p>

              {/* Link URL - Admin only */}
              {!isInFeed && ad.linkUrl && (
                <a
                  href={ad.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-3 transition-colors"
                >
                  <FaExternalLinkAlt className="mr-1" />
                  Visit Link
                </a>
              )}

              {/* Performance Metrics (if analytics enabled) */}
              {showAnalytics && ad.performance && (
                <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-center text-sm">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {ad.performance.impressions?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Impressions</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {ad.performance.clicks?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Clicks</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {ad.performance.clickThroughRate?.toFixed(2) || 0}%
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">CTR</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-2 ${isInFeed ? 'mt-2' : 'mt-auto'}`}>
              {isInFeed ? (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (ad.linkUrl) {
                        window.open(ad.linkUrl, '_blank');
                      } else {
                        onClick && onClick();
                      }
                    }}
                    className="w-full bg-[#a99d6b] hover:bg-[#968B5C] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    {ad.linkUrl ? 'Visit Link' : (ad.buttonText || 'Learn More')}
                  </button>
                  {/* Ads interaction bar below the button, using backend data */}
                  <AdsInteractionBar
                    liked={liked}
                    likeAnimating={likeAnimating}
                    handleLike={handleLike}
                    normalizedLikes={normalizedLikes}
                    likesUsers={likesUsers}
                    setShowLikes={setShowLikes}
                    showLikes={showLikes}
                    setShowComments={setShowComments}
                    localPost={{
                      comments: ad.commentsList || [],
                      shares: shares,
                      _id: ad._id,
                      views: views
                    }}
                    loadingLikes={loadingLikes}
                    getPostLikes={null}
                    setLikesUsers={setLikesUsers}
                    currentUserId={ad.currentUserId}
                    currentUsername={ad.currentUsername}
                    currentUserVerified={ad.currentUserVerified}
                    onShare={handleShare}
                    views={views}
                  />
                </div>
              ) : (
                /* Management view - show admin buttons */
                <>
                  {onView && (
                    <button
                      onClick={() => setShowDetails(true)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                  )}
                  {onEdit && ['draft', 'rejected'].includes(ad.status) && (
                    <button
                      onClick={() => onEdit(ad)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && ['draft', 'pending_payment'].includes(ad.status) && (
                    <button
                      onClick={() => onDelete(ad)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdCard;
