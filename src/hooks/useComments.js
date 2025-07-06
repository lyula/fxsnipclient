import { useState, useCallback } from 'react';
import { addCommentToPost, likeComment, editComment, deleteComment } from '../utils/api';

export const useComments = (localPost, setLocalPost, currentUserId, currentUsername, currentUserVerified) => {
  const [currentCommentPage, setCurrentCommentPage] = useState(0); // 0-based page index
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [loadingCommentLike, setLoadingCommentLike] = useState({});
  const [showCommentMenus, setShowCommentMenus] = useState({});
  
  const commentsPerPage = 10;

  // Simple sliding window for comments - only show 10 at a time
  const getDisplayedComments = useCallback((commentSortType, sortComments) => {
    const sorted = sortComments(localPost.comments || [], commentSortType);
    const startIndex = currentCommentPage * commentsPerPage;
    const endIndex = startIndex + commentsPerPage;
    
    return sorted.slice(startIndex, endIndex);
  }, [localPost.comments, currentCommentPage]);

  // Simple comment display info for sliding window
  const getCommentDisplayInfo = useCallback(() => {
    const totalComments = localPost.comments?.length || 0;
    const startIndex = currentCommentPage * commentsPerPage;
    const endIndex = startIndex + commentsPerPage;
    const displayedCount = Math.min(totalComments - startIndex, commentsPerPage);
    const hasMoreComments = endIndex < totalComments;
    const hasPreviousComments = currentCommentPage > 0;
    
    return {
      totalComments,
      displayedCount,
      currentPage: currentCommentPage + 1, // 1-based for display
      hasMoreComments,
      hasPreviousComments,
      startIndex,
      endIndex: Math.min(endIndex, totalComments)
    };
  }, [localPost.comments, currentCommentPage]);

  // Load more comments - advance to next page (sliding window)
  const loadMoreComments = useCallback(async () => {
    if (loadingMoreComments) return;
    
    const totalComments = localPost.comments?.length || 0;
    const nextPageStart = (currentCommentPage + 1) * commentsPerPage;
    
    if (nextPageStart >= totalComments) return; // No more comments
    
    setLoadingMoreComments(true);
    
    try {
      setCurrentCommentPage(prev => prev + 1);
    } finally {
      setLoadingMoreComments(false);
    }
  }, [loadingMoreComments, localPost.comments, currentCommentPage]);

  // Load previous comments - go back to previous page (sliding window)
  const loadPreviousComments = useCallback(async () => {
    if (loadingMoreComments) return;
    
    if (currentCommentPage <= 0) return; // Already at first page
    
    setLoadingMoreComments(true);
    
    try {
      setCurrentCommentPage(prev => Math.max(0, prev - 1));
    } finally {
      setLoadingMoreComments(false);
    }
  }, [loadingMoreComments, currentCommentPage]);

  // Handle comment submission
  const handleCommentSubmit = useCallback(async (e, comment, setComment, loadingComment, setLoadingComment, setError, onComment) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoadingComment(true);
    setError(null);

    const tempComment = {
      _id: `temp-comment-${Date.now()}`,
      content: comment,
      user: currentUserId,
      author: { username: currentUsername, verified: currentUserVerified },
      createdAt: new Date().toISOString(),
      replies: [],
      likes: [],
    };

    setLocalPost(prev => ({
      ...prev,
      comments: [tempComment, ...(prev.comments || [])],
    }));

    // Reset to first page when adding a new comment
    setCurrentCommentPage(0);

    try {
      const res = await addCommentToPost(localPost._id, comment);
      if (res && res.comment && !res.error) {
        setLocalPost(prev => ({
          ...prev,
          comments: [res.comment, ...prev.comments.filter(c => !c._id.startsWith('temp-comment'))],
        }));
      } else {
        if (onComment) {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("Network Error")) {
        setError("Network error: Failed to post comment");
      }
      if (onComment) {
        try {
          const updatedPost = await onComment();
          if (updatedPost) setLocalPost(updatedPost);
        } catch (fetchError) {}
      }
    } finally {
      setLoadingComment(false);
      setComment("");
    }
  }, [localPost._id, currentUserId, currentUsername, currentUserVerified, setLocalPost]);

  // Handle comment edit
  const handleEditComment = useCallback((commentId, content) => {
    setEditingComment(commentId);
    setEditCommentContent(content);
  }, []);

  // Handle save comment edit
  const handleSaveCommentEdit = useCallback(async (commentId) => {
    if (!editCommentContent.trim()) return;
    
    try {
      const response = await editComment(localPost._id, commentId, editCommentContent);
      
      if (response && !response.error && response._id) {
        setLocalPost(response);
        setEditingComment(null);
        setEditCommentContent('');
      } else {
        console.error('Failed to edit comment:', response?.error || 'Unknown error');
        alert('Failed to edit comment. Please try again.');
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
      alert('Failed to edit comment. Please try again.');
    }
  }, [localPost._id, editCommentContent, setLocalPost]);

  // Handle cancel comment edit
  const handleCancelCommentEdit = useCallback(() => {
    setEditingComment(null);
    setEditCommentContent('');
  }, []);

  // Handle delete comment
  const handleDeleteComment = useCallback(async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const response = await deleteComment(localPost._id, commentId);
        
        if (response && !response.error && response._id) {
          setLocalPost(response);
          
          // Check if we need to go back a page after deletion
          const newTotalComments = response.comments?.length || 0;
          const maxPage = Math.floor(Math.max(0, newTotalComments - 1) / commentsPerPage);
          if (currentCommentPage > maxPage) {
            setCurrentCommentPage(Math.max(0, maxPage));
          }
        } else {
          console.error('Failed to delete comment:', response?.error || 'Unknown error');
          alert('Failed to delete comment. Please try again.');
        }
      } catch (error) {
        console.error('Failed to delete comment:', error);
        alert('Failed to delete comment. Please try again.');
      }
    }
  }, [localPost._id, setLocalPost, currentCommentPage]);

  // Handle like comment with optimistic updates
  const handleLikeComment = useCallback(async (commentId) => {
    console.log('Comment like clicked:', { commentId, currentUserId });
    
    // Find the current comment to determine current like state
    const currentComment = localPost.comments.find(c => c._id === commentId);
    if (!currentComment) return;
    
    const currentLikes = Array.isArray(currentComment.likes) ? currentComment.likes : [];
    const wasLiked = currentLikes.map(String).includes(String(currentUserId));
    
    console.log('Comment like state change:', { wasLiked, currentLikes, currentUserId });
    
    // Optimistically update the UI first
    setLocalPost(prev => ({
      ...prev,
      comments: prev.comments.map(c => {
        if (c._id === commentId) {
          return {
            ...c,
            likes: wasLiked 
              ? currentLikes.filter(id => String(id) !== String(currentUserId))
              : [...currentLikes, currentUserId]
          };
        }
        return c;
      })
    }));
    
    setLoadingCommentLike(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await likeComment(localPost._id, commentId);
      console.log('Comment like API success');
    } catch (error) {
      console.error('Failed to like comment, reverting state:', error);
      // Revert optimistic update on error
      setLocalPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => 
          c._id === commentId ? currentComment : c
        )
      }));
    } finally {
      setLoadingCommentLike(prev => ({ ...prev, [commentId]: false }));
    }
  }, [localPost._id, localPost.comments, currentUserId, setLocalPost]);

  return {
    // State
    currentCommentPage,
    loadingMoreComments,
    editingComment,
    editCommentContent,
    loadingCommentLike,
    showCommentMenus,
    commentsPerPage,
    
    // Setters
    setCurrentCommentPage,
    setEditCommentContent,
    setShowCommentMenus,
    
    // Functions
    getDisplayedComments,
    getCommentDisplayInfo,
    loadMoreComments,
    loadPreviousComments, // Add this line
    handleCommentSubmit,
    handleEditComment,
    handleSaveCommentEdit,
    handleDeleteComment,
    handleCancelCommentEdit,
    handleLikeComment
  };
};