import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaSearch, FaUser, FaFilter, FaTimes, FaGlobe, FaUserFriends, FaCrown, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../../../components/VerifiedBadge';
import { followUser, unfollowUser, browseUsers } from '../../../utils/api';

/**
 * Helper function to get profile image from various data structures
 */
function getProfileImage(user) {
  if (!user) return '';
  if (user.profile && typeof user.profile === 'object' && user.profile.profileImage) return user.profile.profileImage;
  if (user.profileImage) return user.profileImage;
  if (typeof user.profile === 'string') return user.profile;
  return '';
}

/**
 * Individual user card component
 */
function UserCard({ user, currentUser, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already being followed
  useEffect(() => {
    if (currentUser?.followingRaw) {
      setIsFollowing(currentUser.followingRaw.includes(user._id));
    } else if (user.isFollowed !== undefined) {
      // Use the isFollowed flag from the API if available (for search results)
      setIsFollowing(user.isFollowed);
    }
  }, [currentUser, user._id, user.isFollowed]);

  const handleFollowToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user._id);
        setIsFollowing(false);
      } else {
        await followUser(user._id);
        setIsFollowing(true);
      }
      
      // Notify parent component of the change
      if (onFollowChange) {
        onFollowChange(user._id, !isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const profileImageUrl = getProfileImage(user);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      {/* User Info Section */}
      <div className="flex items-start space-x-3 mb-3">
        {/* Profile Picture */}
        <Link
          to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
          className="flex-shrink-0"
        >
          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={`${user.username}'s profile`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<svg class="text-gray-500 dark:text-gray-400 w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                }}
              />
            ) : (
              <FaUser className="text-gray-500 dark:text-gray-400 text-lg" />
            )}
          </div>
        </Link>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/dashboard/community/user/${encodeURIComponent(user.username)}`}
            className="block"
          >
            <div className="flex items-center space-x-1 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.username}
              </h3>
              {user.verified && <VerifiedBadge className="flex-shrink-0" />}
            </div>
          </Link>

          {/* Suggestion Reason */}
          {user.reason && user.reason !== 'search_result' && (
            <div className="mb-2">
              {user.reason === 'mutual_following' && user.commonFollower && (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(() => {
                      const commonFollowerImageUrl = getProfileImage(user.commonFollower);
                      return commonFollowerImageUrl ? (
                        <img
                          src={commonFollowerImageUrl}
                          alt={`${user.commonFollower.username}'s profile`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<svg class="text-gray-500 dark:text-gray-400 w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                          }}
                        />
                      ) : (
                        <FaUser className="text-gray-500 dark:text-gray-400 w-2 h-2" />
                      );
                    })()}
                  </div>
                  <span>Followed by {user.commonFollower.username}</span>
                </div>
              )}
              {user.reason === 'same_country' && (
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                  <FaGlobe className="w-3 h-3 flex-shrink-0" />
                  <span>From your region</span>
                </div>
              )}
              {user.reason === 'most_followers' && (
                <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center space-x-1">
                  <FaCrown className="w-3 h-3 flex-shrink-0" />
                  <span>Popular user</span>
                </div>
              )}
              {user.reason === 'recent' && (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                  <FaUser className="w-3 h-3 flex-shrink-0" />
                  <span>New user</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Follow Button */}
      <button
        onClick={handleFollowToggle}
        disabled={isLoading}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isFollowing
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

/**
 * Filter selector component
 */
function FilterSelector({ activeFilter, onFilterChange }) {
  const filters = [
    { key: 'recommended', label: 'Recommended', icon: FaUserFriends },
    { key: 'most_followers', label: 'Popular', icon: FaCrown },
    { key: 'same_region', label: 'Your Region', icon: FaGlobe },
    { key: 'recent', label: 'New Users', icon: FaUser },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeFilter === key
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Main Bulk Community Profiles component
 */
export default function BulkCommunityProfiles({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('recommended');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Load users function
  const loadUsers = useCallback(async (resetPage = false, newSearch = '', newFilter = '') => {
    const currentPage = resetPage ? 1 : page;
    const search = newSearch !== undefined ? newSearch : searchQuery;
    const filter = newFilter || activeFilter;

    try {
      if (resetPage) {
        setLoading(true);
        setUsers([]);
      } else {
        setLoadingMore(true);
      }

      const response = await browseUsers({
        search,
        filter,
        page: currentPage,
        limit: 20
      });

      if (resetPage) {
        setUsers(response.users || []);
        setPage(2);
      } else {
        setUsers(prev => [...prev, ...(response.users || [])]);
        setPage(prev => prev + 1);
      }

      setHasMore(response.hasMore || false);
      setTotalUsers(response.total || 0);

    } catch (error) {
      console.error('Error loading users:', error);
      if (resetPage) {
        setUsers([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, searchQuery, activeFilter]);

  // Initial load
  useEffect(() => {
    loadUsers(true);
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadUsers(true, searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    loadUsers(true, searchQuery, newFilter);
  };

  // Handle follow change to update local state
  const handleFollowChange = (userId, isNowFollowing) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: isNowFollowing }
          : user
      )
    );
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loadingMore || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;

      if (scrollBottom < 500) {
        loadUsers(false);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loadUsers, loadingMore, hasMore]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Title and Back Button */}
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/dashboard/community"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <FaUserFriends className="w-5 h-5 text-blue-500 dark:text-gray-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Discover People
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalUsers > 0 ? `${totalUsers} users found` : 'Find new people to follow'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Selector */}
          <FilterSelector 
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Users Grid */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-6xl mx-auto px-2 py-4">
          {loading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FaUser className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery ? 'No users found' : 'No users available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                {searchQuery 
                  ? 'Try adjusting your search or filters to find more people.'
                  : 'Check back later for new users to discover.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Users Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {users.map((user) => (
                  <UserCard
                    key={user._id}
                    user={user}
                    currentUser={currentUser}
                    onFollowChange={handleFollowChange}
                  />
                ))}
              </div>

              {/* Load More Indicator */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading more users...</span>
                  </div>
                </div>
              )}

              {/* End of Results */}
              {!hasMore && users.length > 0 && (
                <div className="flex justify-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    You've seen all available users
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
