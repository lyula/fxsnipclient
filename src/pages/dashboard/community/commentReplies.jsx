// commentReplies.jsx
// Component for rendering replies to a comment, including reply actions (edit, delete, like, etc.)
// This file is intended to be imported and used in postComment.jsx or ChatPost.jsx

import React, { useState } from "react";
// Import getProfileImage from postComment.jsx or redefine here for replies
function getProfileImage(author) {
  if (!author) return '';
  if (author.profile && typeof author.profile === 'object' && author.profile.profileImage) return author.profile.profileImage;
  if (author.profileImage) return author.profileImage;
  if (typeof author.profile === 'string') return author.profile;
  return '';
}
import { Link } from "react-router-dom";
import { FaUser, FaEdit, FaTrash, FaHeart, FaRegHeart, FaSave, FaTimes, FaEllipsisV } from "react-icons/fa";
import FloatingMenu from "../../../components/common/FloatingMenu";
import VerifiedBadge from "../../../components/VerifiedBadge";
import { formatPostDate } from "../../../utils/formatDate";
import ConfirmModal from '../../../components/common/ConfirmModal';

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

export default function CommentReplies({
  comment,
  replyInfo,
  replyHook,
  replyMenuRefs,
  currentUserId,
  canEditDelete,
  canDeleteAsPostOwner,
  setZoomProfile,
  renderHighlightedContent,
  localPost,
}) {
  // Pagination state: page per comment
  const [replyPage, setReplyPage] = useState({});
  // Modal state for reply deletion
  const [deleteReplyModal, setDeleteReplyModal] = useState({ open: false, commentId: null, replyId: null });
  // Use the full array of replies for pagination
  const replies = (replyInfo && Array.isArray(replyInfo.replies)) ? replyInfo.replies : (Array.isArray(comment.replies) ? comment.replies : []);
  const repliesPerPage = 5;
  const commentId = comment._id;
  const page = replyPage[commentId] || 1;
  const totalReplies = replies.length;
  const totalPages = Math.ceil(totalReplies / repliesPerPage);
  const startIdx = (page - 1) * repliesPerPage;
  const endIdx = startIdx + repliesPerPage;
  const paginatedReplies = replies.slice(startIdx, endIdx);

  const handlePrev = () => {
    setReplyPage((prev) => ({ ...prev, [commentId]: Math.max(1, (prev[commentId] || 1) - 1) }));
  };
  const handleNext = () => {
    setReplyPage((prev) => ({ ...prev, [commentId]: Math.min(totalPages, (prev[commentId] || 1) + 1) }));
  };

  return (
    <div className="mt-2 w-full">
      {/* Delete Reply Confirmation Modal */}
      <ConfirmModal
        open={deleteReplyModal.open}
        title="Delete Reply"
        description="Are you sure you want to delete this reply? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
        onClose={() => setDeleteReplyModal({ open: false, commentId: null, replyId: null })}
        onConfirm={() => {
          if (deleteReplyModal.commentId && deleteReplyModal.replyId) {
            replyHook.handleDeleteReply(deleteReplyModal.commentId, deleteReplyModal.replyId);
          }
          setDeleteReplyModal({ open: false, commentId: null, replyId: null });
        }}
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-start gap-2 mb-2">
          <button
            onClick={handlePrev}
            disabled={page === 1}
            className={`px-2 py-1 rounded text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={page === totalPages}
            className={`px-2 py-1 rounded text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Next
          </button>
        </div>
      )}
      <div className="space-y-2">
        {paginatedReplies.map((reply) => (
          <div 
            key={reply._id} 
            data-reply-id={reply._id} 
            className="w-full max-w-full overflow-x-hidden transition-all duration-300 ease-in-out"
          >
            <div className="flex items-start gap-2 mb-1 flex-nowrap">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden mt-1">
                {(() => {
                  const profileImage = getProfileImage(reply.author);
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-0">
                    <Link
                      to={`/dashboard/community/user/${encodeURIComponent(reply.author.username)}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:underline break-words"
                    >
                      {reply.author.username}
                    </Link>
                    {reply.author.verified && <VerifiedBadge />}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {reply.createdAt && formatPostDate(reply.createdAt)}
                  </span>
                  <EditedIndicator item={reply} />
                  {(canEditDelete(reply.author?._id || reply.user) || canDeleteAsPostOwner()) && (
                    <div className="relative ml-auto flex-shrink-0">
                      <button
                        ref={el => (replyMenuRefs.current[`${comment._id}-${reply._id}`] = el)}
                        onClick={() => replyHook.setShowReplyMenus(prev => ({ 
                          ...prev, 
                          [`${comment._id}-${reply._id}`]: !prev[`${comment._id}-${reply._id}`] 
                        }))}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                      >
                        <FaEllipsisV size={10} />
                      </button>
                      <FloatingMenu
                        anchorRef={{ current: replyMenuRefs.current[`${comment._id}-${reply._id}`] }}
                        open={!!replyHook.showReplyMenus[`${comment._id}-${reply._id}`]}
                        onClose={() => replyHook.setShowReplyMenus(prev => ({ ...prev, [`${comment._id}-${reply._id}`]: false }))}
                      >
                        {canEditDelete(reply.author?._id || reply.user) && (
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              replyHook.handleEditReply(comment._id, reply._id, reply.content);
                              replyHook.setShowReplyMenus({});
                            }}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-sm text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <FaEdit className="text-blue-500 dark:text-blue-400" /> Edit
                          </button>
                        )}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            replyHook.setShowReplyMenus({});
                            setDeleteReplyModal({ open: true, commentId: comment._id, replyId: reply._id });
                          }}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm text-red-600 dark:text-red-400 transition-colors"
                        >
                          <FaTrash className="text-red-500 dark:text-red-400" /> Delete
                        </button>
                      </FloatingMenu>
                    </div>
                  )}
                </div>
                {replyHook.editingReply === `${comment._id}-${reply._id}` ? (
                  <div className="space-y-2 w-full max-w-full mt-1">
                    <textarea
                      value={replyHook.editReplyContent}
                      onChange={e => replyHook.setEditReplyContent(e.target.value)}
                      className="w-full max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows="2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => replyHook.handleSaveReplyEdit(comment._id, reply._id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                      >
                        <FaSave size={10} />
                      </button>
                      <button
                        onClick={replyHook.handleCancelReplyEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-keep-all overflow-wrap-normal mb-2 w-full max-w-full mt-1">
                      {renderHighlightedContent(reply.content)}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <button
                        onClick={() => replyHook.handleLikeReply(comment._id, reply._id)}
                        disabled={replyHook.loadingReplyLike && replyHook.loadingReplyLike[`${comment._id}-${reply._id}`]}
                        className={`flex items-center gap-1 transition-colors ${
                          Array.isArray(reply.likes) && currentUserId && reply.likes.map(String).includes(String(currentUserId))
                            ? 'text-red-500'
                            : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                        }`}
                        aria-label="Like reply"
                      >
                        {Array.isArray(reply.likes) && currentUserId && reply.likes.map(String).includes(String(currentUserId))
                          ? <FaHeart />
                          : <FaRegHeart />
                        }
                        <span>{Array.isArray(reply.likes) ? reply.likes.length : 0}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
