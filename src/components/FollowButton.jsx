import React, { useState, useMemo, useEffect } from 'react';
import { hashId } from '../utils/hash';
import { useDashboard } from '../context/dashboard';

/**
 * FollowButton component for posts
 * Renders a follow button if the viewer does not follow the author.
 * Disappears immediately after following.
 * Usage: <FollowButton authorId={...} followersHashed={...} />
 */
export default function FollowButton({ authorId, followersHashed, buttonClass = '', style = {}, onFollow }) {
  const currentUserId = localStorage.getItem('userId') || (window.user && window.user._id);
  const isSelf = String(currentUserId) === String(authorId);
  const [isLoading, setIsLoading] = useState(false);
  const hashedCurrentUserId = hashId(String(currentUserId));
  const isFollowing = useMemo(() => Array.isArray(followersHashed) && followersHashed.includes(hashedCurrentUserId), [followersHashed, hashedCurrentUserId]);

  // Use global follow management from dashboard context
  const { followUserGlobally, isUserFollowed, addFollowedUser } = useDashboard();
  
  // Check if user is followed globally (this will handle all posts by the same author)
  const isFollowedGlobally = isUserFollowed ? isUserFollowed(authorId) : false;

  // If the user is following according to the post data but not in global state, update global state
  useEffect(() => {
    if (isFollowing && !isFollowedGlobally && authorId && addFollowedUser) {
      addFollowedUser(authorId);
    }
  }, [isFollowing, isFollowedGlobally, authorId, addFollowedUser]);

  // Only log issues when button would show but user already follows the author
  const shouldShow = !(!currentUserId || !authorId || isSelf || isFollowing || isFollowedGlobally);
  useEffect(() => {
    // Only log if there's a potential issue: button shows but user actually follows this author
    if (shouldShow && (isFollowing || isFollowedGlobally)) {
      console.warn(`[FollowButton] Issue detected for ${authorId}: Button showing but user follows author`, {
        isFollowing,
        isFollowedGlobally,
        hashedCurrentUserId,
        followersHashed: Array.isArray(followersHashed) ? followersHashed : 'not-array'
      });
    }
    
    // Also log when button shows for authors you claim to follow
    if (shouldShow && authorId) {
      console.log(`[FollowButton] Button showing for ${authorId}:`, {
        isFollowing,
        isFollowedGlobally, 
        followersHashedLength: Array.isArray(followersHashed) ? followersHashed.length : 'not-array',
        hashedCurrentUserId,
        followersHashedIncludes: Array.isArray(followersHashed) ? followersHashed.includes(hashedCurrentUserId) : false
      });
    }
  }, [shouldShow, isFollowing, isFollowedGlobally, authorId, hashedCurrentUserId, followersHashed]);

  // Don't show button if user is self, already following, or followed globally
  if (!currentUserId || !authorId || isSelf || isFollowing || isFollowedGlobally) return null;

  const handleFollow = async (e) => {
    e.stopPropagation();
    setIsLoading(true);
    
    try {
      const success = await followUserGlobally(authorId);
      if (success && onFollow) {
        onFollow();
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`ml-2 px-3 py-1 rounded-md font-semibold transition text-xs bg-transparent border border-white text-white hover:bg-white hover:text-gray-900 ${buttonClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleFollow}
      disabled={isLoading}
    >
      {isLoading ? 'Following...' : 'Follow'}
    </button>
  );
}
