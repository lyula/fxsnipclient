import React, { useState, useMemo } from 'react';
import { hashId } from '../utils/hash';

/**
 * FollowButton component for posts
 * Renders a follow button if the viewer does not follow the author.
 * Disappears immediately after following.
 * Usage: <FollowButton authorId={...} followersHashed={...} />
 */
export default function FollowButton({ authorId, followersHashed, buttonClass = '', style = {}, onFollow }) {
  const currentUserId = localStorage.getItem('userId') || (window.user && window.user._id);
  const isSelf = String(currentUserId) === String(authorId);
  const [justFollowed, setJustFollowed] = useState(false);
  const hashedCurrentUserId = hashId(String(currentUserId));
  const isFollowing = useMemo(() => Array.isArray(followersHashed) && followersHashed.includes(hashedCurrentUserId), [followersHashed, hashedCurrentUserId]);

  if (isSelf || isFollowing || justFollowed) return null;

  const handleFollow = async (e) => {
    e.stopPropagation();
    const { followUser } = await import("../utils/api");
    await followUser(authorId);
    setJustFollowed(true);
    if (onFollow) onFollow();
  };

  return (
    <button
      className={`ml-2 px-3 py-1 rounded-full font-semibold transition text-xs ${buttonClass}`}
      style={{ backgroundColor: '#a99d6b', color: 'white', ...style }}
      onClick={handleFollow}
    >
      Follow
    </button>
  );
}
