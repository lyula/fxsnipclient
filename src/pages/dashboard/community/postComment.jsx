// postComment.jsx
// Component for rendering a single comment and its actions (edit, delete, like, reply, etc.)
// This file is intended to be imported and used in ChatPost.jsx

// Log all comment objects after a new comment is added (for debugging profile images)
// This must come after imports!
function useLogComments(localPost) {
  useEffect(() => {
    if (Array.isArray(localPost?.comments)) {
      console.log('[PostComment] All comments after update:', localPost.comments.map(c => ({
        _id: c._id,
        author: c.author,
        content: c.content,
        profile: c.author?.profile,
        profileImage: c.author?.profileImage,
      })));
    }
  }, [localPost?.comments]);
}
// postComment.jsx
// Component for rendering a single comment and its actions (edit, delete, like, reply, etc.)
// This file is intended to be imported and used in ChatPost.jsx

import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaEdit, FaTrash, FaHeart, FaRegHeart, FaSave, FaTimes, FaEllipsisV } from "react-icons/fa";
import FloatingMenu from "../../../components/common/FloatingMenu";
import VerifiedBadge from "../../../components/VerifiedBadge";
import CommentReplies from "./commentReplies";
import { formatPostDate } from "../../../utils/formatDate";
import ReactDOM from "react-dom";


function isContentEdited(item) {
  if (item.editedAt) return true;
  if (item.isEdited === true) return true;
  if (item.contentUpdatedAt && item.createdAt) {
    const created = new Date(item.createdAt);
    const contentUpdated = new Date(item.contentUpdatedAt);
    return (contentUpdated.getTime() - created.getTime()) > 60000;
  }
  return false;
}

const EditedIndicator = ({ item, size = "xs" }) => {
  if (!isContentEdited(item)) return null;
  return (
    <span className={`text-gray-400 dark:text-gray-500 italic text-${size} ml-1`}>
      (edited)
    </span>
  );
};

// Utility to robustly extract the profile image from any author object, handling all backend structures
function getProfileImage(author) {
  if (!author) return '';
  // Deeply nested (modern)
  if (author.profile && typeof author.profile === 'object' && author.profile.profileImage) return author.profile.profileImage;
  // Flat (legacy)
  if (author.profileImage) return author.profileImage;
  // Some backends may return profile as a string (url)
  if (typeof author.profile === 'string') return author.profile;
  // Some backends may return profileImage as a property of a nested profile object
  if (author.profile && typeof author.profile === 'object' && author.profile.profileImage) return author.profile.profileImage;
  // Some backends may return profileImage as a property of the author object directly
  if (author.profileImage) return author.profileImage;
  return '';
}

