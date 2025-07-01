import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete,
  postRefs, currentUserId, currentUsername, currentUserVerified 
}) {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {posts.filter(post => post && post._id).map(post => (
        <div
          ref={el => postRefs && postRefs.current && (postRefs.current[post._id] = el)}
          key={post._id}
        >
          <ChatPost
            post={post}
            onReply={onReply}
            onComment={onComment}
            onLike={onLike}
            onView={onView}
            onDelete={onDelete}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentUserVerified={currentUserVerified}
          />
        </div>
      ))}
    </div>
  );
}
