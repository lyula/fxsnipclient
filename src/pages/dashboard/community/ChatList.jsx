import React, { useState, useEffect } from "react";
import ReactMemo from "react";
import ChatPostOrig from "./ChatPost";
import AdCardOrig from "../../../components/AdCard";
import ProfileSuggestionsOrig from "../../../components/ProfileSuggestions";
// Memoize heavy components for better performance
const ChatPost = React.memo(ChatPostOrig);
const AdCard = React.memo(AdCardOrig);
const ProfileSuggestions = React.memo(ProfileSuggestionsOrig);
import { API_BASE_URL } from "../../../utils/constants";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete,
  postRefs, currentUserId, currentUsername, currentUserVerified,
  currentUser, // Add currentUser prop for profile suggestions
  getCurrentCommunityState // Add state preservation function
}) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [suggestionIntervals, setSuggestionIntervals] = useState(() => {
    // Get stored intervals or initialize with first suggestion at 5
    const stored = localStorage.getItem('profileSuggestion_intervals');
    return stored ? JSON.parse(stored) : [5]; // First suggestion always at index 4 (5th post)
  });

  // Generate next random interval (5, 7, or 10 posts)
  const generateNextInterval = () => {
    const intervals = [5, 7, 10];
    return intervals[Math.floor(Math.random() * intervals.length)];
  };

  // Update suggestion intervals when posts change
  useEffect(() => {
    const postCount = posts.filter(post => post && post._id).length;
    const lastInterval = suggestionIntervals[suggestionIntervals.length - 1] || 0;
    
    // If we need more intervals for the current post count
    if (postCount > lastInterval) {
      let newIntervals = [...suggestionIntervals];
      let currentInterval = lastInterval;
      
      // Generate intervals until we cover all posts
      while (currentInterval < postCount) {
        const nextRandomInterval = generateNextInterval();
        currentInterval += nextRandomInterval;
        if (currentInterval <= postCount) {
          newIntervals.push(currentInterval);
        }
      }
      
      if (newIntervals.length > suggestionIntervals.length) {
        setSuggestionIntervals(newIntervals);
        localStorage.setItem('profileSuggestion_intervals', JSON.stringify(newIntervals));
      }
    }
  }, [posts.length, suggestionIntervals]);

  // Log the API base URL for debugging
  useEffect(() => {
    console.log('API_BASE_URL used for ads:', API_BASE_URL);
  }, []);

  // Fetch active ads from the database
  const fetchAds = async () => {
    if (adsLoading) return;
    
    try {
      setAdsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ads/active`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      } else {
        console.error('Failed to fetch ads:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setAdsLoading(false);
    }
  };

  // Fetch ads when component mounts
  useEffect(() => {
    fetchAds();
  }, []);

  // Handle ad impression tracking
  const handleAdImpression = async (adId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/posts/ads/${adId}/impression`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error tracking ad impression:', error);
    }
  };

  // Handle ad click tracking
  const handleAdClick = async (ad) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/posts/ads/${ad._id}/click`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open ad target URL in new tab
        if (data.targetUrl || ad.targetUrl) {
          window.open(data.targetUrl || ad.targetUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }
  };

  // Handle dismissing suggestion sections
  const handleDismissSuggestion = (index) => {
    setDismissedSuggestions(prev => new Set([...prev, index]));
  };

  // Memoize renderItems for better performance
  const renderItems = React.useMemo(() => {
    const items = [];
    const filteredPosts = posts.filter(post => post && post._id);
    filteredPosts.forEach((item, idx) => {
      const isAd = item.type === 'ad' || item._isAd;
      items.push(
        <React.Fragment key={item._id}>
          <div
            ref={el => postRefs && postRefs.current && (postRefs.current[item._id] = el)}
            className="w-full py-2 overflow-hidden"
          >
            {isAd ? (
              <div className="relative">
                {/* Ad label */}
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-4 font-medium">
                  Sponsored
                </div>
                <AdCard
                  ad={item}
                  onView={() => handleAdImpression(item._id)}
                  onClick={() => handleAdClick(item)}
                  showAnalytics={false}
                  isInFeed={true}
                />
              </div>
            ) : (
              <ChatPost
                post={item}
                onReply={onReply}
                onComment={onComment}
                onLike={onLike}
                onView={onView}
                onDelete={onDelete}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                currentUserVerified={currentUserVerified}
              />
            )}
          </div>
          {idx !== filteredPosts.length - 1 && (
            <div className="">
              <hr className="border-t border-gray-100 dark:border-gray-700/50" />
            </div>
          )}
        </React.Fragment>
      );

      // Add profile suggestions at randomized intervals
      const shouldShowSuggestion = suggestionIntervals.includes(idx + 1);
      if (shouldShowSuggestion && currentUser && !dismissedSuggestions.has(idx)) {
        items.push(
          <React.Fragment key={`suggestions-${idx}`}>
            <div className="w-full overflow-hidden">
              <ProfileSuggestions
                currentUser={currentUser}
                onDismiss={() => handleDismissSuggestion(idx)}
                className="my-2"
                getCurrentCommunityState={getCurrentCommunityState}
              />
            </div>
            {idx !== filteredPosts.length - 1 && (
              <div className="">
                <hr className="border-t border-gray-100 dark:border-gray-700/50" />
              </div>
            )}
          </React.Fragment>
        );
      }

      // Add sponsored ads at regular intervals (every 4th post after the 3rd post)
      const shouldShowAd = (idx + 1) % 4 === 0 && idx > 2 && ads.length > 0;
      if (shouldShowAd) {
        const adInsertionCount = Math.floor((idx + 1 - 3) / 4);
        const adIndex = adInsertionCount % ads.length;
        const selectedAd = ads[adIndex];
        if (selectedAd) {
          items.push(
            <React.Fragment key={`ad-${selectedAd._id}-${idx}`}>
              <div className="w-full">
                <AdCard
                  ad={selectedAd}
                  onView={() => handleAdImpression(selectedAd._id)}
                  onClick={() => handleAdClick(selectedAd)}
                  showAnalytics={false}
                  isInFeed={true}
                />
              </div>
              {idx !== filteredPosts.length - 1 && (
                <div className="">
                  <hr className="border-t border-gray-100 dark:border-gray-700/50" />
                </div>
              )}
            </React.Fragment>
          );
        }
      }
    });
    return items;
  }, [posts, ads, suggestionIntervals, dismissedSuggestions, currentUser, getCurrentCommunityState, postRefs, onReply, onComment, onLike, onView, onDelete, currentUserId, currentUsername, currentUserVerified]);

  return (
    <div className="w-full mx-auto overflow-hidden" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
      <div
        className="bg-white dark:bg-gray-800 mx-0 rounded-b-xl shadow-sm border-l border-r border-b border-gray-200/50 dark:border-gray-700/50"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* For very large lists, consider using react-window for virtualization */}
        {renderItems}
      </div>
    </div>
  );
}
