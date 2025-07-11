import { useState, useCallback } from 'react';
import { likeReply, editReply, deleteReply } from '../utils/api';

export const useReplies = (localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified, replyMenuRefs) => {
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyPages, setReplyPages] = useState({});
  const [loadingMoreReplies, setLoadingMoreReplies] = useState({});
  const [editingReply, setEditingReply] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [loadingReplyLike, setLoadingReplyLike] = useState({});
  const [showReplyMenus, setShowReplyMenus] = useState({});
  const [loadingReply, setLoadingReply] = useState({});
  
  const repliesPerComment = 3;

  // If replyMenuRefs is not provided, create a default one (for backward compatibility)
  if (!replyMenuRefs) {
    replyMenuRefs = { current: {} };
  }
  if (!replyMenuRefs.current) {
    replyMenuRefs.current = {};
  }

  // Enhanced reply display logic with progressive hiding
  const getDisplayedReplies = useCallback((comment) => {
    if (!comment.replies) return [];
    
    const currentReplyPage = replyPages[comment._id] || 1;
    const isExpanded = expandedReplies[comment._id];
    
    if (!isExpanded) {
      // Show only first few replies when collapsed
      return comment.replies.slice(0, repliesPerComment);
    }
    
    // When expanded, show only the current "page" of replies, not all previous ones
    const startIndex = (currentReplyPage - 1) * repliesPerComment;
    const endIndex = currentReplyPage * repliesPerComment;
    
    return comment.replies.slice(startIndex, endIndex);
  }, [replyPages, expandedReplies]);

  // Enhanced reply visibility management with progressive disclosure
  const getReplyDisplayInfo = useCallback((comment) => {
    const totalReplies = comment.replies?.length || 0;
    const currentReplyPage = replyPages[comment._id] || 1;
    const isExpanded = expandedReplies[comment._id];
    
    let displayedCount;
    if (!isExpanded) {
      displayedCount = Math.min(totalReplies, repliesPerComment);
    } else {
      // When expanded, we're only showing the current page
      const startIndex = (currentReplyPage - 1) * repliesPerComment;
      const endIndex = currentReplyPage * repliesPerComment;
      displayedCount = Math.min(totalReplies - startIndex, repliesPerComment);
    }
    
    const hasMoreReplies = isExpanded 
      ? (currentReplyPage * repliesPerComment) < totalReplies
      : totalReplies > repliesPerComment;
      
    const hasPreviousReplies = isExpanded && currentReplyPage > 1;
    
    return {
      totalReplies,
      displayedCount,
      currentPage: currentReplyPage,
      hasMoreReplies,
      hasPreviousReplies,
      isExpanded,
      showLoadMore: isExpanded && hasMoreReplies,
      showLoadPrevious: isExpanded && hasPreviousReplies,
      startIndex: isExpanded ? (currentReplyPage - 1) * repliesPerComment : 0,
      endIndex: isExpanded ? currentReplyPage * repliesPerComment : repliesPerComment
    };
  }, [replyPages, expandedReplies]);

  // Toggle reply expansion for a specific comment
  const toggleReplyExpansion = useCallback((commentId) => {
    const isCurrentlyExpanded = expandedReplies[commentId];
    
    if (isCurrentlyExpanded) {
      // Collapse replies - hide them
      setExpandedReplies(prev => ({
        ...prev,
        [commentId]: false
      }));
      setReplyPages(prev => ({
        ...prev,
        [commentId]: 1 // Reset to first page when collapsing
      }));
    } else {
      // Expand replies - show the first page
      setExpandedReplies(prev => ({
        ...prev,
        [commentId]: true
      }));
      setReplyPages(prev => ({
        ...prev,
        [commentId]: 1 // Start from first page
      }));
    }
  }, [expandedReplies]);

  // Load more replies for a specific comment (progressive)
  const loadMoreReplies = useCallback(async (commentId) => {
    if (loadingMoreReplies[commentId]) return;
    
    setLoadingMoreReplies(prev => ({ ...prev, [commentId]: true }));
    
    try {
      setReplyPages(prev => ({
        ...prev,
        [commentId]: (prev[commentId] || 1) + 1
      }));
    } finally {
      setLoadingMoreReplies(prev => ({ ...prev, [commentId]: false }));
    }
  }, [loadingMoreReplies]);

  // Load previous replies for a specific comment
  const loadPreviousReplies = useCallback(async (commentId) => {
    if (loadingMoreReplies[commentId]) return;
    
    setLoadingMoreReplies(prev => ({ ...prev, [commentId]: true }));
    
    try {
      setReplyPages(prev => ({
        ...prev,
        [commentId]: Math.max(1, (prev[commentId] || 1) - 1)
      }));
    } finally {
      setLoadingMoreReplies(prev => ({ ...prev, [commentId]: false }));
    }
  }, [loadingMoreReplies]);

  // Reset to show all replies from the beginning
  const showAllReplies = useCallback((commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: true
    }));
    setReplyPages(prev => ({
      ...prev,
      [commentId]: 1
    }));
  }, []);

  // Handle reply submission
  const handleReply = useCallback(async (postId, replyText, commentId, onReply, onComment, setError) => {
    setLoadingReply(prev => ({ ...prev, [commentId]: true }));
    setError?.(null);

    const tempReply = {
      _id: `temp-reply-${Date.now()}`,
      content: replyText,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified },
      createdAt: new Date().toISOString(),
      likes: [],
    };

    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c =>
        c._id === commentId
          ? { ...c, replies: [tempReply, ...(c.replies || [])] }
          : c
      ),
    }));

    try {
      if (onReply) {
        const updatedPost = await onReply(postId, replyText, commentId);
        if (updatedPost) setLocalPost(updatedPost);
      }
    } catch (e) {
      if (e.message && e.message.includes("Network Error")) {
        setError?.("Network error: Failed to post reply");
      }
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        } catch (fetchError) {}
      }
    } finally {
      setLoadingReply(prev => ({ ...prev, [commentId]: false }));
    }
  }, [currentUserId, currentUsername, currentUserVerified, setLocalPost]);

  // Handle edit reply
  const handleEditReply = useCallback((commentId, replyId, content) => {
    setEditingReply(`${commentId}-${replyId}`);
    setEditReplyContent(content);
  }, []);

  // Handle save reply edit
  const handleSaveReplyEdit = useCallback(async (commentId, replyId) => {
    if (!editReplyContent.trim()) return;
    
    try {
      const response = await editReply(localPost._id, commentId, replyId, editReplyContent);
      
      if (response && !response.error && response._id) {
        setLocalPost(response);
        setEditingReply(null);
        setEditReplyContent('');
      } else {
        console.error('Failed to edit reply:', response?.error || 'Unknown error');
        alert('Failed to edit reply. Please try again.');
      }
    } catch (error) {
      console.error('Failed to edit reply:', error);
      alert('Failed to edit reply. Please try again.');
    }
  }, [localPost._id, editReplyContent, setLocalPost]);

  // Handle delete reply
  const handleDeleteReply = useCallback(async (commentId, replyId) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        const response = await deleteReply(localPost._id, commentId, replyId);
        
        if (response && !response.error && response._id) {
          setLocalPost(response);
        } else {
          console.error('Failed to delete reply:', response?.error || 'Unknown error');
          alert('Failed to delete reply. Please try again.');
        }
      } catch (error) {
        console.error('Failed to delete reply:', error);
        alert('Failed to delete reply. Please try again.');
      }
    }
  }, [localPost._id, setLocalPost]);

  // Handle cancel reply edit
  const handleCancelReplyEdit = useCallback(() => {
    setEditingReply(null);
    setEditReplyContent('');
  }, []);

  // Handle like reply with optimistic updates
  const handleLikeReply = useCallback(async (commentId, replyId) => {
    console.log('Reply like clicked:', { commentId, replyId, currentUserId });
    
    // Optimistically update the UI first
    let wasLiked = false;
    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c => {
        if (c._id === commentId) {
          return {
            ...c,
            replies: c.replies.map(r => {
              if (r._id === replyId) {
                const currentLikes = Array.isArray(r.likes) ? r.likes : [];
                const userLiked = currentLikes.map(String).includes(String(currentUserId));
                wasLiked = userLiked;
                console.log('Reply like state change:', { userLiked, currentLikes, currentUserId });
                return {
                  ...r,
                  likes: userLiked 
                    ? currentLikes.filter(id => String(id) !== String(currentUserId))
                    : [...currentLikes, currentUserId]
                };
              }
              return r;
            })
          };
        }
        return c;
      })
    }));
    
    setLoadingReplyLike(prev => ({ ...prev, [replyId]: true }));
    
    try {
      await likeReply(localPost._id, commentId, replyId);
      console.log('Reply like API success');
    } catch (error) {
      console.error('Failed to like reply, reverting state:', error);
      // Revert the optimistic update on error
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c._id === commentId) {
            return {
              ...c,
              replies: c.replies.map(r => {
                if (r._id === replyId) {
                  const currentLikes = Array.isArray(r.likes) ? r.likes : [];
                  // Revert the change - if we were toggling to liked, now toggle back to not liked
                  return {
                    ...r,
                    likes: wasLiked 
                      ? [...currentLikes, currentUserId] // Add back the user ID
                      : currentLikes.filter(id => String(id) !== String(currentUserId)) // Remove the user ID
                  };
                }
                return r;
              })
            };
          }
          return c;
        })
      }));
    } finally {
      setLoadingReplyLike(prev => ({ ...prev, [replyId]: false }));
    }
  }, [localPost._id, currentUserId, setLocalPost]);

  return {
    // State
    expandedReplies,
    replyPages,
    loadingMoreReplies,
    editingReply,
    editReplyContent,
    loadingReplyLike,
    showReplyMenus,
    loadingReply,
    repliesPerComment,
    
    // Setters
    setExpandedReplies,
    setReplyPages,
    setEditReplyContent,
    setShowReplyMenus,
    setLoadingReply,
    
    // Functions
    getDisplayedReplies,
    getReplyDisplayInfo,
    toggleReplyExpansion,
    loadMoreReplies,
    loadPreviousReplies,
    showAllReplies,
    handleReply,
    handleEditReply,
    handleSaveReplyEdit,
    handleDeleteReply,
    handleCancelReplyEdit,
    handleLikeReply,

    // Refs
    replyMenuRefs, // <-- Return the refs for use in components
  };
};