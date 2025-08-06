import React, { useState, useEffect } from 'react';
import { FaUser, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import { followUser, getProfileSuggestions } from '../utils/api';
import { hashId } from '../utils/hash';

/**
 * Helper function to get profile image from various data structures
 * Same logic as used in posts and comments
 */
function getProfileImage(user) {
  if (!user) return '';
  // Deeply nested (modern)
  if (user.profile && typeof user.profile === 'object' && user.profile.profileImage) return user.profile.profileImage;
  // Flat (legacy)
  if (user.profileImage) return user.profileImage;
  // Some backends may return profile as a string (url)
  if (typeof user.profile === 'string') return user.profile;
  // Some backends may return profileImage as a property of the author object directly
  if (user.profileImage) return user.profileImage;
  return '';
}

/**
 * ProfileSuggestions component
 * Shows suggested profiles for users to follow
 * Appears after every 5 posts in the feed
 */
export default function ProfileSuggestions({ 
  currentUser, 
  onDismiss, 
  className = '' 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const [followingStates, setFollowingStates] = useState({});

  // Track previously shown suggestions across all instances
  const [shownSuggestions, setShownSuggestions] = useState(() => {
    // Get from localStorage or initialize empty set
    const stored = localStorage.getItem('profileSuggestions_shown');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Detect if we're on desktop for showing more suggestions
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load profile suggestions when component mounts
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!currentUser?._id) return;
      
      try {
        setLoading(true);
        const data = await getProfileSuggestions(currentUser._id);
        console.log('Profile suggestions data:', data); // Debug log
        console.log('First suggestion profile:', data.suggestions?.[0]?.profile); // Debug log
        
        // Debug each suggestion individually
        data.suggestions?.forEach((suggestion, index) => {
          console.log(`DEBUG Suggestion ${index + 1}:`, {
            username: suggestion.username,
            _id: suggestion._id,
            verified: suggestion.verified,
            reason: suggestion.reason,
            country: suggestion.country,
            countryFlag: suggestion.countryFlag,
            commonFollower: suggestion.commonFollower,
            profile: suggestion.profile,
            profileImageUrl: getProfileImage(suggestion)
          });
        });

        // Get current shown suggestions from localStorage
        const stored = localStorage.getItem('profileSuggestions_shown');
        const currentShownSuggestions = stored ? new Set(JSON.parse(stored)) : new Set();

        // Filter out previously shown suggestions and users already followed
        const currentUserFollowing = currentUser.followingRaw || [];
        let filteredSuggestions = (data.suggestions || []).filter(suggestion => {
          // Don't show if already shown before
          if (currentShownSuggestions.has(suggestion._id)) return false;
          // Don't show if user is already following them
          if (currentUserFollowing.includes(suggestion._id)) return false;
          return true;
        });

        // Sort suggestions to prioritize users with profile images
        filteredSuggestions.sort((a, b) => {
          const aHasImage = !!getProfileImage(a);
          const bHasImage = !!getProfileImage(b);
          
          // Users with profile images come first
          if (aHasImage && !bHasImage) return -1;
          if (!aHasImage && bHasImage) return 1;
          
          // Among users with images, prioritize verified users
          if (aHasImage && bHasImage) {
            if (a.verified && !b.verified) return -1;
            if (!a.verified && b.verified) return 1;
          }
          
          // Among users without images, prioritize verified users
          if (!aHasImage && !bHasImage) {
            if (a.verified && !b.verified) return -1;
            if (!a.verified && b.verified) return 1;
          }
          
          return 0; // Keep original order for equal priority
        });

        // If we don't have enough new suggestions, reset the shown list and try again
        const maxSuggestions = isDesktop ? 8 : 5;
        if (filteredSuggestions.length < Math.min(maxSuggestions, 3)) {
          console.log('Not enough new suggestions, resetting shown list');
          localStorage.removeItem('profileSuggestions_shown');
          // Re-filter without the shown suggestions constraint
          filteredSuggestions = (data.suggestions || []).filter(suggestion => {
            return !currentUserFollowing.includes(suggestion._id);
          });
          
          // Re-sort the reset suggestions with the same priority logic
          filteredSuggestions.sort((a, b) => {
            const aHasImage = !!getProfileImage(a);
            const bHasImage = !!getProfileImage(b);
            
            if (aHasImage && !bHasImage) return -1;
            if (!aHasImage && bHasImage) return 1;
            
            if (aHasImage && bHasImage) {
              if (a.verified && !b.verified) return -1;
              if (!a.verified && b.verified) return 1;
            }
            
            if (!aHasImage && !bHasImage) {
              if (a.verified && !b.verified) return -1;
              if (!a.verified && b.verified) return 1;
            }
            
            return 0;
          });
          
          // Update the local state
          setShownSuggestions(new Set());
        }

        // Debug log the sorted suggestions
        console.log('Sorted suggestions (profile image priority):');
        filteredSuggestions.slice(0, maxSuggestions).forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion.username} - Has Image: ${!!getProfileImage(suggestion)} - Verified: ${!!suggestion.verified}`);
        });

        // Mark these suggestions as shown
        const newShownIds = filteredSuggestions.slice(0, maxSuggestions).map(s => s._id);
        const updatedShownSuggestions = new Set([...currentShownSuggestions, ...newShownIds]);
        setShownSuggestions(updatedShownSuggestions);
        localStorage.setItem('profileSuggestions_shown', JSON.stringify([...updatedShownSuggestions]));
        
        setSuggestions(filteredSuggestions);
      } catch (error) {
        console.error('Error loading profile suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [currentUser?._id, isDesktop]); // Removed shownSuggestions from dependencies

  // Handle dismissing a specific suggestion
  const handleDismissSuggestion = (suggestionId) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  // Handle following a suggested user
  const handleFollow = async (userId) => {
    try {
      setFollowingStates(prev => ({ ...prev, [userId]: true }));
      await followUser(userId);
      
      // Remove the followed user from suggestions
      setSuggestions(prev => prev.filter(s => s._id !== userId));
      
      // Also add to current user's following list to prevent future suggestions
      if (currentUser.followingRaw) {
        currentUser.followingRaw.push(userId);
      }
    } catch (error) {
      console.error('Error following user:', error);
      setFollowingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s._id));

  // Don't render if no suggestions or still loading
  if (loading) {
    const maxSuggestions = isDesktop ? 8 : 5;
    return (
      <div className={`w-full max-w-full overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="flex gap-3">
              {Array.from({ length: Math.min(maxSuggestions, 3) }, (_, i) => (
                <div key={i} className="bg-slate-100 dark:bg-gray-900 rounded p-4 flex flex-col items-center min-w-[150px]">
                  <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Suggested for you
          </h3>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss suggestions"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>

        {/* Horizontal scrollable suggestions */}
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {visibleSuggestions.slice(0, isDesktop ? 8 : 5).map((suggestion) => (
            <SuggestionCard
              key={suggestion._id}
              suggestion={suggestion}
              currentUser={currentUser}
              onDismiss={() => handleDismissSuggestion(suggestion._id)}
              onFollow={() => handleFollow(suggestion._id)}
              isFollowing={followingStates[suggestion._id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual suggestion card component
 */
function SuggestionCard({ 
  suggestion, 
  currentUser, 
  onDismiss, 
  onFollow, 
  isFollowing 
}) {
  const [loading, setLoading] = useState(false);

  const handleFollowClick = async () => {
    setLoading(true);
    try {
      await onFollow();
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get profile image using the same logic as posts
  const profileImageUrl = getProfileImage(suggestion);
  
  // Debug log for each suggestion card render
  console.log(`DEBUG SuggestionCard render for ${suggestion.username}:`, {
    profileImageUrl,
    hasProfile: !!suggestion.profile,
    profileObject: suggestion.profile,
    reason: suggestion.reason,
    commonFollower: suggestion.commonFollower
  });

  return (
    <div className="bg-slate-100 dark:bg-gray-900 rounded p-4 flex flex-col items-center min-w-[150px] max-w-[150px] relative">
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-5 h-5 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-xs transition-colors z-10"
        aria-label="Dismiss suggestion"
      >
        <FaTimes size={10} />
      </button>

      {/* Profile picture */}
      <Link
        to={`/dashboard/community/user/${encodeURIComponent(suggestion.username)}`}
        className="block mb-3"
      >
        <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={`${suggestion.username}'s profile`}
              className="w-full h-full object-cover"
              onLoad={() => console.log(`✅ Profile image loaded successfully for ${suggestion.username}:`, profileImageUrl)}
              onError={e => {
                console.log(`❌ Profile image failed to load for ${suggestion.username}:`, profileImageUrl);
                console.log(`❌ Error details:`, e);
                e.target.style.display = 'none';
                // Show the default icon instead
                e.target.parentElement.innerHTML = '<svg class="text-gray-500 dark:text-gray-400 text-xl w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
              }}
            />
          ) : (
            <>
              {console.log(`ℹ️ No profile image URL found for ${suggestion.username}`)}
              {console.log(`ℹ️ Full suggestion object:`, suggestion)}
              <FaUser className="text-gray-500 dark:text-gray-400 text-xl" />
            </>
          )}
        </div>
      </Link>

      {/* Username */}
      <Link
        to={`/dashboard/community/user/${encodeURIComponent(suggestion.username)}`}
        className="block mb-1"
      >
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[130px] text-center">
            {suggestion.username}
          </span>
          {suggestion.verified && <VerifiedBadge className="ml-1" />}
        </div>
      </Link>

      {/* Common connection info */}
      {suggestion.commonFollower ? (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3 max-w-[130px] flex items-center justify-center gap-1" style={{ fontSize: '10px' }}>
          {/* Common follower profile image */}
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {getProfileImage(suggestion.commonFollower) ? (
              <img
                src={getProfileImage(suggestion.commonFollower)}
                alt={`${suggestion.commonFollower.username}'s profile`}
                className="w-full h-full object-cover"
                onError={e => {
                  console.log(`❌ Common follower image failed to load for ${suggestion.commonFollower.username}:`, getProfileImage(suggestion.commonFollower));
                  e.target.style.display = 'none';
                  // Show the default icon instead
                  e.target.parentElement.innerHTML = '<svg class="text-gray-500 dark:text-gray-400 w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                }}
              />
            ) : (
              <>
                {console.log(`ℹ️ No profile image URL found for common follower ${suggestion.commonFollower.username}`)}
                {console.log(`ℹ️ Common follower object:`, suggestion.commonFollower)}
                <FaUser className="text-gray-500 dark:text-gray-400 w-2 h-2" />
              </>
            )}
          </div>
          <span className="truncate">
            Followed by {suggestion.commonFollower.username}
          </span>
          {suggestion.commonFollower.verified && (
            <div className="flex-shrink-0" style={{ transform: 'scale(0.6)', transformOrigin: 'center' }}>
              <VerifiedBadge />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3" style={{ fontSize: '10px' }}>
          Suggested for you
        </p>
      )}

      {/* Follow button */}
      <button
        onClick={handleFollowClick}
        disabled={loading || isFollowing}
        className={`px-4 py-2 rounded-md text-xs font-medium transition-colors w-full ${
          isFollowing || loading
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {loading ? 'Following...' : isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