export default function PostComment({
  comment,
  currentUserId,
  canEditDelete,
  canDeleteAsPostOwner,
  commentHook,
  replyHook,
  replyMenuRefs, // <-- Accept as prop
  activeReply,
  setActiveReply,
  localPost,
  setZoomProfile,
  renderHighlightedContent,
  handleReply,
  ReplyInput,
  CommentReplies,
  ...props
}) {
  // Log all comment objects after a new comment is added (for debugging profile images)
  useLogComments(localPost);
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ensure commentMenuRefs is a ref
  if (!commentHook.commentMenuRefs) {
    commentHook.commentMenuRefs = { current: {} };
  }
  if (!commentHook.commentMenuRefs.current) {
    commentHook.commentMenuRefs.current = {};
  }

  // Commented out noisy logs to avoid console spam during debugging
  /*
  console.log('[PostComment] Render', { comment, currentUserId, commentHook });
  console.log('[PostComment] editingCommentId', commentHook.editingCommentId, 'editCommentContent', commentHook.editCommentContent);
  */

  const replyInfo = replyHook.getReplyDisplayInfo(comment);
  const displayedReplies = replyHook.getDisplayedReplies(comment);

  const handleMenuButtonClick = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 180; // px, adjust to match w-40
      const menuHeight = 100; // px, estimate or measure
      let left = rect.left;
      let top = rect.bottom + 8; // 8px below button
      // Clamp right edge
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      // Clamp bottom edge
      if (top + menuHeight > window.innerHeight - 8) {
        top = window.innerHeight - menuHeight - 8;
      }
      setMenuPosition({ top, left });
    }
    setShowMenu((prev) => !prev);
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event) => {
      if (menuButtonRef.current && !menuButtonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Debug: log when editingCommentId or editCommentContent changes
  /*
  useEffect(() => {
    console.log('[PostComment] useEffect editingCommentId/editCommentContent', {
      editingCommentId: commentHook.editingCommentId,
      editCommentContent: commentHook.editCommentContent,
      commentId: comment._id,
      isEditMode: commentHook.editingCommentId === comment._id
    });
  }, [commentHook.editingCommentId, commentHook.editCommentContent, comment._id]);
  */

  const handleEditClick = () => {
    setShowMenu(false);
    commentHook.handleEditComment(comment._id, comment.content);
  };

  const handleSaveEdit = async () => {
    await commentHook.handleSaveCommentEdit(comment._id);
  };

  const handleCancelEdit = () => {
    commentHook.handleCancelCommentEdit();
  };

  const handleDelete = (e) => {
    if (e) e.preventDefault();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    // Remove any window.confirm or alert, just delete immediately
    commentHook.handleDeleteComment(comment._id);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Show/hide replies logic
  const isRepliesExpanded = replyHook.expandedReplies?.[comment._id] ?? false;
  const repliesCount = comment.replies?.length || 0;

  // Show textarea if editingCommentId matches this comment
  const isEditMode = commentHook.editingCommentId === comment._id;

  // Move modal to portal at document.body for global overlay
  const modal = showDeleteModal && ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-xs w-full border border-gray-200 dark:border-gray-700 flex flex-col items-center">
        <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">Delete Comment?</div>
        <div className="text-gray-600 dark:text-gray-300 mb-6 text-center">Are you sure you want to delete this comment? This action cannot be undone.</div>
        <div className="flex gap-4 w-full justify-center">
          <button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition-colors">Delete</button>
          <button onClick={cancelDelete} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-semibold transition-colors">Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {modal}
      <div key={comment._id} data-comment-id={comment._id} className="mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4 w-full max-w-full overflow-x-hidden relative">
        <div className="flex items-start gap-3 w-full min-w-0">

          <div
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={() => {
              const profileImage = getProfileImage(comment.author);
              if (profileImage) {
                setZoomProfile({ profileImage, username: comment.author.username });
              }
            }}
            title="View profile picture"
          >
            {(() => {
              const profileImage = getProfileImage(comment.author);
              if (profileImage) {
                return (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                  />
                );
              } else {
                return <FaUser className="text-gray-400 dark:text-gray-500 text-sm" />;
              }
            })()}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center w-full">
              <div className="flex items-center mb-1">
                <span className="flex items-center">
                  <Link
                    to={`/dashboard/community/user/${encodeURIComponent(comment.author.username)}`}
                    className="font-semibold text-sm text-gray-900 dark:text-white hover:underline"
                  >
                    {comment.author.username}
                  </Link>
                  {comment.author.verified && <VerifiedBadge className="!ml-0 !mr-0" />}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {comment.createdAt && formatPostDate(comment.createdAt)}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  <EditedIndicator item={comment} />
                </span>
                {/* EditedIndicator can be passed as a prop if needed */}
                {comment.edited && <span className="text-gray-400 dark:text-gray-500 italic text-xs ml-1">(edited)</span>}
              </div>
              <div className="ml-auto relative">
                {(canEditDelete(comment.author?._id || comment.user) || canDeleteAsPostOwner()) && (
                  <div className="relative inline-block">
                    <button
                      ref={menuButtonRef}
                      onClick={handleMenuButtonClick}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-haspopup="true"
                      aria-expanded={showMenu}
                      aria-label="Comment actions"
                      type="button"
                    >
                      <FaEllipsisV />
                    </button>
                    {showMenu && ReactDOM.createPortal(
                      <div
                        ref={menuRef}
                        className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl py-2 w-40 max-h-60 overflow-y-auto"
                        style={{
                          top: menuPosition.top,
                          left: menuPosition.left,
                          minWidth: '8rem'
                        }}
                        tabIndex={-1}
                      >
                        {canEditDelete(comment.author?._id || comment.user) && (
                          <button
                            onMouseDown={handleEditClick} // <-- Use onMouseDown for reliability
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit Comment
                          </button>
                        )}
                        {(canEditDelete(comment.author?._id || comment.user) || canDeleteAsPostOwner()) && (
                          <button
                            onMouseDown={handleDelete} // <-- Use onMouseDown for reliability
                            className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                          >
                            <FaTrash className="text-red-500 dark:text-red-400" /> Delete
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
              {isEditMode ? (
                <div className="space-y-2 w-full max-w-full">
                  <textarea
                    value={commentHook.editCommentContent}
                    onChange={e => commentHook.setEditCommentContent(e.target.value)}
                    className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows="2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                    >
                      <FaSave size={10} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal mb-2 w-full max-w-full">
                  {renderHighlightedContent(comment.content)}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs">
                <button
                  onClick={() => setActiveReply(activeReply === comment._id ? null : comment._id)}
                  className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={() => commentHook.handleLikeComment(comment._id)}
                  disabled={commentHook.loadingCommentLike[comment._id]}
                  className={`flex items-center gap-1 transition-colors ${
                    Array.isArray(comment.likes) && currentUserId && comment.likes.map(String).includes(String(currentUserId))
                      ? 'text-red-500'
                      : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                  aria-label="Like comment"
                >
                  {Array.isArray(comment.likes) && currentUserId && comment.likes.map(String).includes(String(currentUserId))
                    ? <FaHeart />
                    : <FaRegHeart />
                  }
                  <span>{Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
                </button>
              </div>

              {activeReply === comment._id && (
                <div className="mt-2 w-full max-w-full overflow-x-hidden">
                  {/* ReplyInput should be passed as a prop or imported if needed */}
                  {ReplyInput && (
                    <ReplyInput
                      onSubmit={handleReply}
                      loading={replyHook.loadingReply[comment._id]}
                      postId={localPost._id}
                      commentId={comment._id}
                      replyToUsername={comment.author.username}
                    />
                  )}
                </div>
              )}

              {repliesCount > 0 && (
                <button
                  onClick={() => replyHook.setExpandedReplies(prev => ({ ...prev, [comment._id]: !isRepliesExpanded }))}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 ml-2"
                  style={{ marginBottom: 4 }}
                >
                  {isRepliesExpanded ? `Hide Replies (${repliesCount})` : `Show Replies (${repliesCount})`}
                </button>
              )}

              {isRepliesExpanded && repliesCount > 0 && (
                <CommentReplies
                  comment={comment}
                  replyInfo={replyInfo}
                  displayedReplies={displayedReplies}
                  replyHook={replyHook}
                  replyMenuRefs={replyMenuRefs}
                  currentUserId={currentUserId}
                  canEditDelete={canEditDelete}
                  canDeleteAsPostOwner={canDeleteAsPostOwner}
                  setZoomProfile={setZoomProfile}
                  renderHighlightedContent={renderHighlightedContent}
                  localPost={localPost}
                />
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
